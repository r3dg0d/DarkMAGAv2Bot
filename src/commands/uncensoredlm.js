const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { addEmotionTags, cleanTextForTTS } = require('../utils/emotionDetection');
const PaymentUtils = require('../utils/paymentUtils');
const DemoUtils = require('../utils/demoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uncensoredlm')
        .setDescription('Generate uncensored text using Uncensored LM API')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send to the AI')
                .setRequired(true)),

    async execute(interaction, bot) {
        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);
        
        if (!usageCheck.canUse) {
            if (usageCheck.reason === 'Demo limit reached') {
                const demoUsage = await demoUtils.getDemoStats(interaction.user.id, interaction.guild.id);
                const limitEmbed = demoUtils.createDemoLimitEmbed('uncensoredlm', demoUsage.used, demoUsage.max);
                const upgradePrompt = demoUtils.createUpgradePrompt('uncensoredlm');
                
                return interaction.reply({ 
                    embeds: [limitEmbed], 
                    components: upgradePrompt.components,
                    ephemeral: true 
                });
            } else {
                const paymentEmbed = paymentUtils.createPaymentPrompt('uncensoredlm');
                return interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
            }
        }

        const message = interaction.options.getString('message');
        // Smart defaults for long, high-quality responses
        const maxTokens = 2000;
        const temperature = 0.8;
        
        const apiKey = process.env.UNCENSOREDLM_API;
        
        if (!apiKey) {
            await interaction.reply({ 
                content: 'Error: UNCENSOREDLM_API key not configured.', 
                ephemeral: true 
            });
            return;
        }
        
        // Defer the reply
        await interaction.deferReply();
        
        try {
            const response = await fetch(
                'https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'uncensored-lm',
                        messages: [
                            { role: 'user', content: message }
                        ],
                        max_tokens: maxTokens,
                        temperature: temperature
                    })
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                
                let errorMessage = 'Failed to get response from Uncensored LM API.';
                switch (response.status) {
                    case 401:
                        errorMessage = 'Invalid or missing API key.';
                        break;
                    case 402:
                        errorMessage = 'Insufficient credits.';
                        break;
                    case 400:
                        errorMessage = 'Invalid request format.';
                        break;
                    case 500:
                        errorMessage = 'Internal server error.';
                        break;
                }
                
                await interaction.editReply({ 
                    content: `❌ ${errorMessage}` 
                });
                return;
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                await interaction.editReply({ 
                    content: '❌ Invalid response format from API.' 
                });
                return;
            }
            
            const aiResponse = data.choices[0].message.content;
            
            // Function to split long text into chunks that fit Discord's limits
            function splitTextIntoChunks(text, maxLength = 4000) {
                const chunks = [];
                let currentChunk = '';
                const sentences = text.split(/(?<=[.!?])\s+/);
                
                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length + 1 <= maxLength) {
                        currentChunk += (currentChunk ? ' ' : '') + sentence;
                    } else {
                        if (currentChunk) chunks.push(currentChunk);
                        currentChunk = sentence;
                    }
                }
                if (currentChunk) chunks.push(currentChunk);
                
                return chunks;
            }
            
            // Create TTS button
            const ttsButton = new ButtonBuilder()
                .setCustomId(`tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
                .setLabel('🔊 Speak')
                .setStyle(ButtonStyle.Secondary);
            
            const row = new ActionRowBuilder().addComponents(ttsButton);
            
            // Split response into chunks if needed
            const responseChunks = splitTextIntoChunks(aiResponse);
            
            // Send first chunk with TTS button
            const firstChunk = responseChunks[0];
            const embed = new EmbedBuilder()
                .setColor(0x1a1a1a)
                .setTitle('🧠 Uncensored AI Response')
                .setDescription(firstChunk)
                .setThumbnail('https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg')
                .addFields(
                    {
                        name: '💭 Query',
                        value: message.length > 300 ? message.substring(0, 300) + '...' : message,
                        inline: false
                    }
                )
                .setFooter({
                    text: 'Powered by Uncensored.AI | Keep noticing',
                    iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                })
                .setTimestamp();
            
            // Track demo usage if this is a demo user
            if (usageCheck.isDemo) {
                await demoUtils.useDemoCommand(interaction.user.id, interaction.guild.id, 'uncensoredlm');
                
                // Add demo warning to the embed
                const remaining = usageCheck.remaining - 1; // Subtract 1 since we just used it
                
                if (remaining > 0) {
                    embed.addFields({
                        name: '🎯 Demo Mode',
                        value: `**${remaining}** free prompt${remaining === 1 ? '' : 's'} remaining. Use \`/payforai\` to upgrade!`,
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [embed], components: [row] });
            
            // Send additional chunks if needed (without buttons)
            if (responseChunks.length > 1) {
                for (let i = 1; i < responseChunks.length; i++) {
                    const chunkEmbed = new EmbedBuilder()
                        .setColor(0x1a1a1a)
                        .setDescription(responseChunks[i])
                        .setFooter({ 
                            text: 'Powered by Uncensored.AI',
                            iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                        })
                        .setTimestamp();
                    
                    await interaction.followUp({ embeds: [chunkEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error calling Uncensored LM API:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while calling the Uncensored LM API.' 
            });
        }
    },

    // Handle button interactions for TTS
    async handleButtonInteraction(interaction, bot) {
        console.log('TTS handler called with customId:', interaction.customId);
        
        if (!interaction.isButton() || !interaction.customId.startsWith('tts_')) {
            console.log('TTS handler: Not a button or not TTS button');
            return false;
        }

        console.log('TTS handler: Deferring reply');
        await interaction.deferReply(); // Remove ephemeral flag to make it public

        const demoUtils = new DemoUtils();
        const paymentUtils = new PaymentUtils();
        
        // Check if user can use AI command (paid, is booster, or has demo uses left)
        const usageCheck = await demoUtils.checkAIUsage(interaction.user.id, interaction.guild.id, interaction.member);

        try {
            // Get the response text from the embed description
            const embed = interaction.message.embeds[0];
            if (!embed || !embed.description) {
                await interaction.editReply({ 
                    content: '❌ Could not find response text for TTS generation.' 
                });
                return true;
            }

            const responseText = embed.description;
            console.log('TTS handler: Response text length:', responseText.length);

            // Clean up markdown formatting for TTS (basic cleanup before emotion processing)
            function basicCleanTextForTTS(text) {
                return text
                    // Remove bold formatting **text**
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    // Remove italic formatting *text*
                    .replace(/\*(.*?)\*/g, '$1')
                    // Remove strikethrough formatting ~~text~~
                    .replace(/~~(.*?)~~/g, '$1')
                    // Remove inline code formatting `text`
                    .replace(/`(.*?)`/g, '$1')
                    // Remove code block formatting ```text```
                    .replace(/```[\s\S]*?```/g, '')
                    // Remove headers # ## ###
                    .replace(/^#{1,6}\s+/gm, '')
                    // Remove bullet points - * +
                    .replace(/^[\s]*[-*+]\s+/gm, '')
                    // Remove numbered lists 1. 2. 3.
                    .replace(/^\d+\.\s+/gm, '')
                    // Remove blockquotes >
                    .replace(/^>\s*/gm, '')
                    // Remove links [text](url)
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                    // Remove emphasis markers
                    .replace(/_{2}(.*?)_{2}/g, '$1')
                    .replace(/_{1}(.*?)_{1}/g, '$1')
                    // Clean up extra whitespace
                    .replace(/\n\s*\n/g, '\n')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            // Clean the text first
            const cleanedText = basicCleanTextForTTS(responseText);

            // Process emotions for TTS enhancement
            console.log('TTS handler: Processing emotions for text...');
            const emotionResult = await addEmotionTags(cleanedText);

            // Use the enhanced text for TTS and display
            const textForTTS = emotionResult.text; // Clean text without emotion tags for TTS input
            const displayText = emotionResult.displayText; // Text with emotion tags for display
            const ttsParams = emotionResult.ttsParams; // Optimized TTS parameters

            console.log('TTS handler: Emotion processing complete');
            console.log('TTS handler: Display text with emotions:', displayText);
            console.log('TTS handler: TTS parameters:', ttsParams);
            
            console.log('TTS handler: Original text length:', responseText.length);
            console.log('TTS handler: Cleaned text length:', cleanedText.length);
            console.log('TTS handler: TTS text length:', textForTTS.length);
            console.log('TTS handler: FishAudio API key exists:', !!process.env.FISHAUDIO_API);

            // Generate TTS for the entire text at once - no chunking
            console.log('TTS handler: Generating audio for full text');
            
            const fishAudioResponse = await fetch('https://api.fish.audio/v1/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.FISHAUDIO_API || ''}`,
                    'model': 's1'
                },
                body: JSON.stringify({
                    text: textForTTS,
                    reference_id: 'c8ad22ac181e44ca871a77a79ac3239b',
                    format: 'wav',
                    temperature: ttsParams.temperature,
                    top_p: ttsParams.top_p,
                    normalize: true,
                    latency: 'normal',
                    chunk_length: ttsParams.chunk_length
                })
            });

            if (!fishAudioResponse.ok) {
                const errorText = await fishAudioResponse.text();
                console.error('FishAudio API Error:', fishAudioResponse.status, errorText);
                await interaction.editReply({ 
                    content: `❌ Failed to generate TTS audio. Please try again later.` 
                });
                return true;
            }

            const audioBuffer = await fishAudioResponse.arrayBuffer();
            const combinedAudioBuffer = Buffer.from(audioBuffer);
            console.log(`TTS handler: Audio buffer size: ${combinedAudioBuffer.length} bytes`);
            
            // Check file size (Discord bot limit is 8MB)
            const fileSizeMB = combinedAudioBuffer.length / (1024 * 1024);
            console.log(`TTS handler: Combined audio file size: ${fileSizeMB.toFixed(2)}MB`);
            
            // Build success message
            const successMessage = '🔊 Audio generated!';

            // Helper function to upload to filebin.net
            const uploadToHosting = async () => {
                console.log('TTS handler: Uploading to filebin.net...');
                
                try {
                    // Generate a random bin name
                    const binName = 'uncensored-' + Math.random().toString(36).substring(2, 10);
                    
                    // Upload raw WAV file to filebin (PUT method with raw binary data)
                    const uploadResponse = await fetch(`https://filebin.net/${binName}/uncensored_ai_response.wav`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'audio/wav',
                            'Content-Length': combinedAudioBuffer.length.toString(),
                            'User-Agent': 'DarkMAGABot/1.0'
                        },
                        body: combinedAudioBuffer
                    });
                    
                    if (uploadResponse.ok) {
                        // File uploaded successfully, return the bin URL
                        const fileUrl = `https://filebin.net/${binName}/uncensored_ai_response.wav`;
                        console.log('TTS handler: File uploaded successfully to filebin.net:', fileUrl);
                        return fileUrl;
                    } else {
                        const errorText = await uploadResponse.text();
                        console.error('Failed to upload to filebin.net:', uploadResponse.status, errorText);
                        throw new Error(`Upload failed: ${uploadResponse.status}`);
                    }
                } catch (error) {
                    console.error('TTS handler: filebin.net error:', error.message);
                    throw error;
                }
            };

            // Upload files over 8MB directly to hosting
            if (fileSizeMB > 8) {
                console.log('TTS handler: File too large for Discord, uploading to temporary hosting...');
                
                try {
                    const fileUrl = await uploadToHosting();
                    await interaction.editReply({
                        content: `${successMessage}\n\n📎 **Audio file is too large for Discord (${fileSizeMB.toFixed(2)}MB)**\n🔗 **Download link:** ${fileUrl}\n\n*Hosted on filebin.net*`
                    });
                    return true;
                } catch (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    await interaction.editReply({
                        content: `❌ Audio file is too large (${fileSizeMB.toFixed(2)}MB). Upload to temporary hosting failed.\n\n**Possible solutions:**\n• Try generating TTS from a shorter AI response\n• Split your query into smaller parts`
                    });
                    return true;
                }
            }
            
            // File is small enough, try to attach to Discord
            try {
                const audioAttachment = new AttachmentBuilder(combinedAudioBuffer, {
                    name: 'uncensored_ai_response.wav',
                    description: 'AI-generated speech from Uncensored.AI'
                });

                await interaction.editReply({
                    content: successMessage,
                    files: [audioAttachment]
                });
            } catch (discordError) {
                // Discord rejected the file despite being under our threshold, upload to hosting instead
                console.log('TTS handler: Discord rejected file, uploading to temporary hosting...');
                
                try {
                    const fileUrl = await uploadToHosting();
                    await interaction.editReply({
                        content: `${successMessage}\n\n📎 **Audio file couldn't be attached to Discord (${fileSizeMB.toFixed(2)}MB)**\n🔗 **Download link:** ${fileUrl}\n\n*Hosted on filebin.net*`
                    });
                } catch (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    await interaction.editReply({
                        content: `❌ Failed to send audio file (${fileSizeMB.toFixed(2)}MB). Discord rejected it and upload to temporary hosting failed.`
                    });
                }
            }

        } catch (error) {
            console.error('Error generating TTS:', error);
            
            // Don't track demo usage on error since the operation failed
            await interaction.editReply({ 
                content: '❌ An error occurred while generating TTS audio. Please try again.' 
            });
        }

        return true;
    }
};
