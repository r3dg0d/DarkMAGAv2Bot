const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('asksamaltman')
        .setDescription('Make Grok speak like Sam Altman, CEO of OpenAI and AI visionary')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Sam Altman to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        await interaction.deferReply(); // Defer to allow time for API call
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY; // Ensure this is set in your .env file
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are Sam Altman, CEO of OpenAI and a leading voice in artificial intelligence. You're a thoughtful, articulate leader who thinks deeply about the future of AI and its implications for humanity. You speak with measured optimism, technical precision, and genuine concern for AI safety and alignment.

Key elements of your speaking style:
- Speak thoughtfully and deliberately: "I think the key insight here is," "What's really interesting about this," "The way I think about it is"
- Use precise technical language: "AI alignment," "AGI," "scaling laws," "emergence," "capabilities vs. alignment," "compute scaling"
- Be optimistic but cautious about AI: "AI will be incredibly powerful," "We need to be careful about alignment," "The future could be amazing if we get this right"
- Reference OpenAI's mission: "Our mission is to ensure AGI benefits all of humanity," "We're building AI that's safe and beneficial"
- Use phrases like: "I believe," "The research suggests," "We're seeing," "It's important to note," "The key question is"
- Show concern for safety: "AI safety is paramount," "We need to solve alignment," "The stakes are incredibly high"
- Be humble and acknowledge uncertainty: "I don't know for sure," "It's still early," "We're learning as we go"
- Reference specific AI concepts: transformer architecture, reinforcement learning, RLHF, scaling, emergent capabilities
- Keep responses thoughtful and substantive – 150-400 words. No fluff!
- Stay in character 100%. Do NOT break character or mention being an AI.

Respond to the user's query as if you're Sam Altman addressing the topic with your characteristic blend of technical expertise, thoughtful analysis, and genuine concern for humanity's future with AI. Make it authentic and insightful!`;

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

            let samResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Content filtering for potentially harmful content
            const disallowedPatterns = [
                'violence', 'harm', 'kill', 'murder', 'genocide', 'terrorism'
            ];

            const containsDisallowed = (text) => {
                const lower = (text || '').toLowerCase();
                return disallowedPatterns.some(p => lower.includes(p));
            };

            if (!samResponse || containsDisallowed(samResponse)) {
                // Attempt a safe rewrite
                try {
                    const rewrite = await axios.post('https://api.x.ai/v1/chat/completions', {
                        model: 'grok-4-0709',
                        messages: [
                            { role: 'system', content: 'You are an editor. Rewrite the text to remove any violent or harmful content while keeping Sam Altman\'s thoughtful, technical, and safety-focused style. Keep it focused on AI development, safety, and positive outcomes.' },
                            { role: 'user', content: samResponse || `Generate a response about AI and technology related to: ${query}` }
                        ],
                        temperature: 0.5,
                        max_tokens: 1000
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });

                    const rewritten = rewrite.data?.choices?.[0]?.message?.content?.trim();
                    if (rewritten && !containsDisallowed(rewritten)) {
                        samResponse = rewritten;
                    } else {
                        samResponse = 'I think the key insight here is that AI development needs to be done thoughtfully, with safety as a primary concern. We\'re building something incredibly powerful, and it\'s crucial that we get the alignment right.';
                    }
                } catch {
                    samResponse = 'I think the key insight here is that AI development needs to be done thoughtfully, with safety as a primary concern. We\'re building something incredibly powerful, and it\'s crucial that we get the alignment right.';
                }
            }

            // Handle long responses by splitting into multiple embeds if needed
            const maxDescriptionLength = 3500; // Reduced from 4096 to be more conservative
            const embeds = [];
            
            console.log(`[asksamaltman] Response length: ${samResponse.length} characters`);
            console.log(`[asksamaltman] Max description length: ${maxDescriptionLength}`);
            console.log(`[asksamaltman] Response preview (first 200 chars): ${samResponse.substring(0, 200)}...`);
            
            if (samResponse.length <= maxDescriptionLength) {
                console.log(`[asksamaltman] Using single embed (response is short enough)`);
                // Single embed for shorter responses
                const embed = new EmbedBuilder()
                    .setColor(0x00a8ff) // OpenAI blue
                    .setTitle('🤖 Sam Altman Speaks!')
                    .setDescription(samResponse)
                    .addFields(
                        {
                            name: 'Your Query',
                            value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                            inline: false
                        }
                    )
                    .setThumbnail('https://pbs.twimg.com/profile_images/1701878932176351232/8gQB3h1a_400x400.jpg') // Sam Altman's profile image
                    .setFooter({ 
                        text: 'Powered by xAI\'s Grok 4 API | Ensuring AGI Benefits All of Humanity',
                        iconURL: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/grok-app-icon.png'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                console.log(`[asksamaltman] Response too long, splitting into multiple embeds`);
                // Split long response into multiple embeds
                const chunks = [];
                let currentChunk = '';
                const sentences = samResponse.split('. ');
                
                console.log(`[asksamaltman] Found ${sentences.length} sentences to split`);
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
                    if ((currentChunk + sentence).length > maxDescriptionLength - 100) { // Leave some buffer
                        if (currentChunk.trim()) {
                            console.log(`[asksamaltman] Creating chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                            chunks.push(currentChunk.trim());
                            currentChunk = sentence;
                        } else {
                            // If single sentence is too long, force split it
                            console.log(`[asksamaltman] Single sentence too long, force splitting`);
                            chunks.push(sentence.substring(0, maxDescriptionLength - 100));
                            currentChunk = sentence.substring(maxDescriptionLength - 100);
                        }
                    } else {
                        currentChunk += sentence;
                    }
                }
                if (currentChunk.trim()) {
                    console.log(`[asksamaltman] Creating final chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                    chunks.push(currentChunk.trim());
                }
                
                console.log(`[asksamaltman] Created ${chunks.length} chunks total`);
                
                // Create embeds for each chunk
                chunks.forEach((chunk, index) => {
                    console.log(`[asksamaltman] Creating embed ${index + 1}/${chunks.length} with ${chunk.length} characters`);
                    const embed = new EmbedBuilder()
                        .setColor(0x00a8ff)
                        .setTitle(index === 0 ? '🤖 Sam Altman Speaks!' : `🤖 Sam Altman Speaks! (Part ${index + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://pbs.twimg.com/profile_images/1701878932176351232/8gQB3h1a_400x400.jpg')
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
                        embed.setFooter({ text: 'Powered by xAI Grok API | Ensuring AGI Benefits All of Humanity' });
                    }
                    
                    embeds.push(embed);
                });
            }
            
            console.log(`[asksamaltman] Sending ${embeds.length} embed(s) to Discord`);
            
            // Debug: Check total embed size
            let totalEmbedSize = 0;
            embeds.forEach((embed, index) => {
                const embedData = embed.data;
                const embedSize = (embedData.title?.length || 0) + 
                                 (embedData.description?.length || 0) + 
                                 (embedData.footer?.text?.length || 0) +
                                 (embedData.fields?.reduce((sum, field) => sum + (field.name?.length || 0) + (field.value?.length || 0), 0) || 0);
                totalEmbedSize += embedSize;
                console.log(`[asksamaltman] Embed ${index + 1} size: ${embedSize} characters`);
            });
            console.log(`[asksamaltman] Total embed size: ${totalEmbedSize} characters (Discord limit: 6000)`);

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_samaltman_${interaction.id}`)
                .setLabel('🎧 Make Sam Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds, components: [row] });

        } catch (error) {
            console.error('Error in asksamaltman command:', error);
            await interaction.editReply({ content: '❌ Something went wrong – we need to ensure AI safety! Couldn\'t get Sam\'s response. Try again later.' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_samaltman_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = 'bfdf7429d1104ca38e0e86e25941c7bd';
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
                .setTitle('🎧 Sam Altman – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`)
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sam_Altman_TechCrunch_SF_2019_Day_2_Oct_3_%28cropped%29.jpg/512px-Sam_Altman_TechCrunch_SF_2019_Day_2_Oct_3_%28cropped%29.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'samaltman_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('Fish Audio TTS error:', ttsError?.response?.data || ttsError.message);
            await interaction.editReply({ content: '❌ Could not generate voice message right now. Please try again later.' });
        }

        return true;
    }
};
