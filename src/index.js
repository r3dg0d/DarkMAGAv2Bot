require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');

// Import utilities
const Database = require('./utils/database');
const FileUtils = require('./utils/fileUtils');
const LevelingSystem = require('./utils/leveling');
const config = require('./config');

// Import handlers
const CommandHandler = require('./handlers/commandHandler');
const EventHandler = require('./handlers/eventHandler');

class DarkMAGABot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.DirectMessageTyping
            ],
            partials: [Partials.Message, Partials.Channel, Partials.Reaction]
        });

        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.lastDeletedMessage = null;
        this.chatReviveLastUsed = new Map();

        // Initialize utilities
        this.database = new Database();
        this.fileUtils = new FileUtils();
        this.leveling = new LevelingSystem(this.database);

        // Initialize handlers
        this.commandHandler = new CommandHandler(this);
        this.eventHandler = new EventHandler(this);

        this.setupEventListeners();
    }

    async initialize() {
        try {
            // Copy existing data files
            await this.fileUtils.copyExistingData();
            
            // Initialize handlers
            await this.commandHandler.loadCommands();
            await this.eventHandler.loadEvents();
            
            // Deploy commands automatically
            await this.deployCommands();
            
            // Start chat revive task
            this.startChatReviveTask();
            
            console.log('Bot initialized successfully');
        } catch (error) {
            console.error('Error initializing bot:', error);
        }
    }

    async deployCommands() {
        try {
            const { REST, Routes } = require('discord.js');
            const commands = this.commandHandler.getCommands();
            
            const rest = new REST().setToken(config.token);
            
            const data = await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            
            console.log(`Successfully deployed ${data.length} application (/) commands.`);
        } catch (error) {
            console.error('Error deploying commands:', error);
        }
    }

    setupEventListeners() {
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('Dark MAGA', { type: 'WATCHING' });
        });

        this.client.on('messageDelete', (message) => {
            if (!message.author?.bot) {
                this.lastDeletedMessage = {
                    content: message.content,
                    author: message.author,
                    channel: message.channel,
                    timestamp: new Date()
                };
            }
        });

        this.client.on('messageCreate', async (message) => {
            // Handle partial messages
            if (message.partial) {
                try {
                    await message.fetch();
                } catch (error) {
                    console.error('Failed to fetch partial message:', error);
                    return;
                }
            }

            if (message.author?.bot) return;

            // Handle modmail for DMs
            const isDM = (
                message.channel?.type === 1 || 
                message.channel?.isDMBased?.() || 
                message.guild === null
            );

            if (isDM && !message.author?.bot) {
                await this.handleModmail(message);
                return;
            }

            // Handle staff responses in ticket channels
            if (message.guild && message.channel?.name && message.channel.name.startsWith('ticket-') && !message.author?.bot) {
                await this.handleTicketResponse(message);
                return;
            }

            // Update leveling
            if (message.guild) {
                const levelResult = await this.leveling.updateUserLevel(message.author.id, message.guild.id);
                
                // Send level-up message if user leveled up
                if (levelResult && levelResult.leveledUp) {
                    // Update user roles based on new level
                    try {
                        await this.leveling.updateUserRoles(message.author.id, message.guild.id, levelResult.newLevel, message.guild);
                    } catch (roleError) {
                        console.error('Error updating user roles on level up:', roleError);
                    }

                    const levelUpEmbed = {
                        color: 0x00ff00,
                        title: '🎉 Level Up!',
                        description: `**${message.author}** leveled up!`,
                        fields: [
                            { name: '📈 New Level', value: levelResult.newLevel.toString(), inline: true },
                            { name: '🏆 Rank', value: levelResult.rankName, inline: true },
                            { name: '✨ XP Gained', value: `+${levelResult.xpGain}`, inline: true }
                        ],
                        footer: { text: 'Keep chatting to earn more XP!' },
                        timestamp: new Date()
                    };
                    
                    try {
                        await message.reply({ embeds: [levelUpEmbed] });
                    } catch (error) {
                        // If reply fails, try sending to channel
                        try {
                            await message.channel.send({ embeds: [levelUpEmbed] });
                        } catch (channelError) {
                            console.error('Failed to send level-up message:', channelError);
                        }
                    }
                }
            }
        });

        this.client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isCommand()) {
                    await this.commandHandler.handleCommand(interaction);
                } else if (interaction.isButton()) {
                    console.log('Button interaction detected:', interaction.customId); // Debug log
                    await this.handleButtonInteraction(interaction);
                }
            } catch (error) {
                console.error('Error handling interaction:', error);
                try {
                    if (interaction.isRepliable()) {
                        await interaction.reply({ 
                            content: 'An error occurred while processing your request. Please try again.', 
                            ephemeral: true 
                        });
                    }
                } catch (replyError) {
                    console.error('Error sending error reply:', replyError);
                }
            }
        });

        this.client.on('guildMemberAdd', async (member) => {
            await this.handleMemberJoin(member);
        });

        this.client.on('guildMemberRemove', async (member) => {
            await this.handleMemberLeave(member);
        });

        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
        });

        this.client.on('warn', (warning) => {
            console.warn('Discord client warning:', warning);
        });
    }

    async handleModmail(message) {
        // Check if user is blocked
        const blockedUsers = await this.fileUtils.loadBlockedUsers();
        if (blockedUsers.includes(message.author.id)) {
            await message.reply('❌ **You are blocked from using modmail.**\n\nPlease contact a staff member if you believe this is an error.');
            return;
        }

        // Check if user already has an open ticket
        const existingTicket = await this.findExistingTicket(message.author.id);
        if (existingTicket) {
            await this.forwardMessageToTicket(message, existingTicket);
            await message.reply('✅ **Message forwarded!**\n\nYour message has been sent to your existing ticket.');
            return;
        }

        // Send immediate feedback
        await message.reply('✅ **Modmail received!**\n\nYour message has been received and a ticket is being created. Please wait...');

        // Create new ticket
        await this.createModmailTicket(message);
    }

    async findExistingTicket(userId) {
        const guild = this.client.guilds.cache.get(config.guildId);
        if (!guild) return null;

        // Find ticket category
        let category = null;
        if (config.channels.ticketCategory) {
            category = guild.channels.cache.get(config.channels.ticketCategory);
        }
        
        if (!category) {
            category = guild.channels.cache.find(channel => 
                channel.type === 4 && 
                channel.name.toLowerCase().includes('ticket')
            );
        }

        if (!category) return null;

        // Find existing ticket for this user
        return guild.channels.cache.find(
            channel => channel.name === `ticket-${userId}` && 
                      channel.parentId === category.id
        );
    }

    async forwardMessageToTicket(message, ticketChannel) {
        try {
            const embed = {
                color: 0x0099ff,
                title: '📨 New Message from User',
                description: `**From:** ${message.author.tag}\n**User ID:** ${message.author.id}`,
                fields: [
                    {
                        name: 'Message',
                        value: message.content.length > 1024 ? 
                            message.content.substring(0, 1021) + '...' : 
                            message.content,
                        inline: false
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'Dark MAGA Bot - Modmail'
                }
            };

            await ticketChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error forwarding message to ticket:', error);
        }
    }

    async createModmailTicket(message) {
        const guild = this.client.guilds.cache.get(config.guildId);
        
        if (!guild) {
            await message.reply('❌ **Error:** Could not find the main server. Please try again later.');
            return;
        }
        
        // Check if bot has permission to manage channels
        const botMember = guild.members.me;
        if (!botMember || !botMember.permissions.has('ManageChannels')) {
            await message.reply('❌ **Error:** I don\'t have permission to create channels. Please contact a staff member.');
            return;
        }

        // Find ticket category
        let category = null;
        if (config.channels.ticketCategory) {
            category = guild.channels.cache.get(config.channels.ticketCategory);
        }
        
        // Fallback: find any category with "ticket" in the name
        if (!category) {
            category = guild.channels.cache.find(channel => 
                channel.type === 4 && // CategoryChannel
                channel.name.toLowerCase().includes('ticket')
            );
        }
        
        if (!category) {
            await message.reply('❌ **Error:** Could not find a ticket category. Please contact a staff member.');
            return;
        }

        // Check if user already has an open ticket
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === `ticket-${message.author.id}` && 
                      channel.parentId === category.id
        );

        if (existingTicket) {
            await message.reply(`✅ **Ticket Found!**\n\nYou already have an open ticket: ${existingTicket}\n\nPlease continue the conversation there.`);
            return;
        }

        try {
            // Get staff role IDs for permissions
            const { roles } = require('./config');
            const staffRoleIds = [
                roles.trialMod,
                roles.mod,
                roles.executiveMod,
                roles.coFounder,
                roles.founder
            ];
            
            // Build permission overwrites
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: message.author.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: this.client.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
                }
            ];
            
            // Add staff role permissions
            for (const roleId of staffRoleIds) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    permissionOverwrites.push({
                        id: roleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    });
                }
            }
            
            // Create ticket channel
            const ticketChannel = await guild.channels.create({
                name: `ticket-${message.author.id}`,
                type: 0, // Text channel
                parent: category,
                permissionOverwrites: permissionOverwrites
            });

            // Send initial message in ticket channel
            const embed = {
                color: 0x00ff00,
                title: '🎫 Modmail Ticket Created',
                description: `**Ticket created by:** ${message.author.tag}\n**User ID:** ${message.author.id}`,
                fields: [
                    {
                        name: 'Account Created',
                        value: message.author.createdAt.toLocaleDateString(),
                        inline: true
                    },
                    {
                        name: 'Joined Server',
                        value: message.member?.joinedAt?.toLocaleDateString() || 'Unknown',
                        inline: true
                    },
                    {
                        name: 'Message',
                        value: message.content.length > 1024 ? 
                            message.content.substring(0, 1021) + '...' : 
                            message.content,
                        inline: false
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'Dark MAGA Bot - Modmail'
                }
            };

            // Create action row with close and archive buttons
            const actionRow = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 4, // Danger (red)
                        label: 'Close Ticket',
                        emoji: '🔒',
                        custom_id: 'ticket_close'
                    },
                    {
                        type: 2,
                        style: 2, // Secondary (gray)
                        label: 'Archive Ticket',
                        emoji: '📁',
                        custom_id: 'ticket_archive'
                    }
                ]
            };

            await ticketChannel.send({ 
                embeds: [embed],
                components: [actionRow]
            });

            // Save ticket mapping to database
            await this.database.saveTicketMapping(ticketChannel.id, message.author.id);

            // Send confirmation to user
            const confirmEmbed = {
                color: 0x00ff00,
                title: '✅ Ticket Created Successfully!',
                description: `Your modmail ticket has been created: **${ticketChannel.name}**\n\n**What happens next:**\n• Staff will respond to your ticket in the server\n• You can continue messaging me here to add more information\n• Your messages will be forwarded to the ticket\n\n**Your original message:**\n> ${message.content}`,
                footer: {
                    text: 'Dark MAGA Bot - Modmail'
                },
                timestamp: new Date()
            };

            await message.reply({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('Error creating modmail ticket:', error);
            await message.reply('❌ **Error:** Failed to create ticket. Please try again later or contact a staff member.');
        }
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        console.log('Button interaction received with custom ID:', customId); // Debug log
        
        // Support both new and legacy reaction role button formats
        if (customId.startsWith('reaction_role_') || customId.startsWith('role_')) {
            console.log('Handling reaction role button'); // Debug log
            await this.handleRoleButton(interaction);
        } else if (customId === 'ticket_close') {
            console.log('Handling ticket close button'); // Debug log
            await this.handleTicketClose(interaction);
        } else if (customId === 'ticket_archive') {
            console.log('Handling ticket archive button'); // Debug log
            await this.handleTicketArchive(interaction);
        } else {
            console.log('Unknown button custom ID:', customId); // Debug log
        }
    }

    async handleRoleButton(interaction) {
        try {
            // Support both new and legacy custom ID formats
            // New: reaction_role_{roleId}_{buttonIndex}
            // Legacy: role_{roleId}
            let roleId = null;
            const customId = interaction.customId;
            if (customId.startsWith('reaction_role_')) {
                const customIdParts = customId.split('_');
                console.log('Custom ID parts:', customIdParts); // Debug log
                if (customIdParts.length < 4) {
                    console.error('Invalid custom ID format:', customId);
                    await interaction.reply({ content: 'Invalid button configuration.', ephemeral: true });
                    return;
                }
                roleId = customIdParts[2];
            } else if (customId.startsWith('role_')) {
                // Legacy format: role_{roleId}
                roleId = customId.substring('role_'.length);
            } else {
                await interaction.reply({ content: 'Invalid button configuration.', ephemeral: true });
                return;
            }
            console.log('Extracted role ID:', roleId); // Debug log
            
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(roleId);

            if (!role) {
                console.error('Role not found for ID:', roleId);
                await interaction.reply({ content: 'Role not found.', ephemeral: true });
                return;
            }

            // Fetch reaction role message settings from database
            const messageId = interaction.message.id;
            const guildId = interaction.guild.id;
            console.log('Database instance:', this.database);
            console.log('Database methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.database)));
            const rrData = await this.database.getReactionRoleMessage(guildId, messageId);
            if (!rrData) {
                await interaction.reply({ content: 'Reaction role configuration not found. Please contact an admin.', ephemeral: true });
                return;
            }

            const { permanent, maxRoles, roles: validRoles } = rrData;
            // Only allow roles from this message
            if (!validRoles || !validRoles[roleId]) {
                await interaction.reply({ content: 'This role is not valid for this reaction role message.', ephemeral: true });
                return;
            }

            // Get all roles from this message the user currently has
            const userRoleIds = Object.keys(validRoles).filter(rid => member.roles.cache.has(rid));
            const hasRole = member.roles.cache.has(roleId);

            if (hasRole) {
                if (permanent) {
                    await interaction.reply({ content: 'This role is permanent and cannot be removed.', ephemeral: true });
                    return;
                }
                await member.roles.remove(role);
                await interaction.reply({ content: `Removed role: ${role.name}`, ephemeral: true });
                console.log(`Removed role ${role.name} from ${member.user.tag}`);
            } else {
                if (maxRoles && userRoleIds.length >= maxRoles) {
                    await interaction.reply({ content: `You can only have up to ${maxRoles} roles from this message.`, ephemeral: true });
                    return;
                }
                await member.roles.add(role);
                await interaction.reply({ content: `Added role: ${role.name}`, ephemeral: true });
                console.log(`Added role ${role.name} to ${member.user.tag}`);
            }
        } catch (error) {
            console.error('Error handling role button:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Error updating role. Please try again.', ephemeral: true });
            }
        }
    }

    async handleTicketClose(interaction) {
        const channel = interaction.channel;
        
        if (!channel.name.startsWith('ticket-')) {
            await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
            return;
        }

        // Check if user has staff permissions
        const { hasStaffRole } = require('./utils/permissions');
        if (!hasStaffRole(interaction.member)) {
            await interaction.reply({ content: '❌ You need staff permissions to close tickets.', ephemeral: true });
            return;
        }

        await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...', ephemeral: true });
        
        // Extract user ID from ticket channel name
        const userId = channel.name.replace('ticket-', '');
        
        // Notify the user that their ticket is being closed
        try {
            const user = await this.client.users.fetch(userId);
            if (user) {
                const closureEmbed = {
                    color: 0xff6600,
                    title: '🔒 Ticket Closed',
                    description: `Your support ticket has been closed by ${interaction.user.tag}.`,
                    fields: [
                        {
                            name: '📝 Need more help?',
                            value: 'Feel free to send another DM to create a new ticket if you need further assistance.',
                            inline: false
                        }
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: 'Thank you for contacting Dark MAGA Support!'
                    }
                };
                
                await user.send({ embeds: [closureEmbed] });
                console.log(`Notified user ${user.tag} that their ticket was closed by ${interaction.user.tag}`);
            }
        } catch (error) {
            console.error('Could not notify user about ticket closure:', error);
        }

        // Send closure confirmation to ticket channel before deletion
        const closureLog = {
            color: 0xff0000,
            title: '🔒 Ticket Closure Log',
            fields: [
                {
                    name: 'Closed by',
                    value: interaction.user.toString(),
                    inline: true
                },
                {
                    name: 'Closure Time',
                    value: new Date().toLocaleString(),
                    inline: true
                },
                {
                    name: 'User Notified',
                    value: '✅ Yes',
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'Dark MAGA Modmail System'
            }
        };

        try {
            await channel.send({ embeds: [closureLog] });
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } catch (error) {
            console.error('Error sending closure log:', error);
        }
        
        setTimeout(async () => {
            try {
                await this.database.removeTicketMapping(channel.id);
                await channel.delete();
                console.log(`🔒 Ticket closed: ${channel.name} by ${interaction.user.tag}`);
            } catch (error) {
                console.error('Error closing ticket:', error);
            }
        }, 5000);
    }

    async handleTicketArchive(interaction) {
        const channel = interaction.channel;
        
        if (!channel.name.startsWith('ticket-')) {
            await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
            return;
        }

        // Check if user has staff permissions
        const { hasStaffRole } = require('./utils/permissions');
        if (!hasStaffRole(interaction.member)) {
            await interaction.reply({ content: '❌ You need staff permissions to archive tickets.', ephemeral: true });
            return;
        }

        await interaction.reply({ content: '📁 Archiving ticket...', ephemeral: true });
        
        // Extract user ID from ticket channel name
        const userId = channel.name.replace('ticket-', '');
        
        // Notify the user that their ticket is being archived
        try {
            const user = await this.client.users.fetch(userId);
            if (user) {
                const archiveEmbed = {
                    color: 0xff6600,
                    title: '📁 Ticket Archived',
                    description: `Your support ticket has been archived by ${interaction.user.tag}.`,
                    fields: [
                        {
                            name: '📝 What this means',
                            value: 'Your ticket conversation has been saved for our records. Send a new DM to create a fresh ticket if needed.',
                            inline: false
                        }
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: 'Thank you for contacting Dark MAGA Support!'
                    }
                };
                
                await user.send({ embeds: [archiveEmbed] });
                console.log(`Notified user ${user.tag} that their ticket was archived by ${interaction.user.tag}`);
            }
        } catch (error) {
            console.error('Could not notify user about ticket archival:', error);
        }

        try {
            const oldName = channel.name;
            const newName = `archived-${oldName}`;
            
            // Find or create archive category
            let archiveCategory = interaction.guild.channels.cache.find(
                cat => cat.type === 4 && cat.name === 'Archived Tickets'
            );
            
            if (!archiveCategory) {
                // Create archive category with staff permissions
                const { roles } = require('./config');
                const staffRoleIds = [
                    roles.trialMod,
                    roles.mod,
                    roles.executiveMod,
                    roles.coFounder,
                    roles.founder
                ];
                
                const permissionOverwrites = [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    }
                ];
                
                // Add staff role permissions
                for (const roleId of staffRoleIds) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role) {
                        permissionOverwrites.push({
                            id: roleId,
                            allow: ['ViewChannel', 'ReadMessageHistory']
                        });
                    }
                }
                
                archiveCategory = await interaction.guild.channels.create({
                    name: 'Archived Tickets',
                    type: 4, // Category
                    permissionOverwrites: permissionOverwrites
                });
                console.log(`Created 'Archived Tickets' category in ${interaction.guild.name}`);
            }
            
            // Move channel to archive category and rename
            await channel.setParent(archiveCategory.id);
            await channel.setName(newName);
            
            // Remove from active ticket mapping
            await this.database.removeTicketMapping(channel.id);
            
            // Send archive confirmation
            const archiveLog = {
                color: 0xff6600,
                title: '📁 Ticket Archived',
                description: 'This ticket has been moved to the archive.',
                fields: [
                    {
                        name: 'Archived by',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: 'Archive Time',
                        value: new Date().toLocaleString(),
                        inline: true
                    },
                    {
                        name: 'User Notified',
                        value: '✅ Yes',
                        inline: true
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'Dark MAGA Modmail System'
                }
            };
            
            await channel.send({ embeds: [archiveLog] });
            
            console.log(`📁 Ticket archived: ${oldName} -> ${newName} by ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('Error archiving ticket:', error);
            await interaction.followup.send({ content: `❌ Archive failed: ${error.message}`, ephemeral: true });
        }
    }

    async handleMemberJoin(member) {
        const autoroles = await this.fileUtils.loadAutoroles();
        
        if (autoroles.length > 0) {
            for (const roleId of autoroles) {
                try {
                    const role = member.guild.roles.cache.get(roleId);
                                            if (role) {
                            await member.roles.add(role);
                        } else {
                            console.error(`Autorole with ID ${roleId} not found in guild`);
                        }
                } catch (error) {
                    console.error(`❌ Error adding autorole ${roleId} to ${member.user.tag}:`, error.message);
                }
            }
                    }

        // Send welcome embed in the welcome channel
        try {
            const welcomeChannel = member.guild.channels.cache.get(config.channels.welcome);
            if (welcomeChannel) {
                const memberCount = member.guild.memberCount;
                const embed = {
                    color: 0x23272A,
                    author: {
                        name: `Member #${memberCount}`
                    },
                    description:
                        `🇺🇸 **Welcome ${member}!** We hope you enjoy your stay, let's **Make America Great Again!**\n\n` +
                        `🐺 **Dark MAGA v2**\n` +
                        `🔥 **Join the movement!**\n` +
                        `• Make America Great Again\n` +
                        `• Make America Wealthy Again\n` +
                        `• Make America Strong Again`,
                    image: {
                        url: 'https://pbs.twimg.com/media/GTLawZWW8AArX54?format=png&name=small'
                    },
                    footer: {
                        text: `Welcome to Dark MAGA!`
                    },
                    timestamp: new Date()
                };
                await welcomeChannel.send({ embeds: [embed] });
            } else {
                console.error('Welcome channel not found');
            }
        } catch (error) {
            console.error('❌ Error sending welcome embed:', error.message);
        }
    }

    async handleMemberLeave(member) {
        // Clean up any open tickets
        const ticketMapping = await this.database.getTicketMapping(member.id);
        if (ticketMapping) {
            const channel = member.guild.channels.cache.get(ticketMapping.ticket_channel_id);
            if (channel) {
                await channel.delete().catch(console.error);
            }
            await this.database.removeTicketMapping(ticketMapping.ticket_channel_id);
        }
    }

    startChatReviveTask() {
        // Always start the task, but check enabled status in checkChatRevive
        // Check every 30 minutes instead of every 5 minutes
        cron.schedule('*/30 * * * *', async () => {
            try {
                await this.checkChatRevive();
            } catch (error) {
                console.error('Error in chat revive task:', error);
            }
        });
    }

    async checkChatRevive() {
        // Get chat revive settings from database
        const chatReviveSettings = await this.database.getChatReviveSettings();
        
        // Check if system is enabled
        if (!chatReviveSettings.enabled) return;
        
        // Determine which channels to monitor
        const channels = chatReviveSettings.channels && chatReviveSettings.channels.length > 0 
            ? chatReviveSettings.channels 
            : config.channels.chatReviveChannels;
            
        if (!channels || channels.length === 0) return;
        
        for (const channelId of channels) {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel) continue;

            try {
                // Get the last message in the channel
                const messages = await channel.messages.fetch({ limit: 1 });
                
                if (messages.size === 0) {
                    // No messages in channel, skip
                    continue;
                }

                const lastMessage = messages.first();
                const now = Date.now();
                const twoHoursAgo = now - (2 * 60 * 60 * 1000); // 2 hours in milliseconds
                const lastReviveKey = `lastRevive_${channelId}`;

                // Check if the last message was more than 2 hours ago
                if (lastMessage.createdTimestamp < twoHoursAgo) {
                    // Check if we've sent a revive message recently in this channel
                    const lastReviveTime = chatReviveSettings.lastMessage[lastReviveKey] || 0;
                    const timeSinceLastRevive = now - lastReviveTime;
                    const cooldownTime = 2 * 60 * 60 * 1000; // 2 hours cooldown

                    if (timeSinceLastRevive >= cooldownTime) {
                        // Send revive message and update timestamp
                        await this.sendChatReviveMessage(channel);
                        
                        // Update the last revive time for this channel
                        chatReviveSettings.lastMessage[lastReviveKey] = now;
                        await this.database.saveChatReviveSettings(chatReviveSettings);
                    }
                }
            } catch (error) {
                console.error(`Error checking chat revive for channel ${channelId}:`, error);
            }
        }
    }

    async sendChatReviveMessage(channel) {
        const messages = [
            `<@&${config.chatRevivePingRole}> 🇺🇸 The chat seems quiet... Let's make America great again!`,
            `<@&${config.chatRevivePingRole}> 🗣️ Anyone want to discuss the latest news?`,
            `<@&${config.chatRevivePingRole}> 💪 Time to revive this chat with some MAGA energy!`,
            `<@&${config.chatRevivePingRole}> 🇺🇸 Patriot check! Who's here?`,
            `<@&${config.chatRevivePingRole}> 🔥 Let's get this conversation flowing again!`,
            `<@&${config.chatRevivePingRole}> 🇺🇸 America First! What's on your mind?`,
            `<@&${config.chatRevivePingRole}> 💬 Chat's been quiet. Anyone want to share their thoughts?`,
            `<@&${config.chatRevivePingRole}> 🇺🇸 Let's keep the MAGA spirit alive in here!`,
            `<@&${config.chatRevivePingRole}> 🗣️ Time to wake up this chat!`,
            `<@&${config.chatRevivePingRole}> 🇺🇸 Patriot energy needed! What's happening?`
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        try {
            await channel.send({ 
                content: randomMessage, 
                allowedMentions: { roles: [config.chatRevivePingRole] } 
            });
        } catch (error) {
            console.error(`Error sending chat revive message to ${channel.name}:`, error);
        }
    }

    async handleTicketResponse(message) {
        // Extract user ID from ticket channel name (format: ticket-USERID)
        const userId = message.channel.name.replace('ticket-', '');
        
        if (!userId || isNaN(userId)) {
            return;
        }

        try {
            // Get the user
            const user = await this.client.users.fetch(userId);
            if (!user) {
                return;
            }

            // Check if user is blocked
            const blockedUsers = await this.fileUtils.loadBlockedUsers();
            if (blockedUsers.includes(userId)) {
                return;
            }

            // Create embed for the user
            const embed = {
                color: 0xff9900,
                title: '📨 Response from Staff',
                description: `**Staff Member:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                fields: [
                    {
                        name: 'Message',
                        value: message.content.length > 1024 ? 
                            message.content.substring(0, 1021) + '...' : 
                            message.content,
                        inline: false
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'Dark MAGA Bot - Modmail'
                }
            };

            // Send message to user
            await user.send({ embeds: [embed] });

        } catch (error) {
            console.error(`Error forwarding ticket response to user ${userId}:`, error.message);
        }
    }

    async login() {
        try {
            await this.initialize();
            await this.client.login(config.token);
        } catch (error) {
            console.error('Error logging in:', error);
            process.exit(1);
        }
    }
}

// Create and start the bot
const bot = new DarkMAGABot();
bot.login();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    process.exit(0);
}); 