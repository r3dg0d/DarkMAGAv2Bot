const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const DemoUtils = require('../utils/demoUtils');
const PaymentUtils = require('../utils/paymentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('demostatus')
        .setDescription('Check your demo usage and premium status'),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        // Check if user has paid for AI features or is a server booster
        const hasPaid = await paymentUtils.hasPaidForAI(userId, guildId, interaction.member);
        const isBooster = paymentUtils.isServerBooster(interaction.member);
        
        if (hasPaid) {
            const accessType = isBooster ? 'Server Booster' : 'Premium Subscriber';
            const accessIcon = isBooster ? '🚀' : '💳';
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`${accessIcon} Premium Access Active`)
                .setDescription(
                    `**Congratulations!** You have unlimited access to all AI features!\n\n` +
                    `**Access Type:** ${accessType}\n\n` +
                    `**Available Commands:**\n` +
                    `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                    `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                    `• AI image generation (/imagegen, /editimage)\n` +
                    `• Uncensored AI responses\n\n` +
                    `**Future Features Coming Soon:**\n` +
                    `• Uncensored AI Image generation\n` +
                    `• Text-to-video generation\n` +
                    `• Real-time AI voice chat\n` +
                    `• And much more to come!\n\n` +
                    `${isBooster ? 
                        'Thank you for boosting the server! Your access continues as long as you\'re boosting.' : 
                        'Enjoy your premium AI features!'} 🚀`
                )
                .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/premium-icon.png')
                .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Get demo usage statistics
        const demoStats = await demoUtils.getDemoStats(userId, guildId);
        
        const embed = new EmbedBuilder()
            .setColor(demoStats.remaining > 0 ? 0x1e40af : 0xff6b35)
            .setTitle('🎯 Demo Status')
            .setDescription(
                `**Demo Usage:** ${demoStats.used}/${demoStats.max} prompts used\n` +
                `**Remaining:** ${demoStats.remaining} free prompt${demoStats.remaining === 1 ? '' : 's'}\n\n` +
                `${demoStats.remaining > 0 ? 
                    '**You still have free prompts available!** Try any AI command to use them.' : 
                    '**Demo limit reached!** Upgrade to premium for unlimited access.'}\n\n` +
                `**Get unlimited access in two ways:**\n\n` +
                `**🚀 Option 1: Server Boost (Recommended)**\n` +
                `• Boost this server for instant premium access\n` +
                `• Support the community while getting benefits\n` +
                `• Access lasts as long as you're boosting\n\n` +
                `**💳 Option 2: One-time Payment ($25)**\n` +
                `• Use \`/payforai\` to get started\n` +
                `• Lifetime access to all AI features\n\n` +
                `**What you get with Premium:**\n` +
                `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                `• AI image generation (/imagegen, /editimage)\n` +
                `• Uncensored AI responses\n\n` +
                `**Future Features Coming Soon:**\n` +
                `• Uncensored AI Image generation\n` +
                `• Text-to-video generation\n` +
                `• Real-time AI voice chat\n` +
                `• And much more to come!`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/demo-status-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Demo Mode' })
            .setTimestamp();

        // Add command usage breakdown if available
        if (demoStats.commands && Object.keys(demoStats.commands).length > 0) {
            const commandBreakdown = Object.entries(demoStats.commands)
                .map(([cmd, count]) => `• \`/${cmd}\`: ${count} use${count === 1 ? '' : 's'}`)
                .join('\n');
            
            embed.addFields({
                name: '📊 Command Usage',
                value: commandBreakdown,
                inline: false
            });
        }

        // Add first/last used timestamps if available
        if (demoStats.firstUsed) {
            embed.addFields({
                name: '📅 First Used',
                value: new Date(demoStats.firstUsed).toLocaleString(),
                inline: true
            });
        }

        if (demoStats.lastUsed) {
            embed.addFields({
                name: '🕒 Last Used',
                value: new Date(demoStats.lastUsed).toLocaleString(),
                inline: true
            });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
