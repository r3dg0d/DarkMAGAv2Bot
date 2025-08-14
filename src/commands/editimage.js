const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editimage')
        .setDescription('Edit an existing image with a prompt using FLUX Kontext Max.')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('The prompt to guide the image editing.')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('input_image')
                .setDescription('The image to edit.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('seed')
                .setDescription('A specific seed for reproducibility (optional).')
                .setRequired(false)),
    
    async execute(interaction, bot) {
        await interaction.deferReply();

        const prompt = interaction.options.getString('prompt');
        const inputImage = interaction.options.getAttachment('input_image');
        const seed = interaction.options.getInteger('seed');

        // Validate image
        if (!inputImage || !inputImage.contentType || !inputImage.contentType.startsWith('image/')) {
            return await interaction.editReply({
                content: '❌ **Error:** Please upload a valid image file.',
                ephemeral: true
            });
        }

        // Check image size (20MB limit)
        if (inputImage.size > 20 * 1024 * 1024) {
            return await interaction.editReply({
                content: '❌ **Error:** Image file is too large. Please use an image smaller than 20MB.',
                ephemeral: true
            });
        }

        try {
            // Download the image and convert to base64
            let imageBase64;
            try {
                const imageResponse = await axios.get(inputImage.url, { responseType: 'arraybuffer' });
                imageBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
            } catch (downloadError) {
                console.error('Error downloading image:', downloadError);
                return await interaction.editReply({
                    content: '❌ **Error:** Failed to download the uploaded image. Please try again.',
                    ephemeral: true
                });
            }

            // Prepare the payload for image editing
            const payload = {
                prompt: prompt,
                input_image: imageBase64,
                output_format: "png",
                safety_tolerance: 2
            };

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
                    seed,
                    inputImage.url
                );
                if (result.success) {
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
                            content: result.error || 'Failed to edit image. Please try again.', 
                            ephemeral: true 
                        });
                    } catch (error) {
                        if (error.code === 10008) {
                            // Interaction expired, send as followUp
                            await interaction.followUp({ 
                                content: result.error || 'Failed to edit image. Please try again.', 
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
                        content: 'Failed to start image editing. Please try again.', 
                        ephemeral: true 
                    });
                } catch (error) {
                    if (error.code === 10008) {
                        await interaction.followUp({ 
                            content: 'Failed to start image editing. Please try again.', 
                            ephemeral: true 
                        });
                    } else {
                        throw error;
                    }
                }
            }

        } catch (error) {
            console.error('Error editing image:', error);
            try {
                await interaction.editReply({ 
                    content: 'An error occurred while editing the image. Please try again.', 
                    ephemeral: true 
                });
            } catch (editError) {
                if (editError.code === 10008) {
                    await interaction.followUp({ 
                        content: 'An error occurred while editing the image. Please try again.', 
                        ephemeral: true 
                    });
                } else {
                    console.error('Error sending error message:', editError);
                }
            }
        }
    },
};

// Polling logic similar to bot.py and imagegen.js
async function pollForImageResult(interaction, pollingUrl, apiKey, prompt, seed, originalImageUrl) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    const pollingInterval = 5000;
    let attempts = 0;
    let lastProgress = null;

    // Send initial status message
    let statusMsg = null;
    try {
        statusMsg = await interaction.followUp({
            content: '⏳ Editing image... (this may take up to 5 minutes)',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error sending initial status message:', error);
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
                let fileName = 'edited_image.png';
                try {
                    const imgResp = await axios.get(data.result.sample, { responseType: 'arraybuffer' });
                    imageBuffer = Buffer.from(imgResp.data, 'binary');
                } catch (e) {
                    return { success: false, error: 'Failed to download edited image.' };
                }
                // Build embed
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🎨 Image Edited')
                    .setDescription(`**Prompt:**\n>>> ${prompt}`)
                    .setImage('attachment://' + fileName)
                    .addFields(
                        { name: 'Original Image', value: `[View Original](${originalImageUrl})`, inline: true },
                        { name: 'Seed', value: (data.result.seed || seed || 'N/A').toString(), inline: true }
                    )
                    .setFooter({ text: 'Edited with FLUX Kontext Max' })
                    .setTimestamp();
                
                // Clean up status message if possible
                try { 
                    if (statusMsg) await statusMsg.delete(); 
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
                return { success: false, error: 'Image editing failed. Please try again.' };
            } else if (data.status === 'Processing') {
                // Update progress if available
                if (data.progress && data.progress !== lastProgress) {
                    lastProgress = data.progress;
                    try {
                        await statusMsg.edit({
                            content: `⏳ Editing image... (${Math.round(data.progress * 100)}%)`
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
        if (statusMsg) await statusMsg.delete(); 
    } catch (deleteError) {
        // Message might already be deleted, ignore
    }
    
    return { success: false, error: 'Image editing timed out. Please try again.' };
} 