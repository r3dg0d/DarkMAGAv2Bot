const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joerogansay')
        .setDescription('Make Joe Rogan say your exact text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The exact text you want Joe to say')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('joerogansay', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('joerogansay');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('joerogansay');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        await interaction.deferReply();
        
        let text = interaction.options.getString('text');

        // Check character limit
        if (text.length > 75) {
            return interaction.editReply({ content: '❌ Text is too long! Please keep it under 75 characters.' });
        }

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            // Post-process text with emotion detection using Uncensored.AI
            const processedText = await addEmotionTags(text);
            
            const modelId = 'fb4a066b73954c03b325409d1a8592f0';
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

            const ttsResponse = await axios.post(
                'https://api.fish.audio/v1/tts',
                { text: processedText, reference_id: modelId, format: 'mp3' },
                { headers: { 'Authorization': `Bearer ${fishApiKey}`, 'Content-Type': 'application/json', 'model': 's1' }, responseType: 'arraybuffer' }
            );
            const audioBuffer = Buffer.from(ttsResponse.data);

            const embed = new EmbedBuilder()
                .setColor(0x111827)
                .setTitle('🎙️ Joe Rogan Says...')
                .setDescription(`"${text}"`)
                .addFields(
                    { name: 'Audio Generated', value: 'Using Joe Rogan voice model (s1)', inline: false },
                    processedText !== text ? { name: 'Emotion Enhanced', value: `"${processedText}"`, inline: false } : null
                )
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/250px-Joe_Rogan.png')
                .setFooter({ text: `Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''} | Powered by Fish Audio` })
                .setTimestamp();

            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'joerogansay');
                
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
                files: [{ attachment: audioBuffer, name: 'joerogansay.mp3' }]
            });

            // Lipsync video
            const falApiKey = process.env.FAL_KEY;
            if (!falApiKey) {
                try {
                    const infoEmbed = new EmbedBuilder()
                        .setColor(0x87cefa)
                        .setTitle('🎬 Lipsync Video Unavailable')
                        .setDescription('Set `FAL_KEY` environment variable on the host to enable lipsync video features.')
                        .setTimestamp();
                    await interaction.followUp({ embeds: [infoEmbed] });
                } catch (_) {}
            } else {
                try {
                    // Notify user that lipsync video is being generated
                    const generatingEmbed = new EmbedBuilder()
                        .setColor(0xffa500)
                        .setTitle('🎬 Generating Lipsync Video...')
                        .setDescription('Please wait while we create the lipsync video. This may take a moment.')
                        .setTimestamp();
                    const generatingMessage = await interaction.followUp({ embeds: [generatingEmbed] });

                    // Configure fal.ai client
                    console.log('Configuring fal.ai client with API key:', falApiKey ? 'Present' : 'Missing');
                    fal.config({ credentials: falApiKey });
                    
                    // Upload audio file to fal.ai storage
                    console.log('Uploading audio file to fal.ai storage...');
                    const audioFile = new File([audioBuffer], 'joerogansay.mp3', { type: 'audio/mpeg' });
                    const audioUrl = await fal.storage.upload(audioFile);
                    console.log('Audio uploaded successfully, URL:', audioUrl);
                    
                    // Generate lipsync video with progress updates
                    console.log('Starting lipsync video generation...');
                    const videoResult = await fal.subscribe('veed/fabric-1.0', {
                        input: {
                            image_url: 'https://r3dg0d.net/media/Spotify_qvNazRw1B2.jpg',
                            audio_url: audioUrl,
                            resolution: '480p'
                        },
                        logs: true,
                        onQueueUpdate: async (update) => {
                            console.log('Queue update received:', update.status, update.logs?.length || 0, 'logs');
                            if (update.status === 'IN_PROGRESS' && update.logs) {
                                const logMessages = update.logs.map(l => l.message).join('\n');
                                console.log('Fal.ai Progress:', logMessages);
                                
                                // Update the Discord message with progress
                                try {
                                    const progressEmbed = new EmbedBuilder()
                                        .setColor(0xffa500)
                                        .setTitle('🎬 Generating Lipsync Video...')
                                        .setDescription(`Processing: ${logMessages}`)
                                        .setTimestamp();
                                    await generatingMessage.edit({ embeds: [progressEmbed] });
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
                            .setColor(0xff6b35)
                            .setTitle('🎬 Joe Rogan - Lipsync Video')
                            .setDescription('AI lipsync video using fal.ai veed/fabric-1.0')
                            .addFields(
                                { name: 'Image Source', value: 'Joe Rogan reference image', inline: true },
                                { name: 'Audio Source', value: 'Fish Audio TTS (s1)', inline: true }
                            )
                            .setFooter({ text: 'Powered by fal.ai veed/fabric-1.0', iconURL: 'https://registry.npmmirror.com/@lobehub/icons-static-png/1.68.0/files/dark/fal-color.png' })
                            .setTimestamp();

                        await interaction.followUp({
                            embeds: [videoEmbed],
                            files: [{ attachment: videoBuffer, name: 'joerogan_lipsync.mp4' }]
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
            console.error('Error in joerogansay command:', error);
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'joerogansay');
                
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

            await interaction.editReply({ content: '❌ Something went wrong generating the voice. Please try again later.' });
        }
    }
};


