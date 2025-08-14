const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatrevive')
        .setDescription('Configure the chat revive feature (Executive Mod+ Only)')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable chat revive messages')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channels')
                .setDescription('Channels to send revival messages to (mention them, separated by spaces)')
                .setRequired(false)),
    
    permissions: ['executiveMod'],
    
    async execute(interaction, bot) {
        const enabled = interaction.options.getBoolean('enabled');
        const channelsString = interaction.options.getString('channels');
        
        try {
            // Get current settings
            const chatReviveSettings = await bot.database.getChatReviveSettings();
            
            // Update enabled status
            chatReviveSettings.enabled = enabled;
            
            // Update channels if provided
            if (channelsString) {
                const channelMentions = channelsString.match(/<#(\d+)>/g);
                if (channelMentions) {
                    const channelIds = channelMentions.map(mention => mention.match(/\d+/)[0]);
                    
                    // Validate channels exist
                    const validChannels = [];
                    for (const channelId of channelIds) {
                        const channel = interaction.guild.channels.cache.get(channelId);
                        if (channel) {
                            validChannels.push(channelId);
                        }
                    }
                    
                    chatReviveSettings.channels = validChannels;
                }
            }
            
            // Save settings
            await bot.database.saveChatReviveSettings(chatReviveSettings);
            
            // Build response embed
            const embed = new EmbedBuilder()
                .setColor(enabled ? 0x00ff00 : 0xff0000)
                .setTitle('🔄 Chat Revive Settings Updated')
                .addFields(
                    { name: '📊 Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '⏰ Check Interval', value: 'Every 30 minutes', inline: true },
                    { name: '🕐 Inactivity Threshold', value: '2 hours', inline: true }
                )
                .setFooter({ text: 'Dark MAGA Bot - Chat Revive System' })
                .setTimestamp();
            
            // Add channels info
            if (chatReviveSettings.channels && chatReviveSettings.channels.length > 0) {
                const channelList = chatReviveSettings.channels
                    .map(id => `<#${id}>`)
                    .join(', ');
                embed.addFields({ 
                    name: '📢 Monitored Channels', 
                    value: channelList, 
                    inline: false 
                });
            } else {
                embed.addFields({ 
                    name: '📢 Monitored Channels', 
                    value: 'Using default channels from config', 
                    inline: false 
                });
            }
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error updating chat revive settings:', error);
            await interaction.reply({ 
                content: '❌ **Error:** Failed to update chat revive settings. Please try again.', 
                ephemeral: true 
            });
        }
    }
}; 