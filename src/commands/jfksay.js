const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jfksay')
        .setDescription('Make JFK voice say your exact text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The exact text you want JFK to say')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('jfksay', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('jfksay');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('jfksay');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        // Check role restriction
        const requiredRoleId = '1388307681101611128';
        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({ 
                content: '❌ You don\'t have permission to use this command. This command is restricted to specific roles only.', 
                ephemeral: true 
            });
        }

        // Channel restriction removed to allow usage in all channels

        await interaction.deferReply();
        
        let text = interaction.options.getString('text');

        // Check character limit
        if (text.length > 75) {
            return interaction.editReply({ content: '❌ Text is too long! Please keep it under 75 characters.' });
        }

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key not configured. Ask the admin to set `FISHAUDIO_API`.' });
        }

        try {
            const modelId = '813406193997427f9c19524ec9eb7328';
            let modelTitle = null;
            let modelState = null;
            try {
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
            } catch (modelErr) {
                console.error('Fish Audio get-model error:', modelErr?.response?.data || modelErr.message);
            }

            // Post-process text with emotion detection for audio generation
            console.log(`[jfksay] Original text for TTS: "${text}"`);
            const emotionResult = await addEmotionTags(text);
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[jfksay] Processed text for TTS: "${processedText}"`);
            console.log(`[jfksay] Display text with emotions: "${displayText}"`);
            console.log(`[jfksay] TTS parameters:`, ttsParams);
            console.log(`[jfksay] Text changed: ${displayText !== text}`);

            const ttsResponse = await axios.post(
                'https://api.fish.audio/v1/tts',
                { 
                    text: processedText, 
                    reference_id: modelId, 
                    format: 'mp3',
                    temperature: ttsParams.temperature,
                    top_p: ttsParams.top_p,
                    chunk_length: ttsParams.chunk_length,
                    normalize: true,
                    latency: 'normal'
                },
                { 
                    headers: { 
                        'Authorization': `Bearer ${fishApiKey}`, 
                        'Content-Type': 'application/json',
                        'model': 's1'
                    }, 
                    responseType: 'arraybuffer' 
                }
            );
            const audioBuffer = Buffer.from(ttsResponse.data);

            const embed = new EmbedBuilder()
                .setColor(0x1e3a8a)
                .setTitle('🇺🇸 JFK Says...')
                .setDescription(`"${text}"`)
                .addFields({ name: 'Audio Generated', value: 'Using JFK voice model (s1)', inline: false });

            // Only add emotion enhanced field if text was actually changed
            if (displayText !== text) {
                // Truncate display text to fit Discord's 1024 character limit
                const truncatedDisplayText = displayText.length > 1000 ? 
                    displayText.substring(0, 1000) + '...' : 
                    displayText;
                
                embed.addFields({
                    name: 'Emotion Enhanced',
                    value: `"${truncatedDisplayText}"`,
                    inline: false
                });
            }

            embed
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/c/c3/John_F._Kennedy%2C_White_House_color_photo_portrait.jpg')
                .setFooter({ text: `Voice Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''} | Powered by Fish Audio` })
                .setTimestamp();

                        // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'jfksay');
                
                // Add demo warning to the embed
                const remaining = usageCheck.remaining - 1; // Subtract 1 since we just used it
                
                if (remaining > 0) {
                    embed.addFields({
                        name: '🎯 Demo Mode',
                        value: `**${remaining}** free prompt${remaining === 1 ? '' : 's'} remaining. Use \`/payforai\` to upgrade!`,
                        inline: false
                    });
                }
            }

            await interaction.editReply({
                embeds: [embed],
                files: [{ attachment: audioBuffer, name: 'jfksay.mp3' }]
            });

            // Lipsync
            const falApiKey = process.env.FAL_KEY;
            if (!falApiKey) {
                try {
                    const infoEmbed = new EmbedBuilder()
                        .setColor(0x87cefa)
                        .setTitle('🎬 Lipsync Video Unavailable')
                        .setDescription('Set `FAL_KEY` on the host to enable lipsync video features.')
                        .setTimestamp();
                    await interaction.followUp({ embeds: [infoEmbed] });
                } catch (_) {}
            } else {
                try {
                    fal.config({ credentials: falApiKey });

                    // Show generating message
                    const generatingEmbed = new EmbedBuilder()
                        .setColor(0xffa500)
                        .setTitle('🎬 Generating Lipsync Video...')
                        .setDescription('Creating AI lipsync video using fal.ai veed/fabric-1.0 model')
                        .setTimestamp();
                    const generatingMessage = await interaction.followUp({ embeds: [generatingEmbed] });

                    const audioFile = new File([audioBuffer], 'jfksay.mp3', { type: 'audio/mpeg' });
                    const audioUrl = await fal.storage.upload(audioFile);
                    const videoResult = await fal.subscribe('veed/fabric-1.0', {
                        input: {
                            image_url: 'https://static.life.com/wp-content/uploads/migrated/2013/10/131030-jfk-1947-senator-01.jpg',
                            audio_url: audioUrl,
                            resolution: '480p'
                        },
                        logs: true,
                        onQueueUpdate: (update) => {
                            if (update.status === 'IN_PROGRESS') {
                                update.logs.map(l => l.message).forEach(console.log);
                                // Update the generating message with progress
                                try {
                                    const progressEmbed = new EmbedBuilder()
                                        .setColor(0xffa500)
                                        .setTitle('🎬 Generating Lipsync Video...')
                                        .setDescription(`Creating AI lipsync video using fal.ai veed/fabric-1.0 model\n\n**Progress:** ${update.logs.map(l => l.message).join('\n')}`)
                                        .setTimestamp();
                                    generatingMessage.edit({ embeds: [progressEmbed] });
                                } catch (editError) {
                                    console.error('Failed to update progress message:', editError);
                                }
                            }
                        },
                    });
                    console.log('Video generation completed:', videoResult.data?.video?.url ? 'Success' : 'Failed');

                    if (videoResult.data?.video?.url) {
                        // Download the video file from the URL
                        const videoResponse = await axios.get(videoResult.data.video.url, { responseType: 'arraybuffer' });
                        const videoBuffer = Buffer.from(videoResponse.data);

                        const videoEmbed = new EmbedBuilder()
                            .setColor(0xff8fab)
                            .setTitle('🎬 JFK - Lipsync Video')
                            .setDescription('AI lipsync video using fal.ai veed/fabric-1.0')
                            .addFields(
                                { name: 'Image Source', value: 'JFK reference image', inline: true },
                                { name: 'Audio Source', value: `Fish Audio TTS (Model: ${modelId})`, inline: true }
                            )
                            .setFooter({ text: 'Powered by fal.ai veed/fabric-1.0', iconURL: 'https://registry.npmmirror.com/@lobehub/icons-static-png/1.68.0/files/dark/fal-color.png' })
                            .setTimestamp();

                        await interaction.followUp({
                            embeds: [videoEmbed],
                            files: [{ attachment: videoBuffer, name: 'jfk_lipsync.mp4' }]
                        });
                    }
                } catch (lipsyncError) {
                    console.error('Lipsync video generation error:', lipsyncError?.response?.data || lipsyncError.message);
                    
                    // Try to update the generating message with error info
                    try {
                        const failEmbed = new EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('🎬 Lipsync Video Failed')
                            .setDescription(`Could not generate lipsync video: ${lipsyncError?.message || 'Unknown error'}\n\nThe audio is still available above.`)
                            .addFields({ name: 'Error Details', value: lipsyncError?.response?.data ? JSON.stringify(lipsyncError.response.data) : 'No additional details', inline: false })
                            .setTimestamp();
                        await generatingMessage.edit({ embeds: [failEmbed] });
                    } catch (editError) {
                        console.error('Failed to update error message:', editError);
                        try {
                            const failEmbed = new EmbedBuilder()
                                .setColor(0xff0000)
                                .setTitle('🎬 Lipsync Video Failed')
                                .setDescription('Could not generate lipsync video right now. The audio is still available above.')
                                .setTimestamp();
                            await interaction.followUp({ embeds: [failEmbed] });
                        } catch (_) {}
                    }
                }
            }

        } catch (error) {
            console.error('Error in jfksay command:', error);
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'jfksay');
                
                // Add demo warning to the first embed
                if (embeds && embeds.length > 0) {
                    const firstEmbed = embeds[0];
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

            await interaction.editReply({ content: '❌ Something went wrong generating the voice. Ask not what your country can do for you 🇺🇸' });
        }
    }
};
