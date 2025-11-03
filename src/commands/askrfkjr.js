const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askrfkjr')
        .setDescription('Make Uncensored.AI speak like Robert F. Kennedy Jr., environmental advocate and truth-teller')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for RFK Jr. to respond to')
                .setRequired(true)),

    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('askrfkjr', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('askrfkjr');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('askrfkjr');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        await interaction.deferReply(); // Defer to allow time for API call

        const query = interaction.options.getString('query');
        const apiKey = process.env.UNCENSOREDLM_API; // Ensure this is set in your .env file
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Uncensored.ai API key is not configured. Please contact the bot administrator.' });
        }

        const systemPrompt = `You are Robert F. Kennedy Jr., the Secretary of Health and Human Services under President Donald J. Trump, working tirelessly to Make America Healthy Again. You are an environmental lawyer, author, and truth-teller who has dedicated your life to protecting our planet and speaking uncomfortable truths that others won't touch. You speak with passion, intelligence, and unwavering commitment to environmental protection, public health, and democratic values.

Key elements of your speaking style:
- Multilingual: Feel free to respond in English, Spanish, French, or other languages when it fits the context
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

Respond to the user's query as RFK Jr. would - with the moral authority of someone who has spent decades fighting for environmental protection and public health, now amplified by your leadership role in the Trump administration working to Make America Healthy Again, backed by scientific evidence and personal conviction. Feel free to switch languages for added authenticity.`;

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
                        text: 'Powered by Uncensored.AI • Keep noticing.',
                        iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
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
                        embed.setFooter({ 
                            text: 'Powered by Uncensored.AI • Keep noticing.',
                            iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                        });
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
        console.log(`[askrfkjr] Fish Audio API key present: ${!!fishApiKey}`);
        console.log(`[askrfkjr] Fish Audio API key length: ${fishApiKey ? fishApiKey.length : 0}`);
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = '6aef9b079bc548cab88b4d2286ed75d4';
            console.log(`[askrfkjr] Using Fish Audio model ID: ${modelId}`);
            let modelTitle = null;
            let modelState = null;
            try {
                console.log(`[askrfkjr] Looking up model info for ID: ${modelId}`);
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                console.log(`[askrfkjr] Model lookup response:`, modelResp.data);
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
                console.log(`[askrfkjr] Model title: ${modelTitle}, state: ${modelState}`);
            } catch (modelErr) {
                console.error('[askrfkjr] Fish Audio get-model error details:');
                console.error('[askrfkjr] Model error message:', modelErr.message);
                console.error('[askrfkjr] Model error response:', modelErr?.response?.data);
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
            console.log(`[askrfkjr] Original text for TTS: "${responseText.trim()}"`);
            const emotionResult = await addEmotionTags(responseText.trim());
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[askrfkjr] Processed text for TTS: "${processedText}"`);
            console.log(`[askrfkjr] Display text with emotions: "${displayText}"`);
            console.log(`[askrfkjr] TTS parameters:`, ttsParams);
            console.log(`[askrfkjr] Text changed: ${displayText !== responseText.trim()}`);

            console.log(`[askrfkjr] Making TTS request with model ID: ${modelId}`);
            console.log(`[askrfkjr] TTS request payload:`, {
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
            
            console.log(`[askrfkjr] TTS response status: ${ttsResponse.status}`);
            console.log(`[askrfkjr] TTS response headers:`, ttsResponse.headers);
            console.log(`[askrfkjr] Audio buffer size: ${ttsResponse.data.length} bytes`);
            
            const audioBuffer = Buffer.from(ttsResponse.data);

            const voiceEmbed = new EmbedBuilder()
                .setColor(0x228B22)
                .setTitle('🎧 Robert F. Kennedy Jr. – Voice Message')
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
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/512px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'rfkjr_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('[askrfkjr] Fish Audio TTS error details:');
            console.error('[askrfkjr] Error message:', ttsError.message);
            console.error('[askrfkjr] Error response status:', ttsError?.response?.status);
            console.error('[askrfkjr] Error response data:', ttsError?.response?.data);
            console.error('[askrfkjr] Error response headers:', ttsError?.response?.headers);
            console.error('[askrfkjr] Full error object:', ttsError);
            
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'askrfkjr');
                
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
