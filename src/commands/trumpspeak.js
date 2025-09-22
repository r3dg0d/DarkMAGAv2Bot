const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('asktrump')
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
                max_tokens: 4000
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let trumpResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Handle long responses by splitting into multiple embeds if needed
            const maxDescriptionLength = 3500; // Reduced from 4096 to be more conservative
            const embeds = [];
            
            console.log(`[asktrump] Response length: ${trumpResponse.length} characters`);
            console.log(`[asktrump] Max description length: ${maxDescriptionLength}`);
            console.log(`[asktrump] Response preview (first 200 chars): ${trumpResponse.substring(0, 200)}...`);
            
            if (trumpResponse.length <= maxDescriptionLength) {
                console.log(`[asktrump] Using single embed (response is short enough)`);
                // Single embed for shorter responses
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
                embeds.push(embed);
            } else {
                console.log(`[asktrump] Response too long, splitting into multiple embeds`);
                // Split long response into multiple embeds
                const chunks = [];
                let currentChunk = '';
                const sentences = trumpResponse.split('. ');
                
                console.log(`[asktrump] Found ${sentences.length} sentences to split`);
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
                    if ((currentChunk + sentence).length > maxDescriptionLength - 100) { // Leave some buffer
                        if (currentChunk.trim()) {
                            console.log(`[asktrump] Creating chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                            chunks.push(currentChunk.trim());
                            currentChunk = sentence;
                        } else {
                            // If single sentence is too long, force split it
                            console.log(`[asktrump] Single sentence too long, force splitting`);
                            chunks.push(sentence.substring(0, maxDescriptionLength - 100));
                            currentChunk = sentence.substring(maxDescriptionLength - 100);
                        }
                    } else {
                        currentChunk += sentence;
                    }
                }
                if (currentChunk.trim()) {
                    console.log(`[asktrump] Creating final chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                    chunks.push(currentChunk.trim());
                }
                
                console.log(`[asktrump] Created ${chunks.length} chunks total`);
                
                // Create embeds for each chunk
                chunks.forEach((chunk, index) => {
                    console.log(`[asktrump] Creating embed ${index + 1}/${chunks.length} with ${chunk.length} characters`);
                    const embed = new EmbedBuilder()
                        .setColor(0xff4500)
                        .setTitle(index === 0 ? '🇺🇸 President Donald J. Trump Speaks!' : `🇺🇸 President Donald J. Trump Speaks! (Part ${index + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_400x400.jpg')
                        .setTimestamp();
                    
                    // Add query field only to first embed
                    if (index === 0) {
                        embed.addFields({
                            name: 'Your Query',
                            value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                            inline: false
                        });
                    }
                    
                    // Add footer only to last embed
                    if (index === chunks.length - 1) {
                        embed.setFooter({ text: 'Powered by xAI Grok API | Make America Great Again!' });
                    }
                    
                    embeds.push(embed);
                });
            }
            
            console.log(`[asktrump] Sending ${embeds.length} embed(s) to Discord`);
            
            // Debug: Check total embed size
            let totalEmbedSize = 0;
            embeds.forEach((embed, index) => {
                const embedData = embed.data;
                const embedSize = (embedData.title?.length || 0) + 
                                 (embedData.description?.length || 0) + 
                                 (embedData.footer?.text?.length || 0) +
                                 (embedData.fields?.reduce((sum, field) => sum + (field.name?.length || 0) + (field.value?.length || 0), 0) || 0);
                totalEmbedSize += embedSize;
                console.log(`[asktrump] Embed ${index + 1} size: ${embedSize} characters`);
            });
            console.log(`[asktrump] Total embed size: ${totalEmbedSize} characters (Discord limit: 6000)`);

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_trump_${interaction.id}`)
                .setLabel('🎧 Make Trump Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds: embeds, components: [row] });
        } catch (error) {
            console.error('Error in trumpspeak command:', error);
            await interaction.editReply({ content: '❌ Something went wrong – it\'s a total disaster! Couldn\'t get Trump\'s response. Try again later.' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_trump_')) {
            return false;
        }

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = 'e58b0d7efca34eb38d5c4985e378abcb';
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
                .setTitle('🎧 President Trump – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`)
                .setThumbnail('https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_400x400.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'trump_speak.mp3' }]
            });

            return true;
        } catch (error) {
            console.error('Error in Trump TTS generation:', error);
            await interaction.editReply({ content: '❌ Failed to generate Trump\'s voice. Please try again later.' });
            return true;
        }
    }
};