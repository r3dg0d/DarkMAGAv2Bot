const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatrevivestatus')
        .setDescription('Check chat revive system status (Executive Mod+ Only)'),
    
    permissions: ['executiveMod'],
    
    async execute(interaction, bot) {
        try {
            // Get current settings
            const chatReviveSettings = await bot.database.getChatReviveSettings();
            
            // Determine which channels are being monitored
            const monitoredChannels = chatReviveSettings.channels && chatReviveSettings.channels.length > 0 
                ? chatReviveSettings.channels 
                : config.channels.chatReviveChannels;
            
            // Build channel status info
            let channelStatusText = '';
            for (const channelId of monitoredChannels) {
                const channel = interaction.guild.channels.cache.get(channelId);
                if (channel) {
                    try {
                        // Get last message in channel
                        const messages = await channel.messages.fetch({ limit: 1 });
                        if (messages.size > 0) {
                            const lastMessage = messages.first();
                            const timeSinceLastMessage = Date.now() - lastMessage.createdTimestamp;
                            const hours = Math.floor(timeSinceLastMessage / (60 * 60 * 1000));
                            const minutes = Math.floor((timeSinceLastMessage % (60 * 60 * 1000)) / (60 * 1000));
                            
                            const status = timeSinceLastMessage > (2 * 60 * 60 * 1000) ? '🔴' : '🟢';
                            channelStatusText += `${status} <#${channelId}> - Last message: ${hours}h ${minutes}m ago\n`;
                        } else {
                            channelStatusText += `⚪ <#${channelId}> - No messages found\n`;
                        }
                    } catch (error) {
                        channelStatusText += `❌ <#${channelId}> - Error checking messages\n`;
                    }
                } else {
                    channelStatusText += `❌ ${channelId} - Channel not found\n`;
                }
            }
            
            if (!channelStatusText) {
                channelStatusText = 'No channels configured';
            }
            
            // Check last revive times
            let lastReviveText = '';
            for (const channelId of monitoredChannels) {
                const lastReviveKey = `lastRevive_${channelId}`;
                const lastReviveTime = chatReviveSettings.lastMessage[lastReviveKey];
                
                if (lastReviveTime) {
                    const timeSinceRevive = Date.now() - lastReviveTime;
                    const hours = Math.floor(timeSinceRevive / (60 * 60 * 1000));
                    const minutes = Math.floor((timeSinceRevive % (60 * 60 * 1000)) / (60 * 1000));
                    lastReviveText += `<#${channelId}> - ${hours}h ${minutes}m ago\n`;
                } else {
                    lastReviveText += `<#${channelId}> - Never\n`;
                }
            }
            
            if (!lastReviveText) {
                lastReviveText = 'No revive history';
            }
            
            const embed = new EmbedBuilder()
                .setColor(chatReviveSettings.enabled ? 0x00ff00 : 0xff0000)
                .setTitle('📊 Chat Revive System Status')
                .addFields(
                    { 
                        name: '🔄 System Status', 
                        value: chatReviveSettings.enabled ? '✅ Enabled' : '❌ Disabled', 
                        inline: true 
                    },
                    { 
                        name: '⏰ Check Interval', 
                        value: 'Every 30 minutes', 
                        inline: true 
                    },
                    { 
                        name: '🕐 Inactivity Threshold', 
                        value: '2 hours', 
                        inline: true 
                    },
                    { 
                        name: '📢 Channel Activity Status', 
                        value: channelStatusText, 
                        inline: false 
                    },
                    { 
                        name: '📅 Last Revive Messages', 
                        value: lastReviveText, 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot - Chat Revive System' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error getting chat revive status:', error);
            await interaction.reply({ 
                content: '❌ **Error:** Failed to get chat revive status. Please try again.', 
                ephemeral: true 
            });
        }
    }
}; 