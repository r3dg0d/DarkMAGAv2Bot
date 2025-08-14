const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testchatrevive')
        .setDescription('Test the chat revive system (Executive Mod+ Only)'),
    
    permissions: ['executiveMod'],
    
    async execute(interaction, bot) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Get current settings
            const chatReviveSettings = await bot.database.getChatReviveSettings();
            
            if (!chatReviveSettings.enabled) {
                await interaction.editReply({
                    content: '❌ **Chat revive system is disabled.** Enable it first with `/chatrevive enabled:true`'
                });
                return;
            }
            
            // Determine which channels to test
            const channelsToTest = chatReviveSettings.channels && chatReviveSettings.channels.length > 0 
                ? chatReviveSettings.channels 
                : config.channels.chatReviveChannels;
            
            if (!channelsToTest || channelsToTest.length === 0) {
                await interaction.editReply({
                    content: '❌ **No channels configured for chat revive.**'
                });
                return;
            }
            
            let testResults = '';
            let successCount = 0;
            let totalChannels = channelsToTest.length;
            
            for (const channelId of channelsToTest) {
                const channel = interaction.guild.channels.cache.get(channelId);
                
                if (channel) {
                    try {
                        // Get last message in channel
                        const messages = await channel.messages.fetch({ limit: 1 });
                        let lastMessageInfo = 'No messages found';
                        
                        if (messages.size > 0) {
                            const lastMessage = messages.first();
                            const timeSinceLastMessage = Date.now() - lastMessage.createdTimestamp;
                            const hours = Math.floor(timeSinceLastMessage / (60 * 60 * 1000));
                            const minutes = Math.floor((timeSinceLastMessage % (60 * 60 * 1000)) / (60 * 1000));
                            lastMessageInfo = `${hours}h ${minutes}m ago`;
                        }
                        
                        // Send a test revive message
                        const testMessage = `🧪 **[TEST MESSAGE]** <@&${config.chatRevivePingRole}> Testing the chat revive system! This is a manual test by ${interaction.user}. 🇺🇸`;
                        
                        await channel.send({ 
                            content: testMessage,
                            allowedMentions: { roles: [config.chatRevivePingRole] }
                        });
                        
                        testResults += `✅ <#${channelId}> - Test sent successfully\n└ Last message was: ${lastMessageInfo}\n\n`;
                        successCount++;
                        
                    } catch (error) {
                        testResults += `❌ <#${channelId}> - Failed to send test message\n└ Error: ${error.message}\n\n`;
                    }
                } else {
                    testResults += `❌ ${channelId} - Channel not found\n\n`;
                }
            }
            
            // Build result embed
            const embed = new EmbedBuilder()
                .setColor(successCount === totalChannels ? 0x00ff00 : 0xffa500)
                .setTitle('🧪 Chat Revive Test Results')
                .setDescription(`**Test completed for ${totalChannels} channels**\n\n${testResults}`)
                .addFields(
                    { name: '📊 Summary', value: `${successCount}/${totalChannels} channels tested successfully`, inline: true },
                    { name: '⏰ Test Time', value: new Date().toLocaleString(), inline: true }
                )
                .setFooter({ text: 'Dark MAGA Bot - Chat Revive Test' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error testing chat revive:', error);
            
            try {
                await interaction.editReply({ 
                    content: '❌ **Error:** Failed to test chat revive system. Please try again.' 
                });
            } catch (editError) {
                await interaction.followUp({ 
                    content: '❌ **Error:** Failed to test chat revive system. Please try again.',
                    ephemeral: true 
                });
            }
        }
    }
}; 