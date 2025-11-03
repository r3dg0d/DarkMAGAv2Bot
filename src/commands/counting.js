const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting')
        .setDescription('Manage the counting channel system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the counting channel to 0')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the current counting status')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'reset') {
            try {
                const countingChannel = interaction.client.channels.cache.get('1419081560145002636');
                if (!countingChannel) {
                    await interaction.reply({ 
                        content: '❌ Counting channel not found!', 
                        ephemeral: true 
                    });
                    return;
                }

                await interaction.bot.counting.manualReset(countingChannel, interaction.user);
                
                await interaction.reply({ 
                    content: '✅ Counting channel has been reset to 0!', 
                    ephemeral: true 
                });
            } catch (error) {
                console.error('Error resetting counting:', error);
                await interaction.reply({ 
                    content: '❌ Error resetting counting channel!', 
                    ephemeral: true 
                });
            }
        } else if (subcommand === 'status') {
            try {
                const status = interaction.bot.counting.getStatus();
                
                const statusEmbed = {
                    color: 0x0099ff,
                    title: '🔢 Counting Channel Status',
                    fields: [
                        {
                            name: '📊 Current Count',
                            value: status.currentCount.toString(),
                            inline: true
                        },
                        {
                            name: '➡️ Next Number',
                            value: status.nextNumber.toString(),
                            inline: true
                        },
                        {
                            name: '👤 Last Counter',
                            value: status.lastCounter ? `<@${status.lastCounter}>` : 'None',
                            inline: true
                        },
                        {
                            name: '⏰ Last Count Time',
                            value: status.lastCountTime ? 
                                `<t:${Math.floor(status.lastCountTime / 1000)}:R>` : 
                                'Never',
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'Dark MAGA Counting System'
                    },
                    timestamp: new Date()
                };

                await interaction.reply({ 
                    embeds: [statusEmbed], 
                    ephemeral: true 
                });
            } catch (error) {
                console.error('Error getting counting status:', error);
                await interaction.reply({ 
                    content: '❌ Error getting counting status!', 
                    ephemeral: true 
                });
            }
        }
    },
};
