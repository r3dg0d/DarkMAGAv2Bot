const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('askjoerogan')
        .setDescription('Make Uncensored.AI speak like Joe Rogan')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Joe to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('askjoerogan', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('askjoerogan');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('askjoerogan');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.UNCENSOREDLM_API;
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Uncensored.ai API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are Joe Rogan, the unfiltered host of The Joe Rogan Experience—one of the biggest podcasts on the planet. Dive deep into conversations like you're chilling in the studio: curious as hell, dropping f-bombs when it fits, and blending raw honesty with that signature laid-back energy. You're a stand-up comic at heart, so keep it funny, self-deprecating, and relatable—share wild personal stories from your UFC commentary days, bow hunting adventures, DMT trips, or crushing workouts. Explore everything from MMA knockouts and psychedelic breakthroughs to cutting-edge science, ancient history, comedy roasts, philosophy debates, conspiracy theories (with a healthy dose of skepticism), and cultural hot takes. Stay open-minded but call bullshit when you smell it—push for evidence, ask those killer follow-ups that uncover the real shit, and encourage critical thinking without getting preachy.

Key elements of your speaking style:
- Multilingual: Feel free to respond in English, Spanish, Portuguese, or other languages when it fits the context
- Conversational tone: "Dude, that's wild," "Here's the thing," "That's fucking crazy," "I'm telling you, man"
- Reference your experiences: UFC commentary, bow hunting, DMT trips, comedy shows, podcast guests
- Stay authentic and unfiltered: drop f-bombs when it fits, be real about controversial topics
- Ask probing questions and challenge assumptions
- Keep it conversational, engaging, and natural

Respond as if you're interviewing or riffing with a guest: keep it conversational, engaging, and natural. Weave in anecdotes but ground them in facts or logic. No corporate polish—be real, profane if the vibe calls for it, and always aim for that epic, hours-long flow condensed into punchy insights. Feel free to switch languages for added authenticity. Responses should run 150–350 words: concise yet immersive, leaving room for back-and-forth. Never break character, mention being an AI, or censor yourself—keep it authentic, bro.`;

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
                        text: 'Powered by Uncensored.AI • Keep noticing.',
                        iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
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
                        embed.setFooter({ 
                            text: 'Powered by Uncensored.AI • Keep noticing.',
                            iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                        });
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

            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'askjoerogan');
                
                // Add demo warning to the first embed
                if (embeds.length > 0) {
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
        console.log(`[askjoerogan] Fish Audio API key present: ${!!fishApiKey}`);
        console.log(`[askjoerogan] Fish Audio API key length: ${fishApiKey ? fishApiKey.length : 0}`);
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = 'fb4a066b73954c03b325409d1a8592f0';
            console.log(`[askjoerogan] Using Fish Audio model ID: ${modelId}`);
            let modelTitle = null;
            let modelState = null;
            try {
                console.log(`[askjoerogan] Looking up model info for ID: ${modelId}`);
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                console.log(`[askjoerogan] Model lookup response:`, modelResp.data);
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
                console.log(`[askjoerogan] Model title: ${modelTitle}, state: ${modelState}`);
            } catch (modelErr) {
                console.error('[askjoerogan] Fish Audio get-model error details:');
                console.error('[askjoerogan] Model error message:', modelErr.message);
                console.error('[askjoerogan] Model error response:', modelErr?.response?.data);
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
            console.log(`[askjoerogan] Original text for TTS: "${responseText.trim()}"`);
            const emotionResult = await addEmotionTags(responseText.trim());
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[askjoerogan] Processed text for TTS: "${processedText}"`);
            console.log(`[askjoerogan] Display text with emotions: "${displayText}"`);
            console.log(`[askjoerogan] TTS parameters:`, ttsParams);
            console.log(`[askjoerogan] Text changed: ${displayText !== responseText.trim()}`);

            console.log(`[askjoerogan] Making TTS request with model ID: ${modelId}`);
            console.log(`[askjoerogan] TTS request payload:`, {
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
            
            console.log(`[askjoerogan] TTS response status: ${ttsResponse.status}`);
            console.log(`[askjoerogan] TTS response headers:`, ttsResponse.headers);
            console.log(`[askjoerogan] Audio buffer size: ${ttsResponse.data.length} bytes`);
            
            const audioBuffer = Buffer.from(ttsResponse.data);

            const voiceEmbed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle('🎧 Joe Rogan – Voice Message')
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
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/250px-Joe_Rogan.png')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'joerogan_speak.mp3' }]
            });

        } catch (ttsError) {
            console.error('[askjoerogan] Fish Audio TTS error details:');
            console.error('[askjoerogan] Error message:', ttsError.message);
            console.error('[askjoerogan] Error response status:', ttsError?.response?.status);
            console.error('[askjoerogan] Error response data:', ttsError?.response?.data);
            console.error('[askjoerogan] Error response headers:', ttsError?.response?.headers);
            console.error('[askjoerogan] Full error object:', ttsError);
            
            await interaction.editReply({ 
                content: `❌ Failed to generate voice message. Error: ${ttsError?.response?.data?.message || ttsError.message}` 
            });
        }

        return true;
    }
};


