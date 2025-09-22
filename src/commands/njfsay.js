const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('njfsay')
		.setDescription('Make Nicholas J. Fuentes (NJF) say your text with TTS and optional lipsync video')
		.addStringOption(option =>
			option.setName('text')
				.setDescription('The exact text you want NJF to say')
				.setRequired(true)),

	async execute(interaction) {
		await interaction.deferReply();

		let text = interaction.options.getString('text');

		// Basic content filter to avoid API rejections; redact rather than fail where possible
		const blocked = [
			'nuke', 'nuclear', 'bomb', 'terrorism', 'terrorist', 'assassinate', 'assassination',
			'kill', 'murder', 'rape', 'genocide', 'suicide'
		];
		const containsBlocked = (input) => {
			const lower = (input || '').toLowerCase();
			return blocked.some(w => lower.includes(w));
		};
		if (containsBlocked(text)) {
			blocked.forEach(w => {
				text = text.replace(new RegExp(w, 'gi'), '[REDACTED]');
			});
			if (text.replace(/\[REDACTED\]/g, '').trim().length < 10) {
				return interaction.editReply({ content: '❌ The requested text cannot be processed. Please try different wording.' });
			}
		}

		const fishApiKey = process.env.FISHAUDIO_API;
		if (!fishApiKey) {
			return interaction.editReply({ content: '❌ Fish Audio API key is not configured on the host.' });
		}

		try {
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
					text, 
					reference_id: modelId, 
					format: 'mp3',
					temperature: 0.7,
					top_p: 0.7,
					chunk_length: 200,
					normalize: true,
					latency: 'normal'
				},
				{
					headers: {
						'Authorization': `Bearer ${fishApiKey}`,
						'Content-Type': 'application/json'
					},
					responseType: 'arraybuffer'
				}
			);

			const audioBuffer = Buffer.from(ttsResponse.data);

			const embed = new EmbedBuilder()
				.setColor(0x8a2be2)
				.setTitle('🎙️ NJF Says...')
				.setDescription(`"${text}"`)
				.addFields({ name: 'Voice Model', value: `FishAudio s1${modelTitle ? ` – ${modelTitle}` : ''}`, inline: false })
				.setThumbnail('https://r3dg0d.net/media/Nick%20Fuentes%20article%20cover%20photo%20from%20Rumble%2004.03.25.jpg')
				.setFooter({ text: `NJF Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''} | Powered by Fish Audio` })
				.setTimestamp();

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
						.setFooter({ text: 'Powered by fal.ai veed/fabric-1.0' })
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
			await interaction.editReply({ content: '❌ Something went wrong generating NJF\'s voice.' });
		}
	}
};


