const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannelperms')
        .setDescription('Set channel permissions for all channels in specified categories')
        .addSubcommand(subcommand =>
            subcommand
                .setName('restrict')
                .setDescription('Make channels only viewable by MAGA role members')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('restore')
                .setDescription('Restore default channel permissions')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Configuration
        const magaRoleId = '1375329833361342577'; // MAGA role ID
        
        // Categories that should be restricted (only MAGA role can view)
        const restrictedCategories = [
            '1375329859622141963',
            '1375329858095288394', 
            '1375329857206222998',
            '1375329855922770061'
        ];
        
        // Categories that should remain public (exceptions)
        const publicCategories = [
            '1375329860620124172',
            '1375329862256169061',
            '1384321000790953994',
            '1404212956954234982'
        ];

        try {
            const guild = interaction.guild;
            const magaRole = guild.roles.cache.get(magaRoleId);
            
            if (!magaRole) {
                await interaction.reply({ 
                    content: `❌ MAGA role with ID ${magaRoleId} not found!`, 
                    ephemeral: true 
                });
                return;
            }

            if (subcommand === 'restrict') {
                await interaction.deferReply({ ephemeral: true });
                
                let processedChannels = 0;
                let skippedChannels = 0;
                const results = [];

                // Process each restricted category
                for (const categoryId of restrictedCategories) {
                    const category = guild.channels.cache.get(categoryId);
                    
                    if (!category || category.type !== ChannelType.GuildCategory) {
                        results.push(`❌ Category ${categoryId} not found or invalid`);
                        continue;
                    }

                    // Get all channels in this category
                    const channelsInCategory = guild.channels.cache.filter(
                        channel => channel.parentId === categoryId && 
                                 channel.type !== ChannelType.GuildCategory
                    );

                    results.push(`\n📁 **${category.name}** (${channelsInCategory.size} channels)`);

                    // Process each channel in the category
                    for (const channel of channelsInCategory.values()) {
                        try {
                            // Set permissions: Everyone can't view, MAGA role can view
                            await channel.permissionOverwrites.set([
                                {
                                    id: guild.id, // @everyone
                                    deny: ['ViewChannel']
                                },
                                {
                                    id: magaRoleId,
                                    allow: ['ViewChannel', 'ReadMessageHistory']
                                }
                            ]);

                            results.push(`✅ ${channel.name}`);
                            processedChannels++;
                        } catch (error) {
                            results.push(`❌ ${channel.name} - Error: ${error.message}`);
                            skippedChannels++;
                        }
                    }
                }

                // Create summary embed
                const summaryEmbed = {
                    color: 0x00ff00,
                    title: '🔒 Channel Permissions Updated',
                    description: `Successfully updated permissions for channels in restricted categories.`,
                    fields: [
                        {
                            name: '📊 Summary',
                            value: `✅ **Processed:** ${processedChannels} channels\n❌ **Skipped:** ${skippedChannels} channels\n👥 **Role:** ${magaRole.name}`,
                            inline: false
                        },
                        {
                            name: '📁 Restricted Categories',
                            value: restrictedCategories.map(id => {
                                const cat = guild.channels.cache.get(id);
                                return `• ${cat ? cat.name : 'Unknown'} (${id})`;
                            }).join('\n'),
                            inline: false
                        },
                        {
                            name: '📁 Public Categories (Exceptions)',
                            value: publicCategories.map(id => {
                                const cat = guild.channels.cache.get(id);
                                return `• ${cat ? cat.name : 'Unknown'} (${id})`;
                            }).join('\n'),
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'Dark MAGA Bot - Channel Management'
                    },
                    timestamp: new Date()
                };

                await interaction.editReply({ 
                    embeds: [summaryEmbed],
                    content: results.length > 20 ? 
                        '⚠️ Too many channels to display individual results. Check the summary above.' : 
                        `\`\`\`\n${results.join('\n')}\`\`\``
                });

            } else if (subcommand === 'restore') {
                await interaction.deferReply({ ephemeral: true });
                
                let processedChannels = 0;
                let skippedChannels = 0;
                const results = [];

                // Process each restricted category
                for (const categoryId of restrictedCategories) {
                    const category = guild.channels.cache.get(categoryId);
                    
                    if (!category || category.type !== ChannelType.GuildCategory) {
                        results.push(`❌ Category ${categoryId} not found or invalid`);
                        continue;
                    }

                    // Get all channels in this category
                    const channelsInCategory = guild.channels.cache.filter(
                        channel => channel.parentId === categoryId && 
                                 channel.type !== ChannelType.GuildCategory
                    );

                    results.push(`\n📁 **${category.name}** (${channelsInCategory.size} channels)`);

                    // Process each channel in the category
                    for (const channel of channelsInCategory.values()) {
                        try {
                            // Reset permissions: Everyone can view, remove MAGA role override
                            await channel.permissionOverwrites.set([
                                {
                                    id: guild.id, // @everyone
                                    allow: ['ViewChannel']
                                }
                            ]);

                            results.push(`✅ ${channel.name}`);
                            processedChannels++;
                        } catch (error) {
                            results.push(`❌ ${channel.name} - Error: ${error.message}`);
                            skippedChannels++;
                        }
                    }
                }

                // Create summary embed
                const summaryEmbed = {
                    color: 0x0099ff,
                    title: '🔓 Channel Permissions Restored',
                    description: `Successfully restored default permissions for channels in restricted categories.`,
                    fields: [
                        {
                            name: '📊 Summary',
                            value: `✅ **Processed:** ${processedChannels} channels\n❌ **Skipped:** ${skippedChannels} channels`,
                            inline: false
                        },
                        {
                            name: '📁 Affected Categories',
                            value: restrictedCategories.map(id => {
                                const cat = guild.channels.cache.get(id);
                                return `• ${cat ? cat.name : 'Unknown'} (${id})`;
                            }).join('\n'),
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'Dark MAGA Bot - Channel Management'
                    },
                    timestamp: new Date()
                };

                await interaction.editReply({ 
                    embeds: [summaryEmbed],
                    content: results.length > 20 ? 
                        '⚠️ Too many channels to display individual results. Check the summary above.' : 
                        `\`\`\`\n${results.join('\n')}\`\`\``
                });
            }

        } catch (error) {
            console.error('Error in setchannelperms command:', error);
            await interaction.reply({ 
                content: `❌ An error occurred: ${error.message}`, 
                ephemeral: true 
            });
        }
    },
};
