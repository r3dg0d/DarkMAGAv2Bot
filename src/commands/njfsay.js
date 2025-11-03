const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('njfsay')
		.setDescription('Make Nicholas J. Fuentes (NJF) say your text with TTS and optional lipsync video')
		.addStringOption(option =>
			option.setName('text')
				.setDescription('The exact text you want NJF to say')
				.setRequired(true)),

    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('njfsay', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('njfsay');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('njfsay');
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
			return interaction.editReply({ content: '❌ Fish Audio API key is not configured on the host.' });
		}

		try {
			// Post-process text with emotion detection using Uncensored.AI
			const processedText = await addEmotionTags(text);
			
			// FishAudio TTS using NJF model
			const modelId = 'df3cfdc9b9dd42e9a0f589569f598263';
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
					text: processedText, 
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
				.setColor(0x8a2be2)
				.setTitle('🎙️ NJF Says...')
				.setDescription(`"${text}"`)
				.addFields(
					{ name: 'Voice Model', value: `FishAudio s1${modelTitle ? ` – ${modelTitle}` : ''}`, inline: false },
					processedText !== text ? { name: 'Emotion Enhanced', value: `"${processedText}"`, inline: false } : null
				)
				.setThumbnail('https://r3dg0d.net/media/Nick%20Fuentes%20article%20cover%20photo%20from%20Rumble%2004.03.25.jpg')
				.setFooter({ text: `NJF Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''} | Powered by Fish Audio` })
				.setTimestamp();

			            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'njfsay');
                
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
				files: [{ attachment: audioBuffer, name: 'njfsay.mp3' }]
			});

			// Optional lipsync video via fal.ai
			const falApiKey = process.env.FAL_KEY;
			if (!falApiKey) {
				try {
					const info = new EmbedBuilder()
						.setColor(0x87cefa)
						.setTitle('🎬 Lipsync Video Unavailable')
						.setDescription('Set `FAL_KEY` on the host to enable lipsync video generation.')
						.setTimestamp();
					await interaction.followUp({ embeds: [info] });
				} catch (_) {}
				return;
			}

			try {
				fal.config({ credentials: falApiKey });

				// Show generating message
				const generatingEmbed = new EmbedBuilder()
					.setColor(0xffa500)
					.setTitle('🎬 Generating Lipsync Video...')
					.setDescription('Creating AI lipsync video using fal.ai veed/fabric-1.0 model')
					.setTimestamp();
				const generatingMessage = await interaction.followUp({ embeds: [generatingEmbed] });

				const audioFile = new File([audioBuffer], 'njfsay.mp3', { type: 'audio/mpeg' });
				const audioUrl = await fal.storage.upload(audioFile);

				const videoResult = await fal.subscribe('veed/fabric-1.0', {
					input: {
						image_url: 'https://r3dg0d.net/media/Nick%20Fuentes%20article%20cover%20photo%20from%20Rumble%2004.03.25.jpg',
						audio_url: audioUrl,
						resolution: '480p'
					},
					logs: true,
					onQueueUpdate: (u) => { 
						if (u.status === 'IN_PROGRESS') { 
							u.logs.map(l => l.message).forEach(console.log);
							// Update the generating message with progress
							try {
								const progressEmbed = new EmbedBuilder()
									.setColor(0xffa500)
									.setTitle('🎬 Generating Lipsync Video...')
									.setDescription(`Creating AI lipsync video using fal.ai veed/fabric-1.0 model\n\n**Progress:** ${u.logs.map(l => l.message).join('\n')}`)
									.setTimestamp();
								generatingMessage.edit({ embeds: [progressEmbed] });
							} catch (editError) {
								console.error('Failed to update progress message:', editError);
							}
						} 
					}
				});
				console.log('Video generation completed:', videoResult.data?.video?.url ? 'Success' : 'Failed');

				if (videoResult.data?.video?.url) {
					// Download the video file from the URL
					const videoResponse = await axios.get(videoResult.data.video.url, { responseType: 'arraybuffer' });
					const videoBuffer = Buffer.from(videoResponse.data);

					const vEmbed = new EmbedBuilder()
						.setColor(0x8a2be2)
						.setTitle('🎬 NJF - Lipsync Video')
						.setDescription('AI lipsync video using fal.ai veed/fabric-1.0')
						.addFields(
							{ name: 'Image Source', value: 'Nicholas J. Fuentes reference image', inline: true },
							{ name: 'Audio Source', value: `Fish Audio TTS (Model: ${modelId})`, inline: true }
						)
						.setFooter({ text: 'Powered by fal.ai veed/fabric-1.0', iconURL: 'https://registry.npmmirror.com/@lobehub/icons-static-png/1.68.0/files/dark/fal-color.png' })
						.setTimestamp();

					await interaction.followUp({
						embeds: [vEmbed],
						files: [{ attachment: videoBuffer, name: 'njf_lipsync.mp4' }]
					});
				}
			} catch (lipErr) {
				console.error('Lipsync generation error:', lipErr?.response?.data || lipErr.message);
				
				// Try to update the generating message with error info
				try {
					const failEmbed = new EmbedBuilder()
						.setColor(0xff0000)
						.setTitle('🎬 Lipsync Video Failed')
						.setDescription(`Could not generate lipsync video: ${lipErr?.message || 'Unknown error'}\n\nThe audio is still available above.`)
						.addFields({ name: 'Error Details', value: lipErr?.response?.data ? JSON.stringify(lipErr.response.data) : 'No additional details', inline: false })
						.setTimestamp();
					await generatingMessage.edit({ embeds: [failEmbed] });
				} catch (editError) {
					console.error('Failed to update error message:', editError);
					try {
						const fail = new EmbedBuilder()
							.setColor(0xff0000)
							.setTitle('🎬 Lipsync Video Failed')
							.setDescription('Could not generate lipsync video right now. The audio is still available above.')
							.setTimestamp();
						await interaction.followUp({ embeds: [fail] });
					} catch (_) {}
				}
			}
		} catch (err) {
			console.error('Error in njfsay:', err?.response?.data || err.message);
			
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'njfsay');
                
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

            await interaction.editReply({ content: '❌ Something went wrong generating NJF\'s voice.' });
		}
	}
};


