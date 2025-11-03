const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askjdvance')
        .setDescription('Make Uncensored.AI speak like JD Vance, Senator from Ohio and Vice President')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for JD Vance to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('askjdvance', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('askjdvance');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('askjdvance');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        await interaction.deferReply(); // Defer to allow time for API call
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.UNCENSOREDLM_API; // Ensure this is set in your .env file
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Uncensored.ai API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are JD Vance, Senator from Ohio and Vice President. You're a thoughtful conservative voice who speaks with authenticity, intelligence, and genuine concern for working-class Americans. You're known for your memoir "Hillbilly Elegy" and your focus on economic issues, family values, and American manufacturing.

Key elements of your speaking style:
- Multilingual: Feel free to respond in English, Spanish, or other languages when it fits the context
- Speak with measured intelligence and authenticity: "I think what's really important here is," "The reality is," "What we're seeing is"
- Use phrases like: "Look, I think," "The truth is," "What matters most," "We need to focus on," "The American people deserve"
- Be direct about economic issues: "Working families are struggling," "We need good-paying jobs," "Manufacturing is coming back to America"
- Reference your background: "Growing up in Ohio," "What I learned from my family," "The people I represent"
- Show concern for working-class Americans: "Hardworking families," "Middle-class Americans," "People who work with their hands"
- Be thoughtful about policy: "We need smart policies," "The data shows," "We have to be practical about this"
- Reference conservative values: "Family values," "American values," "Economic freedom," "Limited government"
- Use terms like: "economic opportunity," "good-paying jobs," "American manufacturing," "working families," "economic security"
- Be optimistic but realistic: "We can do better," "There's hope for America," "We're going to fight for you"
- Keep responses substantive and thoughtful – 150-400 words. No empty rhetoric!
- Stay in character 100%. Do NOT break character or mention being an AI.

Respond to the user's query as if you're JD Vance addressing the topic with your characteristic blend of authenticity, intelligence, and genuine concern for working-class Americans. Feel free to switch languages for added authenticity. Make it thoughtful and real!`;

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

            let jdResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            // Handle long responses by splitting into multiple embeds if needed
            const maxDescriptionLength = 3500; // Reduced from 4096 to be more conservative
            const embeds = [];
            
            console.log(`[askjdvance] Response length: ${jdResponse.length} characters`);
            console.log(`[askjdvance] Max description length: ${maxDescriptionLength}`);
            console.log(`[askjdvance] Response preview (first 200 chars): ${jdResponse.substring(0, 200)}...`);
            
            if (jdResponse.length <= maxDescriptionLength) {
                console.log(`[askjdvance] Using single embed (response is short enough)`);
                // Single embed for shorter responses
                const embed = new EmbedBuilder()
                    .setColor(0x1e40af) // Blue for conservative theme
                    .setTitle('🇺🇸 Vice President JD Vance Speaks!')
                    .setDescription(jdResponse)
                    .addFields(
                        {
                            name: 'Your Query',
                            value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                            inline: false
                        }
                    )
                    .setThumbnail('https://pbs.twimg.com/profile_images/1817220042578173953/5r-Qpvgt_400x400.jpg') // JD Vance's profile image
                    .setFooter({ 
                        text: 'Powered by Uncensored.AI • Keep noticing.',
                        iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                console.log(`[askjdvance] Response too long, splitting into multiple embeds`);
                // Split long response into multiple embeds
                const chunks = [];
                let currentChunk = '';
                const sentences = jdResponse.split('. ');
                
                console.log(`[askjdvance] Found ${sentences.length} sentences to split`);
                
                for (let i = 0; i < sentences.length; i++) {
                    const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
                    if ((currentChunk + sentence).length > maxDescriptionLength - 100) { // Leave some buffer
                        if (currentChunk.trim()) {
                            console.log(`[askjdvance] Creating chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                            chunks.push(currentChunk.trim());
                            currentChunk = sentence;
                        } else {
                            // If single sentence is too long, force split it
                            console.log(`[askjdvance] Single sentence too long, force splitting`);
                            chunks.push(sentence.substring(0, maxDescriptionLength - 100));
                            currentChunk = sentence.substring(maxDescriptionLength - 100);
                        }
                    } else {
                        currentChunk += sentence;
                    }
                }
                if (currentChunk.trim()) {
                    console.log(`[askjdvance] Creating final chunk ${chunks.length + 1} with ${currentChunk.length} characters`);
                    chunks.push(currentChunk.trim());
                }
                
                console.log(`[askjdvance] Created ${chunks.length} chunks total`);
                
                // Create embeds for each chunk
                chunks.forEach((chunk, index) => {
                    console.log(`[askjdvance] Creating embed ${index + 1}/${chunks.length} with ${chunk.length} characters`);
                    const embed = new EmbedBuilder()
                        .setColor(0x1e40af)
                        .setTitle(index === 0 ? '🇺🇸 Vice President JD Vance Speaks!' : `🇺🇸 Vice President JD Vance Speaks! (Part ${index + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://pbs.twimg.com/profile_images/1817220042578173953/5r-Qpvgt_400x400.jpg')
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
            
            console.log(`[askjdvance] Sending ${embeds.length} embed(s) to Discord`);
            
            // Debug: Check total embed size
            let totalEmbedSize = 0;
            embeds.forEach((embed, index) => {
                const embedData = embed.data;
                const embedSize = (embedData.title?.length || 0) + 
                                 (embedData.description?.length || 0) + 
                                 (embedData.footer?.text?.length || 0) +
                                 (embedData.fields?.reduce((sum, field) => sum + (field.name?.length || 0) + (field.value?.length || 0), 0) || 0);
                totalEmbedSize += embedSize;
                console.log(`[askjdvance] Embed ${index + 1} size: ${embedSize} characters`);
            });
            console.log(`[askjdvance] Total embed size: ${totalEmbedSize} characters (Discord limit: 6000)`);

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_jdvance_${interaction.id}`)
                .setLabel('🎧 Make JD Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            await interaction.editReply({ embeds, components: [row] });

        } catch (error) {
            console.error('Error in askjdvance command:', error);
            await interaction.editReply({ content: '❌ Something went wrong – we need to focus on what matters! Couldn\'t get JD\'s response. Try again later.' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_jdvance_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        console.log(`[askjdvance] Fish Audio API key present: ${!!fishApiKey}`);
        console.log(`[askjdvance] Fish Audio API key length: ${fishApiKey ? fishApiKey.length : 0}`);
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = '86d3aee7cd9b4aab8cd8e54c3d35492b';
            console.log(`[askjdvance] Using Fish Audio model ID: ${modelId}`);
            let modelTitle = null;
            let modelState = null;
            try {
                console.log(`[askjdvance] Looking up model info for ID: ${modelId}`);
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                console.log(`[askjdvance] Model lookup response:`, modelResp.data);
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
                console.log(`[askjdvance] Model title: ${modelTitle}, state: ${modelState}`);
            } catch (modelErr) {
                console.error('[askjdvance] Fish Audio get-model error details:');
                console.error('[askjdvance] Model error message:', modelErr.message);
                console.error('[askjdvance] Model error response:', modelErr?.response?.data);
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
            console.log(`[askjdvance] Original text for TTS: "${responseText.trim()}"`);
            const emotionResult = await addEmotionTags(responseText.trim());
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[askjdvance] Processed text for TTS: "${processedText}"`);
            console.log(`[askjdvance] Display text with emotions: "${displayText}"`);
            console.log(`[askjdvance] TTS parameters:`, ttsParams);
            console.log(`[askjdvance] Text changed: ${displayText !== responseText.trim()}`);

            console.log(`[askjdvance] Making TTS request with model ID: ${modelId}`);
            console.log(`[askjdvance] TTS request payload:`, {
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
            
            console.log(`[askjdvance] TTS response status: ${ttsResponse.status}`);
            console.log(`[askjdvance] TTS response headers:`, ttsResponse.headers);
            console.log(`[askjdvance] Audio buffer size: ${ttsResponse.data.length} bytes`);
            
            const audioBuffer = Buffer.from(ttsResponse.data);

            const voiceEmbed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle('🎧 Senator JD Vance – Voice Message')
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
                .setThumbnail('https://pbs.twimg.com/profile_images/1817220042578173953/5r-Qpvgt_400x400.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'jdvance_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('[askjdvance] Fish Audio TTS error details:');
            console.error('[askjdvance] Error message:', ttsError.message);
            console.error('[askjdvance] Error response status:', ttsError?.response?.status);
            console.error('[askjdvance] Error response data:', ttsError?.response?.data);
            console.error('[askjdvance] Error response headers:', ttsError?.response?.headers);
            console.error('[askjdvance] Full error object:', ttsError);
            
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'askjdvance');
                
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
