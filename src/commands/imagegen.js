const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagegen')
        .setDescription('Generate an image from a prompt using FLUX Kontext Max.')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('The prompt to generate the image from.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('aspect_ratio')
                .setDescription('Desired aspect ratio for the image.')
                .setRequired(false)
                .addChoices(
                    { name: 'Square (1:1)', value: '1:1' },
                    { name: 'Portrait (9:16)', value: '9:16' },
                    { name: 'Landscape (16:9)', value: '16:9' },
                    { name: 'Portrait (2:3)', value: '2:3' },
                    { name: 'Landscape (3:2)', value: '3:2' },
                    { name: 'Portrait (4:5)', value: '4:5' },
                    { name: 'Landscape (5:4)', value: '5:4' },
                    { name: 'Ultrawide Landscape (21:9)', value: '21:9' },
                    { name: 'Ultrawide Portrait (9:21)', value: '9:21' }
                ))
        .addIntegerOption(option =>
            option.setName('seed')
                .setDescription('A specific seed for reproducibility (optional).')
                .setRequired(false)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('imagegen', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('imagegen');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('imagegen');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        const prompt = interaction.options.getString('prompt');
        const aspectRatio = interaction.options.getString('aspect_ratio');
        const seed = interaction.options.getInteger('seed');

        if (!config.fluxApiKey) {
            await interaction.reply({ 
                content: 'Image generation is not configured. Please set the FLUX_API_KEY environment variable.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Prepare the request payload for Flux Kontext Max
            const payload = {
                prompt: prompt,
                output_format: "png",
                prompt_upsampling: false,
                safety_tolerance: 2
            };

            // Only include aspect_ratio if provided
            if (aspectRatio) {
                payload.aspect_ratio = aspectRatio;
            }

            if (seed) {
                payload.seed = seed;
            }

            // Make the API request to Flux Kontext Max
            const response = await axios.post(
                `${config.fluxApiUrl}/flux-kontext-max`,
                payload,
                {
                    headers: {
                        'x-key': config.fluxApiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.polling_url) {
                // Poll for the result using improved logic
                const result = await pollForImageResult(
                    interaction,
                    response.data.polling_url,
                    config.fluxApiKey,
                    prompt,
                    aspectRatio,
                    seed
                );
                if (result.success) {
                    // Track demo usage if this is a demo user
                    if (usageCheck.isDemo) {
                        await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'imagegen');
                        
                        // Add demo warning to the embed if it exists
                        if (result.replyOptions.embeds && result.replyOptions.embeds.length > 0) {
                            const firstEmbed = result.replyOptions.embeds[0];
                            const remaining = usageCheck.remaining - 1; // Subtract 1 since we just used it
                            
                            if (remaining > 0) {
                                firstEmbed.addFields({
                                    name: '🎯 Demo Mode',
                                    value: `**${remaining}** free prompt${remaining === 1 ? '' : 's'} remaining. Use \`/payforai\` to upgrade!`,
                                    inline: false
                                });
                            }
                        }
                    }
                    
                    try {
                        await interaction.editReply(result.replyOptions);
                    } catch (error) {
                        if (error.code === 10008) {
                            // Interaction expired, send as followUp
                            await interaction.followUp(result.replyOptions);
                        } else {
                            throw error;
                        }
                    }
                } else {
                    try {
                        await interaction.editReply({ 
                            content: result.error || 'Failed to generate image. Please try again.', 
                            ephemeral: true 
                        });
                    } catch (error) {
                        if (error.code === 10008) {
                            // Interaction expired, send as followUp
                            await interaction.followUp({ 
                                content: result.error || 'Failed to generate image. Please try again.', 
                                ephemeral: true 
                            });
                        } else {
                            throw error;
                        }
                    }
                }
            } else {
                try {
                    await interaction.editReply({ 
                        content: 'Failed to start image generation. Please try again.', 
                        ephemeral: true 
                    });
                } catch (error) {
                    if (error.code === 10008) {
                        await interaction.followUp({ 
                            content: 'Failed to start image generation. Please try again.', 
                            ephemeral: true 
                        });
                    } else {
                        throw error;
                    }
                }
            }

        } catch (error) {
            console.error('Error generating image:', error);
            try {
                await interaction.editReply({ 
                    content: 'An error occurred while generating the image. Please try again.', 
                    ephemeral: true 
                });
            } catch (editError) {
                if (editError.code === 10008) {
                    await interaction.followUp({ 
                        content: 'An error occurred while generating the image. Please try again.', 
                        ephemeral: true 
                    });
                } else {
                    console.error('Error sending error message:', editError);
                }
            }
        }
    },
};

// --- Polling logic similar to bot.py ---
async function pollForImageResult(interaction, pollingUrl, apiKey, prompt, aspectRatio, seed) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    const pollingInterval = 5000;
    let attempts = 0;
    let lastProgress = null;

    let statusMessage;
    try {
        statusMessage = await interaction.followUp({
            content: '🎨 **Generating image...** (0%)\n\nThis may take a few moments. Please wait...',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error sending initial status message:', error);
        return { success: false, error: 'Failed to send status message.' };
    }

    while (attempts < maxAttempts) {
        try {
            const response = await axios.get(pollingUrl, {
                headers: {
                    'x-key': apiKey
                }
            });
            const data = response.data;
            
            // Handle retry_after if provided
            if (data.retry_after) {
                await new Promise(resolve => setTimeout(resolve, data.retry_after * 1000));
                continue;
            }
            
            if (data.status === 'Ready' && data.result && data.result.sample) {
                // Download the image
                let imageBuffer = null;
                let fileName = 'generated_image.png';
                try {
                    const imgResp = await axios.get(data.result.sample, { responseType: 'arraybuffer' });
                    imageBuffer = Buffer.from(imgResp.data, 'binary');
                } catch (e) {
                    return { success: false, error: 'Failed to download generated image.' };
                }
                
                // Build embed
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🎨 Generated Image')
                    .setDescription(`**Prompt:**\n>>> ${prompt}`)
                    .setImage('attachment://' + fileName)
                    .addFields(
                        { name: 'Aspect Ratio', value: aspectRatio || 'Default', inline: true },
                        { name: 'Seed', value: (data.result.seed || seed || 'N/A').toString(), inline: true }
                    )
                    .setFooter({ text: 'Generated with FLUX Kontext Max' })
                    .setTimestamp();
                
                // Clean up status message if possible
                try { 
                    if (statusMessage) await statusMessage.delete(); 
                } catch (deleteError) {
                    // Message might already be deleted, ignore
                }
                
                const attachment = new AttachmentBuilder(imageBuffer, { name: fileName });
                return {
                    success: true,
                    replyOptions: {
                        embeds: [embed],
                        files: [attachment]
                    }
                };
            } else if (data.status === 'Failed') {
                return { success: false, error: 'Image generation failed. Please try again.' };
            } else if (data.status === 'Processing') {
                // Update progress if available
                if (data.progress && data.progress !== lastProgress) {
                    lastProgress = data.progress;
                    try {
                        await statusMessage.edit({
                            content: `🎨 **Generating image...** (${Math.round(data.progress * 100)}%)\n\nThis may take a few moments. Please wait...`
                        });
                    } catch (editError) {
                        // Ignore edit errors
                    }
                }
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollingInterval));
            attempts++;
            
        } catch (error) {
            console.error('Error polling for image result:', error);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, pollingInterval));
        }
    }
    
    // Clean up status message if possible
    try { 
        if (statusMessage) await statusMessage.delete(); 
    } catch (deleteError) {
        // Message might already be deleted, ignore
    }
    
    return { success: false, error: 'Image generation timed out. Please try again.' };
} 