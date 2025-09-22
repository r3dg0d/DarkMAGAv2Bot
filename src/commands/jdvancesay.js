const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jdvancesay')
        .setDescription('Make JD Vance say anything you want - literally anything!')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The exact text you want JD Vance to say')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        await interaction.deferReply(); // Defer to allow time for API call
        
        let text = interaction.options.getString('text');

        // Content filtering to avoid censored words that might break lipsync
        const badWords = [
            'nuke', 'nuclear', 'bomb', 'terrorism', 'terrorist', 'assassinate', 'assassination',
            'kill', 'murder', 'rape', 'genocide', 'holocaust', 'hitler', 'isis', 'taliban',
            'isis', 'al-qaeda', 'suicide', 'pedophile', 'child abuse', 'hate israel',
            'i hate israel', 'we need to nuke', 'blank nuke', 'fuck israel', 'hate jews'
        ];

        const containsBadWord = (input) => {
            const lowerInput = input.toLowerCase();
            return badWords.some(word => lowerInput.includes(word.toLowerCase()));
        };

        if (containsBadWord(text)) {
            // Try to sanitize the text by replacing bad words
            badWords.forEach(word => {
                text = text.replace(new RegExp(word, 'gi'), '[REDACTED]');
            });

            // If the text is now mostly redacted, provide a fallback
            if (text.replace(/\[REDACTED\]/g, '').trim().length < 10) {
                return interaction.editReply({
                    content: '❌ The requested text contains content that cannot be processed. Please try with different wording.',
                    embeds: []
                });
            }
        }

        // Check if Fish Audio API is available
        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ 
                content: '❌ Fish Audio API key is not configured. Please contact the bot administrator to enable voice features.' 
            });
        }

        try {
            // Generate MP3 via Fish Audio TTS using JD Vance model
            const modelId = '86d3aee7cd9b4aab8cd8e54c3d35492b';
            let modelTitle = null;
            let modelState = null;

            try {
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: {
                        'Authorization': `Bearer ${fishApiKey}`
                    }
                });
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
            } catch (modelErr) {
                console.error('Fish Audio get-model error:', modelErr?.response?.data || modelErr.message);
            }

            // Generate MP3 via Fish Audio TTS (OpenAPI v1)
            const ttsResponse = await axios.post(
                'https://api.fish.audio/v1/tts',
                {
                    text: text,
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
                .setColor(0x1e40af) // Blue for conservative theme
                .setTitle('🇺🇸 Senator JD Vance Says...')
                .setDescription(`"${text}"`)
                .addFields(
                    {
                        name: 'Audio Generated',
                        value: `Using JD Vance voice model (s1)`,
                        inline: false
                    }
                )
                .setThumbnail('https://pbs.twimg.com/profile_images/1817220042578173953/5r-Qpvgt_400x400.jpg')
                .setFooter({ 
                    text: `JD Vance Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''} | Powered by Fish Audio` 
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [
                    { attachment: audioBuffer, name: 'jdvancesay.mp3' }
                ]
            });

            // Attempt to generate lipsync video
            const falApiKey = process.env.FAL_KEY;
            if (!falApiKey) {
                try {
                    const infoEmbed = new EmbedBuilder()
                        .setColor(0x87cefa)
                        .setTitle('🎬 Lipsync Video Unavailable')
                        .setDescription('Video generation is not configured. Set `FAL_KEY` on the host to enable lipsync video features.')
                        .setTimestamp();
                    await interaction.followUp({ embeds: [infoEmbed] });
                } catch (_) { /* ignore follow-up errors */ }
            } else {
                try {
                    // Set FAL API key
                    fal.config({ credentials: falApiKey });

                    // Show generating message
                    const generatingEmbed = new EmbedBuilder()
                        .setColor(0xffa500)
                        .setTitle('🎬 Generating Lipsync Video...')
                        .setDescription('Creating AI lipsync video using fal.ai veed/fabric-1.0 model')
                        .setTimestamp();
                    const generatingMessage = await interaction.followUp({ embeds: [generatingEmbed] });

                    // Upload audio to fal.ai storage
                    const audioFile = new File([audioBuffer], 'jdvancesay.mp3', { type: 'audio/mpeg' });
                    const audioUrl = await fal.storage.upload(audioFile);

                    // Generate lipsync video using veed/fabric-1.0
                    const videoResult = await fal.subscribe("veed/fabric-1.0", {
                        input: {
                            image_url: "https://pbs.twimg.com/profile_images/1817220042578173953/5r-Qpvgt_400x400.jpg",
                            audio_url: audioUrl,
                            resolution: "480p"
                        },
                        logs: true,
                        onQueueUpdate: (update) => {
                            if (update.status === "IN_PROGRESS") {
                                update.logs.map((log) => log.message).forEach(console.log);
                                // Update the generating message with progress
                                try {
                                    const progressEmbed = new EmbedBuilder()
                                        .setColor(0xffa500)
                                        .setTitle('🎬 Generating Lipsync Video...')
                                        .setDescription(`Creating AI lipsync video using fal.ai veed/fabric-1.0 model\n\n**Progress:** ${update.logs.map((log) => log.message).join('\n')}`)
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
                            .setColor(0xff6b35)
                            .setTitle('🎬 Vice President JD Vance - Lipsync Video')
                            .setDescription('AI lipsync video using fal.ai veed/fabric-1.0')
                            .addFields(
                                { name: 'Image Source', value: 'JD Vance profile image', inline: true },
                                { name: 'Audio Source', value: `Fish Audio TTS (Model: ${modelId})`, inline: true }
                            )
                            .setFooter({ text: 'Powered by fal.ai veed/fabric-1.0' })
                            .setTimestamp();

                        await interaction.followUp({
                            embeds: [videoEmbed],
                            files: [{ attachment: videoBuffer, name: 'jdvance_lipsync.mp4' }]
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
            console.error('Error in jdvancesay command:', error);
            
            // Try to provide more specific error information
            let errorMessage = '❌ Something went wrong generating JD\'s voice!';
            
            if (error.response?.data) {
                console.error('Fish Audio API Error:', error.response.data);
                if (error.response.data.error) {
                    errorMessage += `\n\nAPI Error: ${error.response.data.error}`;
                }
            }
            
            await interaction.editReply({ content: errorMessage });
        }
    }
};
