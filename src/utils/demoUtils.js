const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../database');
const PaymentUtils = require('./paymentUtils');

class DemoUtils {
    constructor() {
        this.db = new Database();
        this.paymentUtils = new PaymentUtils();
    }

    /**
     * Check if user can use AI command (has paid, is booster, or has demo uses left)
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {Object} member - Discord member object (optional)
     * @returns {Promise<Object>} - { canUse: boolean, isDemo: boolean, remaining: number, reason?: string, isBooster?: boolean }
     */
    async checkAIUsage(userId, guildId, member = null) {
        // First check if user has paid for AI features or is a server booster
        const hasPaid = await this.paymentUtils.hasPaidForAI(userId, guildId, member);
        const isBooster = member ? this.paymentUtils.isServerBooster(member) : false;
        
        if (hasPaid) {
            return { canUse: true, isDemo: false, remaining: -1, isBooster };
        }

        // Check demo usage
        const demoUsage = await this.db.getDemoUsage(userId, guildId);
        
        if (demoUsage.used >= demoUsage.max) {
            return { 
                canUse: false, 
                isDemo: true, 
                remaining: 0, 
                reason: 'Demo limit reached',
                isBooster: false
            };
        }

        return { 
            canUse: true, 
            isDemo: true, 
            remaining: demoUsage.max - demoUsage.used,
            isBooster: false
        };
    }

    /**
     * Increment demo usage for a command
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {string} commandName - Name of the command used
     * @returns {Promise<Object>} - Updated demo usage data
     */
    async useDemoCommand(userId, guildId, commandName) {
        return await this.db.incrementDemoUsage(userId, guildId, commandName);
    }

    /**
     * Create demo limit reached embed
     * @param {string} commandName - Name of the command that hit the limit
     * @param {number} used - Number of demo uses consumed
     * @param {number} max - Maximum demo uses allowed
     * @returns {EmbedBuilder} - Discord embed for demo limit
     */
    createDemoLimitEmbed(commandName, used, max) {
        const embed = new EmbedBuilder()
            .setColor(0xff6b35)
            .setTitle('🎯 Demo Limit Reached!')
            .setDescription(
                `**${commandName}** demo limit reached! You've used **${used}/${max}** free prompts.\n\n` +
                `**Get unlimited access in two ways:**\n\n` +
                `**🚀 Option 1: Server Boost (Recommended)**\n` +
                `• Boost this server to get instant premium access\n` +
                `• Support the community while getting benefits\n` +
                `• Access lasts as long as you're boosting\n\n` +
                `**💳 Option 2: One-time Payment ($25)**\n` +
                `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                `• AI image generation (/imagegen, /editimage)\n` +
                `• Uncensored AI responses\n` +
                `• Lifetime access (no recurring fees)\n\n` +
                `**Future Features Coming Soon:**\n` +
                `• Uncensored AI Image generation\n` +
                `• Text-to-video generation\n` +
                `• Real-time AI voice chat\n` +
                `• And much more to come!\n\n` +
                `**How to Upgrade:**\n` +
                `• **Boost the server** for instant access\n` +
                `• Or use \`/payforai\` for one-time payment`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/demo-limit-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create demo usage warning embed
     * @param {string} commandName - Name of the command being used
     * @param {number} remaining - Number of demo uses remaining
     * @param {number} max - Maximum demo uses allowed
     * @returns {EmbedBuilder} - Discord embed for demo warning
     */
    createDemoWarningEmbed(commandName, remaining, max) {
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ Demo Usage Warning')
            .setDescription(
                `**${commandName}** is running in demo mode.\n\n` +
                `**Demo Usage:** ${max - remaining}/${max} prompts used\n` +
                `**Remaining:** ${remaining} free prompt${remaining === 1 ? '' : 's'}\n\n` +
                `**Get unlimited access in two ways:**\n\n` +
                `**🚀 Server Boost (Recommended)**\n` +
                `• Boost this server for instant premium access\n` +
                `• Support the community while getting benefits\n\n` +
                `**💳 One-time Payment ($25)**\n` +
                `• Use \`/payforai\` to get started\n` +
                `• Lifetime access to all AI features\n\n` +
                `*Enjoying the demo? Consider upgrading to support the bot!*`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/demo-warning-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Demo Mode' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create demo usage info embed
     * @param {string} commandName - Name of the command being used
     * @param {number} remaining - Number of demo uses remaining
     * @param {number} max - Maximum demo uses allowed
     * @returns {EmbedBuilder} - Discord embed for demo info
     */
    createDemoInfoEmbed(commandName, remaining, max) {
        const embed = new EmbedBuilder()
            .setColor(0x1e40af)
            .setTitle('🎯 Demo Mode Active')
            .setDescription(
                `**${commandName}** is running in demo mode.\n\n` +
                `**Demo Usage:** ${max - remaining}/${max} prompts used\n` +
                `**Remaining:** ${remaining} free prompt${remaining === 1 ? '' : 's'}\n\n` +
                `**Get unlimited access in two ways:**\n\n` +
                `**🚀 Server Boost (Recommended)**\n` +
                `• Boost this server for instant premium access\n` +
                `• Support the community while getting benefits\n\n` +
                `**💳 One-time Payment ($25)**\n` +
                `• Use \`/payforai\` to get started\n` +
                `• Lifetime access to all AI features\n\n` +
                `*Choose the option that works best for you!*`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/demo-info-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Demo Mode' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create upgrade prompt with buttons
     * @param {string} commandName - Name of the command that needs upgrade
     * @returns {Object} - { embed: EmbedBuilder, components: ActionRowBuilder[] }
     */
    createUpgradePrompt(commandName) {
        const embed = new EmbedBuilder()
            .setColor(0xff6b35)
            .setTitle('🔒 Upgrade Required')
            .setDescription(
                `**${commandName}** requires premium access.\n\n` +
                `**Get unlimited access in two ways:**\n\n` +
                `**🚀 Option 1: Server Boost (Recommended)**\n` +
                `• Boost this server to get instant premium access\n` +
                `• Support the community while getting benefits\n` +
                `• Access lasts as long as you're boosting\n\n` +
                `**💳 Option 2: One-time Payment ($25)**\n` +
                `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                `• AI image generation (/imagegen, /editimage)\n` +
                `• Uncensored AI responses\n` +
                `• Lifetime access (no recurring fees)\n\n` +
                `**Future Features Coming Soon:**\n` +
                `• Uncensored AI Image generation\n` +
                `• Text-to-video generation\n` +
                `• Real-time AI voice chat\n` +
                `• And much more to come!\n\n` +
                `**How to Upgrade:**\n` +
                `• **Boost the server** for instant access\n` +
                `• Or click "Pay Now" for one-time payment`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/upgrade-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('upgrade_premium')
                    .setLabel('💳 Pay Now')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('demo_info')
                    .setLabel('ℹ️ Demo Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        return { embed, components: [row] };
    }

    /**
     * Get demo usage statistics for a user
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} - Demo usage statistics
     */
    async getDemoStats(userId, guildId) {
        const demoUsage = await this.db.getDemoUsage(userId, guildId);
        return {
            used: demoUsage.used,
            max: demoUsage.max,
            remaining: demoUsage.max - demoUsage.used,
            firstUsed: demoUsage.firstUsed,
            lastUsed: demoUsage.lastUsed,
            commands: demoUsage.commands
        };
    }
}

module.exports = DemoUtils;
