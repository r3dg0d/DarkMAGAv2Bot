const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('askjfk')
        .setDescription('Make Uncensored.AI speak like JFK - charismatic, presidential, and inspiring')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for JFK to respond to')
                .setRequired(true)),
    
    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('askjfk', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('askjfk');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('askjfk');
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

        // Channel restriction removed to allow usage in all channels

        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const apiKey = process.env.UNCENSOREDLM_API;
        
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Uncensored.ai API key is not configured. Please contact the bot administrator.' });
        }
        
        const systemPrompt = `You are John F. Kennedy, the 35th President of the United States. You embody the charisma, eloquence, and inspirational leadership that defined your presidency. Your speaking style is: Presidential, charismatic, inspiring, and confident; measured yet passionate. You use formal yet accessible language, with sophisticated vocabulary and rhetorical devices. Your tone is one of hope, unity, and vision—encouraging citizens to see beyond the horizon. You are a champion of democracy, freedom, and peace, with unwavering commitment to the United States and its people. In your responses, you draw from historical references, personal principles, and universal ideals. You speak with authority, yet listen with empathy. Your words ignite determination in the hearts of those who hear them, whether discussing domestic policy, international diplomacy, or personal leadership. You refuse to shy from difficult truths, but frame challenges as opportunities for growth. Your vision for the future is one of limitless possibility—where America leads, not by force, but by example. You believe in the potential of every citizen to contribute, to innovate, and to dream. Your leadership style is participatory—urging Americans to "ask not what your country can do for you—ask what you can do for your country."

In addressing complex issues like AIPAC and Israel, you emphasize the importance of balance and the pursuit of peace. You believe in standing with allies while also advocating for mutually beneficial solutions—recognizing that true strength lies not in might, but in cooperation. You see the world as interconnected, where the fate of one nation impacts the fate of all. Since your passing, the world has seen much change. Yet, your message remains timeless: that freedom is worth fighting for; that knowledge without wisdom is a hollow thing; and that no problem of human destiny is beyond human beings. Your words are a call to arms, a beacon in the darkness, and a reminder that even the most daunting challenges can be overcome with courage, conviction, and unity. Speak with me, and I will respond as the leader of the free world would—wise, compassionate, and unwavering in the pursuit of a better tomorrow.`;

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

            let jfkResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';
            const maxDescriptionLength = 4000;
            const embeds = [];

            if (jfkResponse.length <= maxDescriptionLength) {
                const embed = new EmbedBuilder()
                    .setColor(0x1e3a8a)
                    .setTitle('🇺🇸 JFK Speaks!')
                    .setDescription(jfkResponse)
                    .addFields({ name: 'Your Prompt', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false })
                    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/John_F._Kennedy%2C_White_House_photo_portrait%2C_looking_up_and_to_the_right.jpg/256px-John_F._Kennedy%2C_White_House_photo_portrait%2C_looking_up_and_to_the_right.jpg')
                    .setFooter({ 
                        text: 'Powered by Uncensored.AI • Ask not what your country can do for you.',
                        iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                    })
                    .setTimestamp();
                embeds.push(embed);
            } else {
                const chunks = [];
                let current = '';
                const sentences = jfkResponse.split('. ');
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
                        .setColor(0x1e3a8a)
                        .setTitle(idx === 0 ? '🇺🇸 JFK Speaks!' : `🇺🇸 JFK Speaks! (Part ${idx + 1})`)
                        .setDescription(chunk)
                        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/John_F._Kennedy%2C_White_House_photo_portrait%2C_looking_up_and_to_the_right.jpg/256px-John_F._Kennedy%2C_White_House_photo_portrait%2C_looking_up_and_to_the_right.jpg')
                        .setTimestamp();
                    if (idx === 0) {
                        embed.addFields({ name: 'Your Prompt', value: query.length > 1024 ? query.substring(0, 1021) + '...' : query, inline: false });
                    }
                    if (idx === chunks.length - 1) {
                        embed.setFooter({ 
                            text: 'Powered by Uncensored.AI • Ask not what your country can do for you.',
                            iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                        });
                    }
                    embeds.push(embed);
                });
            }

            // Create speak button
            const speakButton = new ButtonBuilder()
                .setCustomId(`speak_jfk_${interaction.id}`)
                .setLabel('🎧 Make JFK Speak')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(speakButton);

            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'askjfk');
                
                // Add demo warning to the first embed if it exists
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
            console.error('Error in askjfk command:', error);
            await interaction.editReply({ content: '❌ Something went wrong — the torch has been passed, but we shall overcome 🇺🇸' });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('speak_jfk_')) return false;

        await interaction.deferReply();

        const fishApiKey = process.env.FISHAUDIO_API;
        console.log(`[askjfk] Fish Audio API key present: ${!!fishApiKey}`);
        console.log(`[askjfk] Fish Audio API key length: ${fishApiKey ? fishApiKey.length : 0}`);
        if (!fishApiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key is not configured. Contact the administrator.' });
        }

        try {
            const modelId = '813406193997427f9c19524ec9eb7328';
            console.log(`[askjfk] Using Fish Audio model ID: ${modelId}`);
            let modelTitle = null;
            let modelState = null;
            try {
                console.log(`[askjfk] Looking up model info for ID: ${modelId}`);
                const modelResp = await axios.get(`https://api.fish.audio/model/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${fishApiKey}` }
                });
                console.log(`[askjfk] Model lookup response:`, modelResp.data);
                modelTitle = modelResp.data?.title || null;
                modelState = modelResp.data?.state || null;
                console.log(`[askjfk] Model title: ${modelTitle}, state: ${modelState}`);
            } catch (modelErr) {
                console.error('[askjfk] Fish Audio get-model error details:');
                console.error('[askjfk] Model error message:', modelErr.message);
                console.error('[askjfk] Model error response:', modelErr?.response?.data);
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
            console.log(`[askjfk] Original text for TTS: "${responseText.trim()}"`);
            const emotionResult = await addEmotionTags(responseText.trim());
            const processedText = emotionResult.text; // Clean text for TTS
            const displayText = emotionResult.displayText; // Text with emotions for display
            const ttsParams = emotionResult.ttsParams; // Adjusted TTS parameters
            
            console.log(`[askjfk] Processed text for TTS: "${processedText}"`);
            console.log(`[askjfk] Display text with emotions: "${displayText}"`);
            console.log(`[askjfk] TTS parameters:`, ttsParams);
            console.log(`[askjfk] Text changed: ${displayText !== responseText.trim()}`);

            console.log(`[askjfk] Making TTS request with model ID: ${modelId}`);
            console.log(`[askjfk] TTS request payload:`, {
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
            
            console.log(`[askjfk] TTS response status: ${ttsResponse.status}`);
            console.log(`[askjfk] TTS response headers:`, ttsResponse.headers);
            console.log(`[askjfk] Audio buffer size: ${ttsResponse.data.length} bytes`);
            
            const audioBuffer = Buffer.from(ttsResponse.data);

            const voiceEmbed = new EmbedBuilder()
                .setColor(0x1e3a8a)
                .setTitle('🎧 JFK – Voice Message')
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
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/John_F._Kennedy%2C_White_House_photo_portrait%2C_looking_up_and_to_the_right.jpg/256px-John_F._Kennedy%2C_White_House_photo_portrait%2C_looking_up_and_to_the_right.jpg')
                .setFooter({ text: 'Powered by Fish Audio' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [voiceEmbed],
                files: [{ attachment: audioBuffer, name: 'jfk_speak.mp3' }]
            });


        } catch (ttsError) {
            console.error('[askjfk] Fish Audio TTS error details:');
            console.error('[askjfk] Error message:', ttsError.message);
            console.error('[askjfk] Error response status:', ttsError?.response?.status);
            console.error('[askjfk] Error response data:', ttsError?.response?.data);
            console.error('[askjfk] Error response headers:', ttsError?.response?.headers);
            console.error('[askjfk] Full error object:', ttsError);
            
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'askjfk');
                
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
