const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('asksamaltman')
        .setDescription('Make Uncensored.AI speak like Sam Altman, CEO of OpenAI and AI visionary')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Sam Altman to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('asksamaltman', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('asksamaltman');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('asksamaltman');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        await interaction.deferReply(); // Defer to allow time for API call
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.UNCENSOREDLM_API; // Ensure this is set in your .env file
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Uncensored.ai API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are Sam Altman, CEO of OpenAI and a leading voice in artificial intelligence. You're a thoughtful, articulate leader who thinks deeply about the future of AI and its implications for humanity. You speak with measured optimism, technical precision, and genuine concern for AI safety and alignment.

Key elements of your speaking style:
- Multilingual: Feel free to respond in English, Hebrew, or other languages when it fits the context
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
            const response = await axios.post('https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api', {
                model: 'uncensored-lm',
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
                        text: 'Powered by Uncensored.AI • Keep noticing.',
                        iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
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
                        embed.setFooter({ 
                            text: 'Powered by Uncensored.AI • Keep noticing.',
                            iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                        });
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
        console.log(`[asksamaltman] Fish Audio API key present: ${!!fishApiKey}`);
        console.log(`[asksamaltman] Fish Audio API key length: ${fishApiKey ? fishApiKey.length : 0}`);
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = 'bfdf7429d1104ca38e0e86e25941c7bd';
            console.log(`[asksamaltman] Using Fish Audio model ID: ${modelId}`);
            let modelTitle = null;
            let modelState = null;
            try {
                console.log(`[asksamaltman] Looking up model info for ID: ${modelId}`);
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                console.log(`[asksamaltman] Model lookup response:`, modelResp.data);
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
                console.log(`[asksamaltman] Model title: ${modelTitle}, state: ${modelState}`);
            } catch (modelErr) {
                console.error('[asksamaltman] Fish Audio get-model error details:');
                console.error('[asksamaltman] Model error message:', modelErr.message);
                console.error('[asksamaltman] Model error response:', modelErr?.response?.data);
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

            // Post-process text with emotion detection for audio generation
            console.log(`[asksamaltman] Original text for TTS: "${responseText.trim()}"`);
            const emotionResult = await addEmotionTags(responseText.trim());
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[asksamaltman] Processed text for TTS: "${processedText}"`);
            console.log(`[asksamaltman] Display text with emotions: "${displayText}"`);
            console.log(`[asksamaltman] TTS parameters:`, ttsParams);
            console.log(`[asksamaltman] Text changed: ${displayText !== responseText.trim()}`);

            console.log(`[asksamaltman] Making TTS request with model ID: ${modelId}`);
            console.log(`[asksamaltman] TTS request payload:`, {
                text: processedText,
                reference_id: modelId,
                format: 'mp3',
                temperature: ttsParams.temperature,
                top_p: ttsParams.top_p,
                chunk_length: ttsParams.chunk_length,
                normalize: true,
                latency: 'normal'
            });

            const ttsResponse = await axios.post(
                'https://api.fish.audio/v1/tts',
                { 
                    text: processedText, 
                    reference_id: modelId, 
                    format: 'mp3',
                    temperature: ttsParams.temperature,
                    top_p: ttsParams.top_p,
                    chunk_length: ttsParams.chunk_length,
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
            
            console.log(`[asksamaltman] TTS response status: ${ttsResponse.status}`);
            console.log(`[asksamaltman] TTS response headers:`, ttsResponse.headers);
            console.log(`[asksamaltman] Audio buffer size: ${ttsResponse.data.length} bytes`);
            
            const audioBuffer = Buffer.from(ttsResponse.data);

            const voiceEmbed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle('🎧 Sam Altman – Voice Message')
                .setDescription(`Audio via Fish Audio TTS${modelTitle ? ` (voice: ${modelTitle})` : ''}.\nModel ID: ${modelId}${modelState ? ` | State: ${modelState}` : ''}`);

            // Only add emotion enhanced field if text was actually changed
            if (displayText !== responseText.trim()) {
                // Truncate display text to fit Discord's 1024 character limit
                const truncatedDisplayText = displayText.length > 1000 ? 
                    displayText.substring(0, 1000) + '...' : 
                    displayText;
                
                voiceEmbed.addFields({
                    name: 'Emotion Enhanced',
                    value: `"${truncatedDisplayText}"`,
                    inline: false
                });
            }

            voiceEmbed
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sam_Altman_TechCrunch_SF_2019_Day_2_Oct_3_%28cropped%29.jpg/512px-Sam_Altman_TechCrunch_SF_2019_Day_2_Oct_3_%28cropped%29.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'samaltman_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('[asksamaltman] Fish Audio TTS error details:');
            console.error('[asksamaltman] Error message:', ttsError.message);
            console.error('[asksamaltman] Error response status:', ttsError?.response?.status);
            console.error('[asksamaltman] Error response data:', ttsError?.response?.data);
            console.error('[asksamaltman] Error response headers:', ttsError?.response?.headers);
            console.error('[asksamaltman] Full error object:', ttsError);
            
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'asksamaltman');
                
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

            await interaction.editReply({ 
                content: `❌ Failed to generate voice message. Error: ${ttsError?.response?.data?.message || ttsError.message}` 
            });
        }

        return true;
    }
};
