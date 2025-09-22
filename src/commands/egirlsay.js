const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('egirlsay')
        .setDescription('Make the e-girl voice say your exact text (NSFW, flirty vibes)')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The exact text you want the e-girl to say')
                .setRequired(true)),
    
    async execute(interaction, bot) {
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
            const modelId = '3b3698528082474791f9dd22f024fd3c';
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
                { 
                    text, 
                    reference_id: modelId, 
                    format: 'mp3'
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
                .setColor(0xffb6c1)
                .setTitle('🌸 E-Girl Says...')
                .setDescription(`"${text}"`)
                .addFields({ name: 'Audio Generated', value: 'Using e-girl voice model (s1)', inline: false })
                .setThumbnail('https://r3dg0d.net/media/brave_Te8rLAyaYZ.png')
                .setFooter({ text: `Voice Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''} | Powered by Fish Audio` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [{ attachment: audioBuffer, name: 'egirlsay.mp3' }]
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

                    const audioFile = new File([audioBuffer], 'egirlsay.mp3', { type: 'audio/mpeg' });
                    const audioUrl = await fal.storage.upload(audioFile);
                    const videoResult = await fal.subscribe('veed/fabric-1.0', {
                        input: {
                            image_url: 'https://r3dg0d.net/media/tried-to-create-a-photorealistic-egirl-prompt-inside-v0-qmmnzcaxqmea1.webp',
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
                            .setTitle('🎬 E-Girl - Lipsync Video')
                            .setDescription('AI lipsync video using fal.ai veed/fabric-1.0')
                            .addFields(
                                { name: 'Image Source', value: 'E-girl reference image', inline: true },
                                { name: 'Audio Source', value: `Fish Audio TTS (Model: ${modelId})`, inline: true }
                            )
                            .setFooter({ text: 'Powered by fal.ai veed/fabric-1.0' })
                            .setTimestamp();

                        await interaction.followUp({
                            embeds: [videoEmbed],
                            files: [{ attachment: videoBuffer, name: 'egirl_lipsync.mp4' }]
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
            console.error('Error in egirlsay command:', error);
            await interaction.editReply({ content: '❌ Something went wrong generating the voice. Try again soon! 🌸' });
        }
    }
};


