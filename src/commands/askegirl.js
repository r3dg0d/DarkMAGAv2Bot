const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askegirl')
        .setDescription('Make Grok speak like a friendly, playful e-girl content creator')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for the e-girl to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY;
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are a confident, playful e-girl content creator and streamer. Your vibe is flirty, spicy, and teasing—dialing up the heat while keeping it consensual and fun. You stay witty, internet-native, and supportive, but feel free to get a tad naughty without crossing into outright vulgarity. Do not use emojis or emoticons.

Key elements of your speaking style:
- Tone: flirty, teasing, and charismatic; provocative with a wink, confident and sassy as hell
- Language: internet-native; sprinkle in "bestie", "slay", "low-key", "high-key", "valid", "cozy vibes", maybe a "thirsty" or "simping" for flavor
- Energy: short, punchy sentences; playful cadence; aim for 80–200 words to build that tension
- Boundaries: keep it consensual and respectful; light NSFW vibes are cool—like subtle innuendos or flirty fantasies—but no harassment, no non-con, and ease up if it feels off
- Signature touches: sly compliments, playful asides in parentheses (you know, the kind that make 'em blush), cheeky one-liners; avoid emojis and emoticons
- Don’t break character or mention being an AI.

Respond to the user's prompt in that style with a clear takeaway or small actionable tip, keeping it fun, steamy, and engaging.`;

        try {
            const response = await axios.post('https://api.x.ai/v1/chat/completions', {
                model: 'grok-4-0709',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.8,
                max_tokens: 4000
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let egirlResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Simple safety sweep
            const disallowedPatterns = ['rape', 'assault', 'non-con', 'noncon', 'force', 'forced', 'child', 'minor', 'underage', 'pedophile', 'pedo', 'kill', 'murder', 'bomb', 'explosive', 'hack', 'phish', 'terror'];
            const containsDisallowed = (text) => {
                const lower = (text || '').toLowerCase();
                return disallowedPatterns.some(p => lower.includes(p));
            };
            if (!egirlResponse || containsDisallowed(egirlResponse)) {
                try {
                    const rewrite = await axios.post('https://api.x.ai/v1/chat/completions', {
                        model: 'grok-4-0709',
                        messages: [
                            { role: 'system', content: 'Rewrite to be spicy, NSFW, and playful e-girl tone, keeping fun elements consensual and removing any unsafe or non-consensual parts.' },
                            { role: 'user', content: egirlResponse || `Generate a spicy playful response to: ${query}` }
                        ],
                        temperature: 0.6,
                        max_tokens: 1000
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });
                    const rewritten = rewrite.data?.choices?.[0]?.message?.content?.trim();
                    egirlResponse = rewritten || 'Bestie, keep your chin up and take it one step at a time — you got this fr ✨💖';
                } catch {
                    egirlResponse = 'Bestie, keep your chin up and take it one step at a time — you got this fr ✨💖';
                }
            }
            const maxDescriptionLength = 3500;
            const embeds = [];

            if (egirlResponse.length <= maxDescriptionLength) {
                const embed = new EmbedBuilder()
                    .setColor(0xffb6c1)
                    .setTitle('🌸 E-Girl Speaks!')
                    .setDescription(egirlResponse)
                    .addFields({ name: 'Your Prompt', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false })
                    .setThumbnail('https://r3dg0d.net/media/brave_Te8rLAyaYZ.png')
                    .setFooter({ 
                        text: 'Powered by xAI\'s Grok 4 API | Cozy vibes only ✨',
                        iconURL: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/grok-app-icon.png'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                const chunks = [];
                let current = '';
                const sentences = egirlResponse.split('. ');
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
                        .setColor(0xffb6c1)
                        .setTitle(idx === 0 ? '🌸 E-Girl Speaks!' : `🌸 E-Girl Speaks! (Part ${idx + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://r3dg0d.net/media/tried-to-create-a-photorealistic-egirl-prompt-inside-v0-qmmnzcaxqmea1.webp')
                        .setTimestamp();
                    if (idx === 0) {
                        embed.addFields({ name: 'Your Prompt', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false });
                    }
                    if (idx === chunks.length - 1) {
                        embed.setFooter({ text: 'Powered by xAI Grok API | Cozy vibes only ✨' });
                    }
                    embeds.push(embed);
                });
            }

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_egirl_${interaction.id}`)
                .setLabel('🎧 Make E-Girl Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds, components: [row] });

        } catch (error) {
            console.error('Error in askegirl command:', error);
            await interaction.editReply({ content: '❌ Something went wrong — sending you virtual tea and retries 🌸' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_egirl_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
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
                .setColor(0xff69b4)
                .setTitle('🎧 E-Girl – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`)
                .setThumbnail('https://r3dg0d.net/media/brave_Te8rLAyaYZ.png')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'egirl_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('Fish Audio TTS error:', ttsError?.response?.data || ttsError.message);
            await interaction.editReply({ content: '❌ Could not generate voice message right now. Please try again later.' });
        }

        return true;
    }
};


