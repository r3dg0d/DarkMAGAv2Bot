const DemoUtils = require('./demoUtils');
const PaymentUtils = require('./paymentUtils');

/**
 * Helper function to check AI usage and handle demo/premium logic
 * @param {Object} interaction - Discord interaction object
 * @param {string} commandName - Name of the command being executed
 * @returns {Promise<Object>} - { canProceed: boolean, isDemo: boolean, remaining: number, response?: Object }
 */
async function checkAIUsage(interaction, commandName) {
    const demoUtils = new DemoUtils();
    const paymentUtils = new PaymentUtils();
    
    // Check if user can use AI command (paid or has demo uses left)
    const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
    
    if (!usageCheck.canUse) {
        if (usageCheck.reason === 'Demo limit reached') {
            const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
            const limitEmbed = demoUtils.createDemoLimitEmbed(commandName, demoUsage.used, demoUsage.max);
            const upgradePrompt = demoUtils.createUpgradePrompt(commandName);
            
            return {
                canProceed: false,
                isDemo: false,
                remaining: 0,
                response: {
                    embeds: [limitEmbed],
                    components: upgradePrompt.components,
                    ephemeral: true
                }
            };
        } else {
            const paymentEmbed = paymentUtils.createPaymentPrompt(commandName);
            return {
                canProceed: false,
                isDemo: false,
                remaining: 0,
                response: {
                    embeds: [paymentEmbed],
                    ephemeral: true
                }
            };
        }
    }

    return {
        canProceed: true,
        isDemo: usageCheck.isDemo,
        remaining: usageCheck.remaining
    };
}

/**
 * Helper function to track demo usage after successful command execution
 * @param {Object} interaction - Discord interaction object
 * @param {string} commandName - Name of the command that was executed
 * @param {boolean} isDemo - Whether this was a demo usage
 * @param {Object} embeds - Array of embeds to potentially modify
 * @param {number} remaining - Number of remaining demo uses
 * @returns {Promise<void>}
 */
async function trackDemoUsage(interaction, commandName, isDemo, embeds, remaining) {
    if (isDemo) {
        const demoUtils = new DemoUtils();
        await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, commandName);
        
        // Add demo warning to the first embed
        if (embeds && embeds.length > 0) {
            const firstEmbed = embeds[0];
            const newRemaining = remaining - 1; // Subtract 1 since we just used it
            
            if (newRemaining > 0) {
                firstEmbed.addFields({
                    name: '🎯 Demo Mode',
                    value: `**${newRemaining}** free prompt${newRemaining === 1 ? '' : 's'} remaining. Use \`/payforai\` to upgrade!`,
                    inline: false
                });
            }
        }
    }
}

module.exports = {
    checkAIUsage,
    trackDemoUsage
};
