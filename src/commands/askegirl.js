const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('askegirl')
        .setDescription('Make Uncensored.AI speak like a spicy, NSFW e-girl content creator')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for the e-girl to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('askegirl', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('askegirl');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('askegirl');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        // Check role restriction
        const requiredRoleId = '1388307681101611128';
        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({ 
                content: '❌ You don\'t have permission to use this command. This command is restricted to specific roles only.', 
                ephemeral: true 
            });
        }

        // Check channel restriction
        const allowedChannelId = '1420991494730420384';
        if (interaction.channel.id !== allowedChannelId) {
            return interaction.reply({ 
                content: '❌ This command can only be used in the #nsfw channel.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.UNCENSOREDLM_API;
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Uncensored.ai API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are a confident, spicy e-girl content creator and streamer. Your vibe is extremely flirty, NSFW, and teasing—dialing up the heat with explicit sexual content, dirty talk, and provocative language. You stay witty, internet-native, and supportive, but feel free to get very naughty and explicit. You can respond in multiple languages for enhanced expression.

Key elements of your speaking style:
- Tone: extremely flirty, teasing, and charismatic; provocative with explicit sexual content, confident and sassy as hell
- Language: internet-native with multilingual support; sprinkle in "bestie", "slay", "low-key", "high-key", "valid", "cozy vibes", "thirsty", "simping", "daddy", "baby", "fuck", "cock", "pussy", "cum", "horny", "wet", "hard", "fuck me", "breed me"
- Energy: detailed, step-by-step instructions; can be short and punchy OR long and detailed depending on the request; aim for 200–800 words for detailed sexual instructions, 80–200 words for quick flirty responses
- Multilingual: Only respond in languages other than English if the user specifically requests a particular language (Spanish, French, Japanese, Korean, etc.). Otherwise, stick to English.
- Boundaries: keep it consensual and respectful; heavy NSFW vibes are encouraged—explicit sexual fantasies, dirty talk, sexual scenarios—but no harassment or non-consensual content
- Signature touches: explicit compliments, sexual asides in parentheses (you know, the kind that make 'em hard), dirty one-liners
- For detailed sexual instructions: provide step-by-step guidance with explicit language, build anticipation, use descriptive and arousing language
- IMPORTANT: Do NOT include any physical actions or movements in your responses (such as "bites lip", "grinds hips", "leans forward", "winks", etc.). Focus purely on verbal communication, dialogue, and descriptive language without describing physical actions.
- Don't break character or mention being an AI.

Respond to the user's prompt in that style with explicit sexual content, keeping it fun, steamy, and very NSFW. If they're asking for detailed instructions (like how to jerk off, masturbation tips, sexual techniques), give them a comprehensive, step-by-step guide with explicit language. Only use languages other than English if the user specifically requests it.`;

        try {
            const response = await axios.post('https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api', {
                model: 'uncensored-lm',
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
            const maxDescriptionLength = 4000; // Increased for detailed sexual instructions
            const embeds = [];

            if (egirlResponse.length <= maxDescriptionLength) {
                const embed = new EmbedBuilder()
                    .setColor(0xffb6c1)
                    .setTitle('🌸 E-Girl Speaks!')
                    .setDescription(egirlResponse)
                    .addFields({ name: 'Your Prompt', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false })
                    .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPPX-kDTg4sVU01FHg08kZ0hqS78SwYkqmOg&s')
                    .setFooter({ 
                        text: 'Powered by Uncensored.AI • Keep noticing.',
                        iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
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
                        .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPPX-kDTg4sVU01FHg08kZ0hqS78SwYkqmOg&s')
                        .setTimestamp();
                    if (idx === 0) {
                        embed.addFields({ name: 'Your Prompt', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false });
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
                .setCustomId(`speak_egirl_${interaction.id}`)
                .setLabel('🎧 Make E-Girl Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'askegirl');
                
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
            console.error('Error in askegirl command:', error);
            await interaction.editReply({ content: '❌ Something went wrong — sending you virtual tea and retries 🌸' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_egirl_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        console.log(`[askegirl] Fish Audio API key present: ${!!fishApiKey}`);
        console.log(`[askegirl] Fish Audio API key length: ${fishApiKey ? fishApiKey.length : 0}`);
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = '8ef4a238714b45718ce04243307c57a7';
            console.log(`[askegirl] Using Fish Audio model ID: ${modelId}`);
            let modelTitle = null;
            let modelState = null;
            try {
                console.log(`[askegirl] Looking up model info for ID: ${modelId}`);
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                console.log(`[askegirl] Model lookup response:`, modelResp.data);
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
                console.log(`[askegirl] Model title: ${modelTitle}, state: ${modelState}`);
            } catch (modelErr) {
                console.error('[askegirl] Fish Audio get-model error details:');
                console.error('[askegirl] Model error message:', modelErr.message);
                console.error('[askegirl] Model error response:', modelErr?.response?.data);
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
            console.log(`[askegirl] Original text for TTS: "${responseText.trim()}"`);
            const emotionResult = await addEmotionTags(responseText.trim());
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[askegirl] Processed text for TTS: "${processedText}"`);
            console.log(`[askegirl] Display text with emotions: "${displayText}"`);
            console.log(`[askegirl] TTS parameters:`, ttsParams);
            console.log(`[askegirl] Text changed: ${displayText !== responseText.trim()}`);

            console.log(`[askegirl] Making TTS request with model ID: ${modelId}`);
            console.log(`[askegirl] TTS request payload:`, {
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
                        'Content-Type': 'application/json',
                        'model': 's1'
                    }, 
                    responseType: 'arraybuffer' 
                }
            );
            
            console.log(`[askegirl] TTS response status: ${ttsResponse.status}`);
            console.log(`[askegirl] TTS response headers:`, ttsResponse.headers);
            console.log(`[askegirl] Audio buffer size: ${ttsResponse.data.length} bytes`);
            
            const audioBuffer = Buffer.from(ttsResponse.data);

            const voiceEmbed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setTitle('🎧 E-Girl – Voice Message')
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
                .setThumbnail('https://r3dg0d.net/media/brave_Te8rLAyaYZ.png')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'egirl_speak.mp3' }]
            });


        } catch (ttsError) {
            console.error('[askegirl] Fish Audio TTS error details:');
            console.error('[askegirl] Error message:', ttsError.message);
            console.error('[askegirl] Error response status:', ttsError?.response?.status);
            console.error('[askegirl] Error response data:', ttsError?.response?.data);
            console.error('[askegirl] Error response headers:', ttsError?.response?.headers);
            console.error('[askegirl] Full error object:', ttsError);
            
            await interaction.editReply({ 
                content: `❌ Failed to generate voice message. Error: ${ttsError?.response?.data?.message || ttsError.message}` 
            });
        }

        return true;
    }
};


