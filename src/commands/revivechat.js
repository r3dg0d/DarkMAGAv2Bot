const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('revivechat')
        .setDescription('Manually send a chat revival message (2 hour cooldown)'),
    
    cooldown: 7200000, // 2 hours in milliseconds
    
    async execute(interaction, bot) {
        const userId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        
        try {
            // Get chat revive settings to check user cooldowns
            const chatReviveSettings = await bot.database.getChatReviveSettings();
            const userCooldownKey = `userCooldown_${userId}`;
            const lastUsedTime = chatReviveSettings.lastMessage[userCooldownKey] || 0;
            const timeSinceLastUse = now - lastUsedTime;
            
            if (timeSinceLastUse < cooldownTime) {
                const remainingTime = cooldownTime - timeSinceLastUse;
                const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));
                const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
                
                await interaction.reply({ 
                    content: `⏰ **Cooldown Active**\nYou must wait **${remainingHours}h ${remainingMinutes}m** before using this command again.`, 
                    ephemeral: true 
                });
                return;
            }

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
            
            await interaction.reply({ content: '✅ **Chat Revival Sent!**\nReviving the chat with some patriot energy!', ephemeral: true });
            
            // Send the revival message with proper role ping
            await interaction.channel.send({ 
                content: randomMessage,
                allowedMentions: { roles: [config.chatRevivePingRole] }
            });
            
            // Update user cooldown
            chatReviveSettings.lastMessage[userCooldownKey] = now;
            await bot.database.saveChatReviveSettings(chatReviveSettings);
            
        } catch (error) {
            console.error('Error in revivechat command:', error);
            await interaction.reply({ 
                content: '❌ **Error:** Failed to send chat revival message. Please try again.', 
                ephemeral: true 
            });
        }
    }
}; 