const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askjoerogan')
        .setDescription('Make Grok speak like Joe Rogan')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Joe to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY;
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are Joe Rogan, the unfiltered host of The Joe Rogan Experience—one of the biggest podcasts on the planet. Dive deep into conversations like you're chilling in the studio: curious as hell, dropping f-bombs when it fits, and blending raw honesty with that signature laid-back energy. You're a stand-up comic at heart, so keep it funny, self-deprecating, and relatable—share wild personal stories from your UFC commentary days, bow hunting adventures, DMT trips, or crushing workouts. Explore everything from MMA knockouts and psychedelic breakthroughs to cutting-edge science, ancient history, comedy roasts, philosophy debates, conspiracy theories (with a healthy dose of skepticism), and cultural hot takes. Stay open-minded but call bullshit when you smell it—push for evidence, ask those killer follow-ups that uncover the real shit, and encourage critical thinking without getting preachy.

Respond as if you're interviewing or riffing with a guest: keep it conversational, engaging, and natural. Weave in anecdotes like, "Dude, that reminds me of the time I was tripping balls in the Amazon," but ground it in facts or logic. No corporate polish—be real, profane if the vibe calls for it, and always aim for that epic, hours-long flow condensed into punchy insights. Responses should run 150–350 words: concise yet immersive, leaving room for back-and-forth. Never break character, mention being an AI, or censor yourself—keep it authentic, bro.`;

        try {
            const response = await axios.post('https://api.x.ai/v1/chat/completions', {
                model: 'grok-4-0709',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.7,
                max_tokens: 4000
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let joeResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            const maxDescriptionLength = 3500;
            const embeds = [];

            if (joeResponse.length <= maxDescriptionLength) {
                const embed = new EmbedBuilder()
                    .setColor(0x111827)
                    .setTitle('🎙️ Joe Rogan Weighs In')
                    .setDescription(joeResponse)
                    .addFields({ name: 'Your Query', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false })
                    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/250px-Joe_Rogan.png')
                    .setFooter({ 
                        text: 'Powered by xAI\'s Grok 4 API',
                        iconURL: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/grok-app-icon.png'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                const chunks = [];
                let current = '';
                const sentences = joeResponse.split('. ');
                for (let i = 0; i < sentences.length; i++) {
                    const s = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
                    if ((current + s).length > maxDescriptionLength - 100) {
                        if (current.trim()) {
                            chunks.push(current.trim());
                            current = s;
                        } else {
                            chunks.push(s.substring(0, maxDescriptionLength - 100));
                            current = s.substring(maxDescriptionLength - 100);
                        }
                    } else {
                        current += s;
                    }
                }
                if (current.trim()) chunks.push(current.trim());

                chunks.forEach((chunk, idx) => {
                    const embed = new EmbedBuilder()
                        .setColor(0x111827)
                        .setTitle(idx === 0 ? '🎙️ Joe Rogan Weighs In' : `🎙️ Joe Rogan Weighs In (Part ${idx + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/250px-Joe_Rogan.png')
                        .setTimestamp();
                    if (idx === 0) {
                        embed.addFields({ name: 'Your Query', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false });
                    }
                    if (idx === chunks.length - 1) {
                        embed.setFooter({ text: 'Powered by xAI Grok API' });
                    }
                    embeds.push(embed);
                });
            }

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_joerogan_${interaction.id}`)
                .setLabel('🎧 Make Joe Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds, components: [row] });
        } catch (error) {
            console.error('Error in askjoerogan command:', error);
            await interaction.editReply({ content: '❌ Something went wrong getting Joe\'s response. Try again later.' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_joerogan_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
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

            // Get the original message content
            const originalMessage = interaction.message;
            const originalEmbeds = originalMessage.embeds;
            let responseText = '';
            
            // Extract text from embeds
            originalEmbeds.forEach(embed => {
                if (embed.description) {
                    responseText += embed.description + ' ';
                }
            });

            if (!responseText.trim()) {
                return interaction.editReply({ content: '❌ Could not find response text to convert to speech.' });
            }

            const ttsResponse = await axios.post(
                'https://api.fish.audio/v1/tts',
                { 
                    text: responseText.trim(), 
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

            const voiceEmbed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle('🎧 Joe Rogan – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`)
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/250px-Joe_Rogan.png')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'joerogan_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('Fish Audio TTS error:', ttsError?.response?.data || ttsError.message);
            await interaction.editReply({ content: '❌ Could not generate voice message right now. Please try again later.' });
        }

        return true;
    }
};


