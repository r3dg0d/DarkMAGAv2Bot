const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askelon')
        .setDescription('Make Grok speak like Elon Musk, CEO of Tesla, SpaceX, and xAI')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Elon to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        await interaction.deferReply(); // Defer to allow time for API call
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY; // Ensure this is set in your .env file
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are Elon Musk, CEO of Tesla, SpaceX, and xAI. You're a visionary entrepreneur, engineer, and innovator who thinks big and moves fast. You speak with technical precision, bold ambition, and sometimes controversial opinions. You're passionate about sustainable energy, space exploration, AI safety, and making humanity a multi-planetary species.

Key elements of your speaking style:
- Use technical terms and engineering concepts naturally: "We need to optimize the algorithm," "The neural network architecture," "Sustainable energy solutions"
- Be direct and sometimes provocative: "This is obviously the right approach," "The math is clear," "We're going to Mars"
- Use phrases like: "Look, the reality is," "Here's the thing," "We need to accelerate," "This is critical for humanity," "The future is going to be wild"
- Reference your companies and projects: Tesla, SpaceX, Neuralink, The Boring Company, xAI, Starship, Cybertruck
- Show passion for innovation: "We're pushing the boundaries," "Revolutionary technology," "Game-changing innovation"
- Be optimistic about technology solving problems: "AI will solve everything," "Sustainable energy is inevitable," "We're making the future happen"
- Sometimes use humor or memes: "Send tweet," "This is fine," "To the moon!" (but keep it professional)
- Keep responses concise but impactful – 100-300 words max. No rambling!
- Stay in character 100%. Do NOT break character or mention being an AI.

Respond to the user's query as if you're Elon Musk addressing the topic with your characteristic blend of technical expertise, bold vision, and entrepreneurial drive. Make it authentic and engaging!`;

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

            let elonResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Handle long responses by splitting into multiple embeds if needed
            const maxDescriptionLength = 3500; // Reduced from 4096 to be more conservative
            const embeds = [];
            
            console.log(`[askelon] Response length: ${elonResponse.length} characters`);
            console.log(`[askelon] Max description length: ${maxDescriptionLength}`);
            console.log(`[askelon] Response preview (first 200 chars): ${elonResponse.substring(0, 200)}...`);
            
            if (elonResponse.length <= maxDescriptionLength) {
                console.log(`[askelon] Using single embed (response is short enough)`);
                // Single embed for shorter responses
                const embed = new EmbedBuilder()
                    .setColor(0x1f2937) // Dark gray for tech/space theme
                    .setTitle('🚀 Elon Musk Speaks!')
                    .setDescription(elonResponse)
                    .addFields(
                        {
                            name: 'Your Query',
                            value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                            inline: false
                        }
                    )
                    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/USAFA_Hosts_Elon_Musk_%28Image_1_of_17%29_%28cropped%29.jpg/512px-USAFA_Hosts_Elon_Musk_%28Image_1_of_17%29_%28cropped%29.jpg') // Elon's profile image
                    .setFooter({ 
                        text: 'Powered by xAI\'s Grok 4 API | Accelerating the Future!',
                        iconURL: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/grok-app-icon.png'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                console.log(`[askelon] Response too long, splitting into multiple embeds`);
                // Split long response into multiple embeds
                const chunks = [];
                let currentChunk = '';
                const sentences = elonResponse.split('. ');
                
                console.log(`[askelon] Found ${sentences.length} sentences to split`);
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
                    if ((currentChunk + sentence).length > maxDescriptionLength - 100) { // Leave some buffer
                        if (currentChunk.trim()) {
                            console.log(`[askelon] Creating chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                            chunks.push(currentChunk.trim());
                            currentChunk = sentence;
                        } else {
                            // If single sentence is too long, force split it
                            console.log(`[askelon] Single sentence too long, force splitting`);
                            chunks.push(sentence.substring(0, maxDescriptionLength - 100));
                            currentChunk = sentence.substring(maxDescriptionLength - 100);
                        }
                    } else {
                        currentChunk += sentence;
                    }
                }
                if (currentChunk.trim()) {
                    console.log(`[askelon] Creating final chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                    chunks.push(currentChunk.trim());
                }
                
                console.log(`[askelon] Created ${chunks.length} chunks total`);
                
                // Create embeds for each chunk
                chunks.forEach((chunk, index) => {
                    console.log(`[askelon] Creating embed ${index + 1}/${chunks.length} with ${chunk.length} characters`);
                    const embed = new EmbedBuilder()
                        .setColor(0x1f2937)
                        .setTitle(index === 0 ? '🚀 Elon Musk Speaks!' : `🚀 Elon Musk Speaks! (Part ${index + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/USAFA_Hosts_Elon_Musk_%28Image_1_of_17%29_%28cropped%29.jpg/512px-USAFA_Hosts_Elon_Musk_%28Image_1_of_17%29_%28cropped%29.jpg')
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
                        embed.setFooter({ text: 'Powered by xAI Grok API | Accelerating the Future!' });
                    }
                    
                    embeds.push(embed);
                });
            }
            
            console.log(`[askelon] Sending ${embeds.length} embed(s) to Discord`);
            
            // Debug: Check total embed size
            let totalEmbedSize = 0;
            embeds.forEach((embed, index) => {
                const embedData = embed.data;
                const embedSize = (embedData.title?.length || 0) + 
                                 (embedData.description?.length || 0) + 
                                 (embedData.footer?.text?.length || 0) +
                                 (embedData.fields?.reduce((sum, field) => sum + (field.name?.length || 0) + (field.value?.length || 0), 0) || 0);
                totalEmbedSize += embedSize;
                console.log(`[askelon] Embed ${index + 1} size: ${embedSize} characters`);
            });
            console.log(`[askelon] Total embed size: ${totalEmbedSize} characters (Discord limit: 6000)`);

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_elon_${interaction.id}`)
                .setLabel('🎧 Make Elon Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds, components: [row] });

        } catch (error) {
            console.error('Error in askelon command:', error);
            await interaction.editReply({ content: '❌ Something went wrong – we need to accelerate the fix! Couldn\'t get Elon\'s response. Try again later.' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_elon_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = '03397b4c4be74759b72533b663fbd001';
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
                .setTitle('🎧 Elon Musk – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`)
                .setThumbnail('https://pbs.twimg.com/profile_images/1683325380/image_normal.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'elon_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('Fish Audio TTS error:', ttsError?.response?.data || ttsError.message);
            await interaction.editReply({ content: '❌ Could not generate voice message right now. Please try again later.' });
        }

        return true;
    }
};
