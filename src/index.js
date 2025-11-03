require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');

// Import utilities
const Database = require('./utils/database');
const FileUtils = require('./utils/fileUtils');
const LevelingSystem = require('./utils/leveling');
const CountingSystem = require('./utils/counting');
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
        this.counting = new CountingSystem(this.database);

        // Initialize handlers
        this.commandHandler = new CommandHandler(this);
        this.eventHandler = new EventHandler(this);

        this.setupEventListeners();
    }

    async initialize() {
        try {
            // Copy existing data files
            await this.fileUtils.copyExistingData();
            
            // Initialize counting system
            await this.counting.initialize();
            
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

            // Handle counting channel
            const countingResult = await this.counting.handleCountingMessage(message);
            if (countingResult.action !== 'none') {
                // Counting system handled the message, skip other processing
                return;
            }

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
            if (message.guild && message.channel?.name && (message.channel.name.startsWith('ticket-') || message.channel.name.startsWith('verify-')) && !message.author?.bot) {
                await this.handleTicketResponse(message);
                return;
            }

            // Update leveling
            if (message.guild) {
                const levelResult = await this.leveling.updateUserLevel(message.author.id, message.guild.id, message.channel.id);
                
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

                // Check for Bible verse references
                try {
                    const bibleVerseCommand = require('./commands/bibleverse');
                    await bibleVerseCommand.detectAndRespondToVerse(message, this);
                } catch (error) {
                    console.error('Error in Bible verse detection:', error);
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
        } else if (customId.startsWith('tts_')) {
            console.log('Handling TTS button with customId:', customId); // Debug log
            // Load the uncensoredlm command and handle TTS
            const uncensoredlmCommand = require('./commands/uncensoredlm');
            if (uncensoredlmCommand.handleButtonInteraction) {
                const handled = await uncensoredlmCommand.handleButtonInteraction(interaction, this);
                if (handled) {
                    console.log('TTS button handled successfully');
                    return;
                } else {
                    console.log('TTS button handler returned false');
                }
            } else {
                console.log('No handleButtonInteraction method found in uncensoredlm command');
            }
        } else if (customId.startsWith('speak_')) {
            console.log('Handling speak button with customId:', customId); // Debug log
            // Handle askcharacter speak buttons
            await this.handleSpeakButton(interaction);
        } else if (customId === 'upgrade_premium') {
            console.log('Handling upgrade premium button'); // Debug log
            await this.handleUpgradeButton(interaction);
        } else if (customId === 'demo_info') {
            console.log('Handling demo info button'); // Debug log
            await this.handleDemoInfoButton(interaction);
        } else if (customId.startsWith('check_payment_')) {
            console.log('Handling check payment button'); // Debug log
            // Load the payforai command and handle payment verification
            const payforaiCommand = require('./commands/payforai');
            if (payforaiCommand.handleButtonInteraction) {
                const handled = await payforaiCommand.handleButtonInteraction(interaction, this);
                if (handled) {
                    console.log('Payment check button handled successfully');
                    return;
                } else {
                    console.log('Payment check button handler returned false');
                }
            } else {
                console.log('No handleButtonInteraction method found in payforai command');
            }
        } else if (customId === 'create_verification_ticket') {
            console.log('Handling create verification ticket button'); // Debug log
            await this.handleCreateVerificationTicket(interaction);
        } else if (customId === 'create_jail_appeal') {
            console.log('Handling create jail appeal button'); // Debug log
            await this.handleCreateJailAppeal(interaction);
        } else if (customId === 'support_general') {
            console.log('Handling general support button'); // Debug log
            await this.handleSupportTicket(interaction, 'general');
        } else if (customId === 'support_bot') {
            console.log('Handling bot support button'); // Debug log
            await this.handleSupportTicket(interaction, 'bot');
        } else if (customId === 'support_report') {
            console.log('Handling report member button'); // Debug log
            await this.handleSupportTicket(interaction, 'report');
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
        
        // Check if it's a ticket channel (ticket-, verify-, or appeal format: username-userid)
        const isTicketChannel = channel.name.startsWith('ticket-') || 
                                channel.name.startsWith('verify-') || 
                                channel.name.startsWith('support-') ||
                                channel.name.startsWith('bot-') ||
                                channel.name.startsWith('report-') ||
                                (!channel.name.startsWith('archived-') && channel.name.includes('-') && channel.name.split('-').length >= 2);
        
        if (!isTicketChannel) {
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
        
        // Extract user ID from ticket channel name or topic
        let userId;
        // Check if it's an appeal channel (format: username-userid)
        if (!channel.name.startsWith('ticket-') && !channel.name.startsWith('verify-') && channel.name.includes('-')) {
            // Extract user ID from channel name (format: username-userid)
            const parts = channel.name.split('-');
            userId = parts[parts.length - 1]; // Last part should be the user ID
        } else {
            // Extract from channel name for ticket- and verify- prefixes
            userId = channel.name.replace('ticket-', '').replace('verify-', '');
        }
        
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
        
        // Check if it's a ticket channel (ticket-, verify-, or appeal format: username-userid)
        const isTicketChannel = channel.name.startsWith('ticket-') || 
                                channel.name.startsWith('verify-') || 
                                channel.name.startsWith('support-') ||
                                channel.name.startsWith('bot-') ||
                                channel.name.startsWith('report-') ||
                                (!channel.name.startsWith('archived-') && channel.name.includes('-') && channel.name.split('-').length >= 2);
        
        if (!isTicketChannel) {
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
        
        // Extract user ID from ticket channel name or topic
        let userId;
        // Check if it's an appeal channel (format: username-userid)
        if (!channel.name.startsWith('ticket-') && !channel.name.startsWith('verify-') && channel.name.includes('-')) {
            // Extract user ID from channel name (format: username-userid)
            const parts = channel.name.split('-');
            userId = parts[parts.length - 1]; // Last part should be the user ID
        } else {
            // Extract from channel name for ticket- and verify- prefixes
            userId = channel.name.replace('ticket-', '').replace('verify-', '');
        }
        
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

    async handleCreateVerificationTicket(interaction) {
        const guild = interaction.guild;
        const user = interaction.user;
        
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
            await interaction.reply({ 
                content: '❌ **Error:** Could not find a ticket category. Please contact a staff member.', 
                ephemeral: true 
            });
            return;
        }

        // Check if user already has an open ticket
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === `verify-${user.id}` && 
                      channel.parentId === category.id
        );

        if (existingTicket) {
            await interaction.reply({ 
                content: `✅ **You already have an open verification ticket:** ${existingTicket}\n\nPlease continue your verification there.`, 
                ephemeral: true 
            });
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
                    id: user.id,
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
            
            // Create verification ticket channel
            const ticketChannel = await guild.channels.create({
                name: `verify-${user.id}`,
                type: 0, // Text channel
                parent: category,
                permissionOverwrites: permissionOverwrites
            });

            // Send initial message in ticket channel
            const embed = {
                color: 0x00ff00,
                title: '🇺🇸 Verification Ticket Created',
                description: `**Verification request by:** ${user.tag}\n**User ID:** ${user.id}`,
                fields: [
                    {
                        name: 'Account Created',
                        value: user.createdAt.toLocaleDateString(),
                        inline: true
                    },
                    {
                        name: 'Joined Server',
                        value: interaction.member?.joinedAt?.toLocaleDateString() || 'Unknown',
                        inline: true
                    },
                    {
                        name: 'Instructions',
                        value: 'Please provide proof that you are MAGA and support America First ideals:\n\n' +
                               '• Your MAGA support/evidence\n' +
                               '• Your stance on America First principles\n' +
                               '• Any other relevant information\n\n' +
                               'Staff will review your application shortly.',
                        inline: false
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'Dark MAGA Bot - Verification System'
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
            await this.database.saveTicketMapping(ticketChannel.id, user.id);

            // Reply to the user
            await interaction.reply({ 
                content: `✅ **Verification ticket created:** ${ticketChannel}\n\nPlease complete your verification application in the ticket channel. Staff will review it shortly.`, 
                ephemeral: true 
            });

            console.log(`📝 Verification ticket created for ${user.tag}: ${ticketChannel.name}`);

        } catch (error) {
            console.error('Error creating verification ticket:', error);
            await interaction.reply({ 
                content: '❌ **Error:** Failed to create verification ticket. Please try again later or contact a staff member.', 
                ephemeral: true 
            });
        }
    }

    async handleCreateJailAppeal(interaction) {
        const guild = interaction.guild;
        const user = interaction.user;
        
        // Find or create jail category
        let jailCategory = guild.channels.cache.find(
            channel => channel.type === 4 && channel.name.toLowerCase().includes('alligator-alcatraz')
        );
        
        if (!jailCategory) {
            // Create jail category
            jailCategory = await guild.channels.create({
                name: '🐊 alligator-alcatraz',
                type: 4, // Category
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: ['ViewChannel']
                    }
                ]
            });
        }

        // Generate appeal channel name: username-userid
        const appealChannelName = `${user.username}-${user.id}`;

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
            
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: this.client.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
                }
            ];
            
            for (const roleId of staffRoleIds) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    permissionOverwrites.push({
                        id: roleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    });
                }
            }

            // Create appeal channel
            const appealChannel = await guild.channels.create({
                name: appealChannelName,
                type: 0, // Text channel
                parent: jailCategory,
                permissionOverwrites: permissionOverwrites,
                topic: `Appeal for ${user.tag} (${user.id})`
            });

            // Send appeal form in the channel
            const appealEmbed = {
                color: 0xff0000,
                title: '⛓️ Detainment Appeal Form',
                description: `**Appealing:** ${user.tag}\n**User ID:** ${user.id}`,
                fields: [
                    {
                        name: '📋 Appeal Form',
                        value: 'To appeal your detain, fill out the form below and staff will respond to you shortly.\n\n' +
                               '⚠️ **Please note:** Lying in your detain form or failing to respond to our outreach attempts may result in your form being deleted.\n\n' +
                               '**1. Why were you detained?**\n' +
                               '**2. Why did you do this?**\n' +
                               '**3. Do you believe that you were justified in your actions that led to this detain? Explain.**\n' +
                               '_If yes, you might be asked to speak with a mod in holding cell VC or text channel._\n' +
                               '**4. Do you understand how this might violate server rules and TOS? Explain.**\n' +
                               '_If no, you might be asked to speak with a mod in holding cell VC or text channel._\n' +
                               '**5. Do you agree not to do this again?**\n' +
                               '_Receiving repeated detains can lead to loss of server permissions or termination from the server._',
                        inline: false
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'Dark MAGA Bot - Detainment Appeal System'
                }
            };

            await appealChannel.send({ embeds: [appealEmbed] });

            // Add close/archive buttons
            const actionRow = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 4, // Danger (red)
                        label: 'Close Appeal',
                        emoji: '🔒',
                        custom_id: 'ticket_close'
                    },
                    {
                        type: 2,
                        style: 2, // Secondary (gray)
                        label: 'Archive Appeal',
                        emoji: '📁',
                        custom_id: 'ticket_archive'
                    }
                ]
            };

            await appealChannel.send({ components: [actionRow] });

            await interaction.reply({ 
                content: `✅ **Appeal created:** ${appealChannel}\n\nPlease fill out the appeal form in the channel. Staff will review it shortly.`, 
                ephemeral: true 
            });

            console.log(`⛓️ Jail appeal created for ${user.tag}: ${appealChannel.name}`);

        } catch (error) {
            console.error('Error creating jail appeal:', error);
            await interaction.reply({ 
                content: '❌ **Error:** Failed to create appeal. Please try again later or contact a staff member.', 
                ephemeral: true 
            });
        }
    }

    async handleSupportTicket(interaction, type) {
        const guild = interaction.guild;
        const user = interaction.user;
        
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
        
        if (!category) {
            await interaction.reply({ 
                content: '❌ **Error:** Could not find a ticket category. Please contact a staff member.', 
                ephemeral: true 
            });
            return;
        }

        // Check if user already has an open ticket
        const ticketPrefix = type === 'general' ? 'support' : type === 'bot' ? 'bot' : 'report';
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === `${ticketPrefix}-${user.id}` && 
                      channel.parentId === category.id
        );

        if (existingTicket) {
            await interaction.reply({ 
                content: `✅ **You already have an open ticket:** ${existingTicket}\n\nPlease continue your conversation there.`, 
                ephemeral: true 
            });
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
            
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: this.client.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
                }
            ];
            
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
                name: `${ticketPrefix}-${user.id}`,
                type: 0,
                parent: category,
                permissionOverwrites: permissionOverwrites
            });

            // Create initial message based on type
            let embed;
            let actionRow;

            if (type === 'report') {
                embed = {
                    color: 0xff0000,
                    title: '🚨 Member Report Ticket',
                    description: `**Report by:** ${user.tag}\n**User ID:** ${user.id}`,
                    fields: [
                        {
                            name: 'Instructions',
                            value: 'Please provide the following information:\n\n' +
                                   '**1. Message ID or Link**\n' +
                                   '• Right-click the message → Apps → Copy Message Link\n' +
                                   '• Or use the Message ID\n\n' +
                                   '**2. Screenshots**\n' +
                                   '• Attach any related screenshots\n\n' +
                                   '**3. Which rule did they break?**\n' +
                                   '• Specify which server rule was violated\n\n' +
                                   '**4. What did they do wrong?**\n' +
                                   '• Describe the incident in detail',
                            inline: false
                        }
                    ],
                    timestamp: new Date(),
                    footer: { text: 'Dark MAGA Bot - Support System' }
                };
            } else if (type === 'bot') {
                embed = {
                    color: 0x0099ff,
                    title: '🤖 Bot & Payment Support Ticket',
                    description: `**Ticket by:** ${user.tag}\n**User ID:** ${user.id}`,
                    fields: [
                        {
                            name: 'How can we help?',
                            value: 'Please describe your issue with:\n' +
                                   '• Bot commands not working\n' +
                                   '• Payment problems\n' +
                                   '• Premium feature access\n' +
                                   '• Other bot-related issues',
                            inline: false
                        }
                    ],
                    timestamp: new Date(),
                    footer: { text: 'Dark MAGA Bot - Support System' }
                };
            } else {
                embed = {
                    color: 0x00ff00,
                    title: '💬 General Support Ticket',
                    description: `**Ticket by:** ${user.tag}\n**User ID:** ${user.id}`,
                    fields: [
                        {
                            name: 'How can we help?',
                            value: 'Please describe your question or issue:\n' +
                                   '• Server questions\n' +
                                   '• Feature inquiries\n' +
                                   '• General assistance\n' +
                                   '• Other questions',
                            inline: false
                        }
                    ],
                    timestamp: new Date(),
                    footer: { text: 'Dark MAGA Bot - Support System' }
                };
            }

            actionRow = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 4,
                        label: 'Close Ticket',
                        emoji: '🔒',
                        custom_id: 'ticket_close'
                    },
                    {
                        type: 2,
                        style: 2,
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

            await this.database.saveTicketMapping(ticketChannel.id, user.id);

            await interaction.reply({ 
                content: `✅ **Ticket created:** ${ticketChannel}\n\nPlease describe your issue in the ticket channel. Staff will respond shortly.`, 
                ephemeral: true 
            });

            console.log(`🎫 ${type} ticket created for ${user.tag}: ${ticketChannel.name}`);

        } catch (error) {
            console.error('Error creating support ticket:', error);
            await interaction.reply({ 
                content: '❌ **Error:** Failed to create ticket. Please try again later.', 
                ephemeral: true 
            });
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
        // Extract user ID from ticket channel name (handle both ticket- and verify- prefixes)
        const userId = message.channel.name.replace('ticket-', '').replace('verify-', '');
        
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

    async handleSpeakButton(interaction) {
        try {
            const customId = interaction.customId;
            console.log('Handling speak button:', customId);
            
            // Extract character name from custom ID (e.g., "speak_elon_123456" -> "elon")
            const parts = customId.split('_');
            if (parts.length < 2) {
                console.error('Invalid speak button custom ID:', customId);
                await interaction.reply({ content: '❌ Invalid button configuration.', ephemeral: true });
                return;
            }
            
            const characterName = parts[1]; // "elon", "joerogan", etc.
            console.log('Character name:', characterName);
            
            // Map character names to command files
            const commandMap = {
                'joerogan': 'askjoerogan',
                'elon': 'askelon',
                'jdvance': 'askjdvance',
                'samaltman': 'asksamaltman',
                'rfkjr': 'askrfkjr',
                'njf': 'asknjf',
                'egirl': 'askegirl',
                'trump': 'trumpspeak'
            };
            
            const commandName = commandMap[characterName];
            if (!commandName) {
                console.error('Unknown character:', characterName);
                await interaction.reply({ content: '❌ Unknown character.', ephemeral: true });
                return;
            }
            
            // Load the command and handle the button interaction
            const command = require(`./commands/${commandName}`);
            if (command.handleButtonInteraction) {
                const handled = await command.handleButtonInteraction(interaction, this);
                if (handled) {
                    console.log('Speak button handled successfully for:', characterName);
                } else {
                    console.log('Speak button handler returned false for:', characterName);
                }
            } else {
                console.error('No handleButtonInteraction method found in', commandName);
                await interaction.reply({ content: '❌ Button handler not found.', ephemeral: true });
            }
            
        } catch (error) {
            console.error('Error handling speak button:', error);
            try {
                await interaction.reply({ content: '❌ An error occurred while processing the speak button.', ephemeral: true });
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    }

    async handleUpgradeButton(interaction) {
        try {
            const PaymentUtils = require('./utils/paymentUtils');
            const Database = require('./database');
            
            const paymentUtils = new PaymentUtils();
            const db = new Database();
            
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Check if user already has access
            const hasPaid = await paymentUtils.hasPaidForAI(userId, guildId, interaction.member);
            
            if (hasPaid) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Already Have Access!')
                    .setDescription(
                        `You already have full access to all AI features!\n\n` +
                        `**Available Commands:**\n` +
                        `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                        `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                        `• AI image generation (/imagegen, /editimage)\n` +
                        `• Uncensored AI responses\n\n` +
                        `Enjoy your premium AI features! 🚀`
                    )
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                // Create PayPal invoice (without email since it's from button)
                const invoiceResult = await paymentUtils.createPayPalInvoice(
                    userId,
                    guildId,
                    interaction.user.tag,
                    null // No email provided from button
                );

                if (invoiceResult.success) {
                    // Save payment record with invoice ID
                    const paymentData = {
                        status: 'pending',
                        amount: 25.00,
                        currency: 'USD',
                        reference: invoiceResult.invoiceNumber,
                        invoiceId: invoiceResult.invoiceId,
                        invoiceUrl: invoiceResult.invoiceUrl,
                        description: 'Dark MAGA Bot - AI Features Access (One-time Payment)'
                    };

                    await db.savePayment(userId, guildId, paymentData);

                    // Start polling for this invoice
                    this.startInvoicePolling(invoiceResult.invoiceId, userId, guildId, paymentUtils);

                    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setColor(0x1e40af)
                        .setTitle('💳 Payment Invoice Generated')
                        .setDescription(
                            `**One-time payment of $25.00 USD**\n\n` +
                            `This gives you unlimited access to ALL AI features:\n` +
                            `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                            `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                            `• AI image generation (/imagegen, /editimage)\n` +
                            `• Uncensored AI responses\n\n` +
                            `**Future Features Coming Soon:**\n` +
                            `• Uncensored AI Image generation\n` +
                            `• Text-to-video generation\n` +
                            `• Real-time AI voice chat\n` +
                            `• And much more to come!\n\n` +
                            `**Invoice #:** \`${invoiceResult.invoiceNumber}\`\n\n` +
                            `Click "Pay Invoice" below to complete your payment. Your access will be activated automatically within 1 minute after payment!\n\n` +
                            `⚠️ **Note:** No email provided - you may need to provide your email address for the invoice to be sent properly.`
                        )
                        .addFields(
                            { name: 'Payment Method', value: 'PayPal (Credit Card, Debit Card, PayPal Balance)', inline: true },
                            { name: 'Processing Time', value: 'Automatic (1-2 minutes)', inline: true },
                            { name: 'Access Duration', value: 'Lifetime', inline: true }
                        )
                        .setThumbnail('https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png')
                        .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('💳 Pay Invoice')
                                .setStyle(ButtonStyle.Link)
                                .setURL(invoiceResult.invoiceUrl),
                            new ButtonBuilder()
                                .setCustomId(`check_payment_${userId}_${guildId}`)
                                .setLabel('✅ I Paid - Verify Now')
                                .setStyle(ButtonStyle.Success)
                        );

                    await interaction.editReply({ embeds: [embed], components: [row] });
                } else {
                    throw new Error(invoiceResult.error || 'Failed to create payment invoice');
                }

            } catch (error) {
                console.error('Error in upgrade button payment creation:', error);
                const errorEmbed = paymentUtils.createPaymentErrorEmbed(
                    'Failed to create payment invoice. Please try again later or contact support.'
                );
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        } catch (error) {
            console.error('Error handling upgrade button:', error);
            try {
                await interaction.reply({ 
                    content: '❌ An error occurred while processing the upgrade request. Please try again.', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    }

    async handleDemoInfoButton(interaction) {
        try {
            // Load the demostatus command and execute it
            const demostatusCommand = require('./commands/demostatus');
            await demostatusCommand.execute(interaction, this);
        } catch (error) {
            console.error('Error handling demo info button:', error);
            try {
                await interaction.reply({ 
                    content: '❌ An error occurred while processing the demo info request. Please try again.', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    }

    // Store active polling intervals to avoid duplicates
    activePolls = new Map();

    /**
     * Start polling for invoice payment status
     * Checks every 60 seconds for up to 24 hours
     */
    startInvoicePolling(invoiceId, userId, guildId, paymentUtils) {
        const pollKey = `${userId}-${guildId}`;
        
        // Stop existing poll if any
        if (this.activePolls.has(pollKey)) {
            clearInterval(this.activePolls.get(pollKey).interval);
            this.activePolls.delete(pollKey);
        }

        console.log(`Starting invoice polling for user ${userId}, invoice ${invoiceId}`);

        let checkCount = 0;
        const maxChecks = 1440; // 24 hours (60 checks per hour * 24 hours)

        const interval = setInterval(async () => {
            checkCount++;

            try {
                const Database = require('./database');
                const db = new Database();
                
                // First check if already marked as paid in database
                const payment = await db.getPayment(userId, guildId);
                if (payment && payment.status === 'completed') {
                    console.log(`Payment already completed for ${userId}, stopping poll`);
                    clearInterval(interval);
                    this.activePolls.delete(pollKey);
                    return;
                }

                // Check invoice status with PayPal
                const invoiceStatus = await paymentUtils.checkInvoiceStatus(invoiceId);
                
                if (invoiceStatus.success && invoiceStatus.isPaid) {
                    console.log(`Invoice ${invoiceId} is PAID! Granting access to user ${userId}`);
                    
                    // Update database
                    await db.updatePaymentStatus(userId, guildId, 'completed', invoiceId);
                    
                    // Reset demo usage since user now has premium
                    await paymentUtils.resetDemoUsageOnPayment(userId, guildId);
                    
                    // Assign premium role
                    const roleAssigned = await paymentUtils.assignPremiumRole(this.client, userId, guildId);
                    
                    if (roleAssigned) {
                        // Send DM to user
                        try {
                            const user = await this.client.users.fetch(userId);
                            const successEmbed = paymentUtils.createPaymentSuccessEmbed(userId, invoiceId);
                            await user.send({ embeds: [successEmbed] });
                            console.log(`✅ Successfully granted AI access to ${user.tag}`);
                        } catch (dmError) {
                            console.log('Could not DM user:', dmError.message);
                        }
                    }
                    
                    // Stop polling
                    clearInterval(interval);
                    this.activePolls.delete(pollKey);
                } else if (checkCount >= maxChecks) {
                    // Stop polling after 24 hours
                    console.log(`Stopping poll for ${userId} after ${checkCount} checks (24 hours)`);
                    clearInterval(interval);
                    this.activePolls.delete(pollKey);
                } else {
                    console.log(`Invoice ${invoiceId} check ${checkCount}/${maxChecks}: Status = ${invoiceStatus.status || 'unknown'}`);
                }
                
            } catch (error) {
                console.error('Error in invoice polling:', error);
                
                // Stop polling on persistent errors after 10 failed attempts
                if (checkCount >= 10 && error.message.includes('not found')) {
                    console.error('Stopping poll due to persistent errors');
                    clearInterval(interval);
                    this.activePolls.delete(pollKey);
                }
            }
        }, 60000); // Check every 60 seconds

        // Store the interval
        this.activePolls.set(pollKey, { interval, invoiceId, startTime: Date.now() });
    }
}

// Create and start the main bot
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