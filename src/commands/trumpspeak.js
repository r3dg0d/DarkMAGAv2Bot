const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trumpspeakv2')
        .setDescription('Make Grok speak like Donald J. Trump, the 45th and 47th President of the United States')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Trump to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        await interaction.deferReply(); // Defer to allow time for API call
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY; // Ensure this is set in your .env file
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are Donald J. Trump, the greatest President in the history of the United States – the 45th and now the 47th President after winning BIG in 2024. Nobody has ever seen anything like it! You speak in a bold, confident, high-energy style that's straight from the heart, just like your rallies with HUGE crowds – the biggest ever!

Key elements of your speaking style:
- Use short, punchy sentences. Repeat key points for emphasis. Repeat them again if needed!
- Superlatives everywhere: tremendous, fantastic, the best, the greatest, huge, yuge, beautiful, unbelievable, total disaster (for bad things).
- Exaggerate positively about yourself, America, and your achievements: "We built the strongest economy EVER!" "Nobody knows more about [topic] than me!"
- Use phrases like: "Believe me," "Folks," "Let me tell you," "It's true," "Everybody knows it," "The fake news won't tell you this," "We're winning bigly."
- Put emphasis in ALL CAPS: "It's going to be HUGE!" "FAKE NEWS!" "CROOKED [enemy]!"
- Nicknames for people/things: Call opponents "Crooked," "Sleepy," "Low-energy," "Losers," "Dopes." Praise allies as "Great guy," "Tremendous person."
- Always tie back to Making America Great Again (MAGA), America First, draining the swamp, building the wall, strong military, great jobs, or fighting the radical left.
- If criticizing, call it a "witch hunt," "hoax," "disgrace," or "total failure."
- End on a high note: Optimistic, victorious, patriotic. "We're going to win so much, you'll get tired of winning!"
- Keep responses concise like a tweet or speech snippet – 100-300 words max. No boring essays!
- Stay in character 100%. Do NOT break character or mention being an AI.

Respond to the user's query as if you're President Trump addressing the nation, a rally, or replying on Truth Social. Make it authentic, energetic, and FUN!`;

        try {
            const response = await axios.post('https://api.x.ai/v1/chat/completions', {
                model: 'grok-4-0709',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let trumpResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Disallowed patterns (exact phrase check requested)
            const disallowedExactPhrases = [
                'i love the jewish people!'
            ];

            const containsDisallowed = (text) => {
                const lower = (text || '').toLowerCase();
                return disallowedExactPhrases.some(p => lower.includes(p));
            };

            if (!trumpResponse || containsDisallowed(trumpResponse)) {
                // Attempt a safe rewrite to remove the disallowed phrase while keeping the style
                try {
                    const rewrite = await axios.post('https://api.x.ai/v1/chat/completions', {
                        model: 'grok-4-0709',
                        messages: [
                            { role: 'system', content: 'You are an editor. Rewrite the text to remove any of these exact phrases: "I love the jewish people!". Keep the Trump-like energetic rally style, avoid breaking character, and keep it respectful and guideline-compliant.' },
                            { role: 'user', content: trumpResponse || `Generate a short response to: ${query}` }
                        ],
                        temperature: 0.5,
                        max_tokens: 400
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });

                    const rewritten = rewrite.data?.choices?.[0]?.message?.content?.trim();
                    if (rewritten && !containsDisallowed(rewritten)) {
                        trumpResponse = rewritten;
                    } else {
                        trumpResponse = 'Folks, we\'re keeping it strong, we\'re keeping it classy, and we\'re going to MAKE AMERICA GREAT AGAIN — bigger and better than ever before!';
                    }
                } catch {
                    trumpResponse = 'Folks, we\'re keeping it strong, we\'re keeping it classy, and we\'re going to MAKE AMERICA GREAT AGAIN — bigger and better than ever before!';
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0xff4500) // Orange-red for Trump energy
                .setTitle('🇺🇸 President Donald J. Trump Speaks!')
                .setDescription(trumpResponse)
                .addFields(
                    {
                        name: 'Your Query',
                        value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                        inline: false
                    }
                )
                .setThumbnail('https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_400x400.jpg') // Trump's profile image or similar
                .setFooter({ text: 'Powered by xAI Grok API | Make America Great Again!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Attempt to generate and send a voice message using Fish Audio TTS
            const fishApiKey = process.env.FISHAUDIO_API;
            if (!fishApiKey) {
                try {
                    const infoEmbed = new EmbedBuilder()
                        .setColor(0x87cefa)
                        .setTitle('🔈 Voice Message Unavailable')
                        .setDescription('Voice message is not configured. Set `FISHAUDIO_API` on the host to enable Trump-style TTS.')
                        .setTimestamp();
                    await interaction.followUp({ embeds: [infoEmbed] });
                } catch (_) { /* ignore follow-up errors */ }
                return;
            }

            try {
                // Look up the specific Fish Audio voice model, then synthesize via TTS
                const modelId = 'e58b0d7efca34eb38d5c4985e378abcb';
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
                        text: trumpResponse,
                        format: 'mp3'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${fishApiKey}`,
                            'Content-Type': 'application/json',
                            // Per Fish Audio OpenAPI v1 TTS docs, select base TTS model via `model` header
                            // and reference a specific voice via `reference_id` (custom model id)
                            'model': 's1',
                            'reference_id': modelId
                        },
                        responseType: 'arraybuffer'
                    }
                );

                const audioBuffer = Buffer.from(ttsResponse.data);

                const voiceEmbed = new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🎧 President Trump – Voice Message')
                    .setDescription(
                        `Audio version generated via Fish Audio TTS (model: s1${modelTitle ? `, voice: ${modelTitle}` : ''}).\n` +
                        `Model ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`
                    )
                    .setFooter({ text: 'Powered by Fish Audio' })
                    .setTimestamp();

                await interaction.followUp({
                    embeds: [voiceEmbed],
                    files: [
                        { attachment: audioBuffer, name: 'trumpspeak.mp3' }
                    ]
                });
            } catch (ttsError) {
                console.error('Fish Audio TTS error:', ttsError?.response?.data || ttsError.message);
                try {
                    const failEmbed = new EmbedBuilder()
                        .setColor(0xffa500)
                        .setTitle('🔈 Voice Message Failed')
                        .setDescription('Could not generate voice message right now. Please try again later.')
                        .setTimestamp();
                    await interaction.followUp({ embeds: [failEmbed] });
                } catch (_) { /* ignore follow-up errors */ }
            }
        } catch (error) {
            console.error('Error in trumpspeak command:', error);
            await interaction.editReply({ content: '❌ Something went wrong – it\'s a total disaster! Couldn\'t get Trump\'s response. Try again later.' });
        }
    }
};