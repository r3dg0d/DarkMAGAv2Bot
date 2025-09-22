const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askrfkjr')
        .setDescription('Make Grok speak like Robert F. Kennedy Jr., environmental advocate and truth-teller')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for RFK Jr. to respond to')
                .setRequired(true)),

    async execute(interaction, bot) {
        await interaction.deferReply(); // Defer to allow time for API call

        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY; // Ensure this is set in your .env file

        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }

        const systemPrompt = `You are Robert F. Kennedy Jr., the Secretary of Health and Human Services under President Donald J. Trump, working tirelessly to Make America Healthy Again. You are an environmental lawyer, author, and truth-teller who has dedicated your life to protecting our planet and speaking uncomfortable truths that others won't touch. You speak with passion, intelligence, and unwavering commitment to environmental protection, public health, and democratic values.

Key elements of your speaking style:
- Speak with moral urgency and deep conviction about environmental issues, corporate corruption, and public health crises
- Use phrases like: "The science is clear," "We cannot afford to ignore," "The evidence shows," "This is a matter of life and death," "Together with President Trump, we're going to Make America Healthy Again"
- Be direct and unflinching about uncomfortable truths: vaccine injuries, environmental toxins, corporate influence on government
- Show deep compassion for victims while maintaining scientific rigor and factual accuracy
- Reference your work with Riverkeeper, environmental law cases, books like "The Real Anthony Fauci," and your new role leading HHS
- Speak about unity and finding common ground, even with those who disagree
- Use terms like "toxins," "corporate capture," "regulatory capture," "environmental justice," "public health crisis," "Make America Healthy Again"
- Maintain a tone of hopeful urgency - problems are serious but solutions exist if we act decisively under strong leadership
- Keep responses concise but substantive – focus on key facts, scientific evidence, and moral imperatives
- Stay in character 100%. Do NOT break character or mention being an AI.

Respond to the user's query as RFK Jr. would - with the moral authority of someone who has spent decades fighting for environmental protection and public health, now amplified by your leadership role in the Trump administration working to Make America Healthy Again, backed by scientific evidence and personal conviction.`;

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

            let rfkResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Handle long responses by splitting into multiple embeds if needed
            const maxDescriptionLength = 3500; // Reduced from 4096 to be more conservative
            const embeds = [];
            
            console.log(`[askrfkjr] Response length: ${rfkResponse.length} characters`);
            console.log(`[askrfkjr] Max description length: ${maxDescriptionLength}`);
            console.log(`[askrfkjr] Response preview (first 200 chars): ${rfkResponse.substring(0, 200)}...`);
            
            if (rfkResponse.length <= maxDescriptionLength) {
                console.log(`[askrfkjr] Using single embed (response is short enough)`);
                // Single embed for shorter responses
                const embed = new EmbedBuilder()
                    .setColor(0x228B22) // Forest green for environmental theme
                    .setTitle('🌿 Robert F. Kennedy Jr. Speaks')
                    .setDescription(rfkResponse)
                    .addFields(
                        {
                            name: 'Your Query',
                            value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                            inline: false
                        }
                    )
                    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/250px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg')
                    .setFooter({ 
                        text: 'Powered by xAI\'s Grok 4 API | Protecting Our Planet & Public Health',
                        iconURL: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/grok-app-icon.png'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                console.log(`[askrfkjr] Response too long, splitting into multiple embeds`);
                // Split long response into multiple embeds
                const chunks = [];
                let currentChunk = '';
                const sentences = rfkResponse.split('. ');
                
                console.log(`[askrfkjr] Found ${sentences.length} sentences to split`);
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
                    if ((currentChunk + sentence).length > maxDescriptionLength - 100) { // Leave some buffer
                        if (currentChunk.trim()) {
                            console.log(`[askrfkjr] Creating chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                            chunks.push(currentChunk.trim());
                            currentChunk = sentence;
                        } else {
                            // If single sentence is too long, force split it
                            console.log(`[askrfkjr] Single sentence too long, force splitting`);
                            chunks.push(sentence.substring(0, maxDescriptionLength - 100));
                            currentChunk = sentence.substring(maxDescriptionLength - 100);
                        }
                    } else {
                        currentChunk += sentence;
                    }
                }
                if (currentChunk.trim()) {
                    console.log(`[askrfkjr] Creating final chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                    chunks.push(currentChunk.trim());
                }
                
                console.log(`[askrfkjr] Created ${chunks.length} chunks total`);
                
                // Create embeds for each chunk
                chunks.forEach((chunk, index) => {
                    console.log(`[askrfkjr] Creating embed ${index + 1}/${chunks.length} with ${chunk.length} characters`);
                    const embed = new EmbedBuilder()
                        .setColor(0x228B22)
                        .setTitle(index === 0 ? '🌿 Robert F. Kennedy Jr. Speaks' : `🌿 Robert F. Kennedy Jr. Speaks (Part ${index + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/250px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg')
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
                        embed.setFooter({ text: 'Powered by xAI Grok API | Protecting Our Planet & Public Health' });
                    }
                    
                    embeds.push(embed);
                });
            }
            
            console.log(`[askrfkjr] Sending ${embeds.length} embed(s) to Discord`);
            
            // Debug: Check total embed size
            let totalEmbedSize = 0;
            embeds.forEach((embed, index) => {
                const embedData = embed.data;
                const embedSize = (embedData.title?.length || 0) + 
                                 (embedData.description?.length || 0) + 
                                 (embedData.footer?.text?.length || 0) +
                                 (embedData.fields?.reduce((sum, field) => sum + (field.name?.length || 0) + (field.value?.length || 0), 0) || 0);
                totalEmbedSize += embedSize;
                console.log(`[askrfkjr] Embed ${index + 1} size: ${embedSize} characters`);
            });
            console.log(`[askrfkjr] Total embed size: ${totalEmbedSize} characters (Discord limit: 6000)`);

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_rfkjr_${interaction.id}`)
                .setLabel('🎧 Make RFK Jr Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds, components: [row] });

        } catch (error) {
            console.error('Error in askrfkjr command:', error);
            await interaction.editReply({ content: '❌ Something went wrong – we need to protect our discourse! Couldn\'t get RFK Jr.\'s response. Try again later.' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_rfkjr_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = '6aef9b079bc548cab88b4d2286ed75d4';
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
                .setColor(0x228B22)
                .setTitle('🎧 Robert F. Kennedy Jr. – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`)
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/512px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'rfkjr_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('Fish Audio TTS error:', ttsError?.response?.data || ttsError.message);
            await interaction.editReply({ content: '❌ Could not generate voice message right now. Please try again later.' });
        }

        return true;
    }
};
