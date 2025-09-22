const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uncensoredlm')
        .setDescription('Generate uncensored text using Uncensored LM API (Trial Mod+ Only)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send to the AI')
                .setRequired(true)),
    
    permissions: ['trialMod'],
    
    async execute(interaction, bot) {
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
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔊');
            
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
                    text: 'Powered by Uncensored.AI',
                    iconURL: 'https://pbs.twimg.com/profile_images/1928141117062545408/ZC5izKZr_400x400.jpg'
                })
                .setTimestamp();
            
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
            
            // Clean up markdown formatting for TTS
            function cleanTextForTTS(text) {
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
            
            // Clean the text for TTS
            const cleanedText = cleanTextForTTS(responseText);
            
            console.log('TTS handler: Original text length:', responseText.length);
            console.log('TTS handler: Cleaned text length:', cleanedText.length);
            console.log('TTS handler: FishAudio API key exists:', !!process.env.FISHAUDIO_API);

            // Split text into chunks for multiple audio generation
            const chunkSize = 1000;
            const textChunks = [];
            
            for (let i = 0; i < cleanedText.length; i += chunkSize) {
                const chunk = cleanedText.substring(i, i + chunkSize);
                textChunks.push(chunk);
            }

            console.log(`TTS handler: Split into ${textChunks.length} chunks`);

            // Generate TTS for each chunk
            const audioBuffers = [];
            
            for (let i = 0; i < textChunks.length; i++) {
                console.log(`TTS handler: Generating audio for chunk ${i + 1}/${textChunks.length}`);
                
                const fishAudioResponse = await fetch('https://api.fish.audio/v1/tts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.FISHAUDIO_API || ''}`,
                        'model': 's1'
                    },
                    body: JSON.stringify({
                        text: textChunks[i],
                        reference_id: 'c8ad22ac181e44ca871a77a79ac3239b',
                        format: 'wav',
                        temperature: 0.7,
                        top_p: 0.7,
                        normalize: true,
                        latency: 'normal',
                        chunk_length: 300
                    })
                });

                if (!fishAudioResponse.ok) {
                    const errorText = await fishAudioResponse.text();
                    console.error(`FishAudio API Error for chunk ${i + 1}:`, fishAudioResponse.status, errorText);
                    await interaction.editReply({ 
                        content: `❌ Failed to generate TTS audio for chunk ${i + 1}. Please try again later.` 
                    });
                    return true;
                }

                const audioBuffer = await fishAudioResponse.arrayBuffer();
                audioBuffers.push(Buffer.from(audioBuffer));
            }

            // Stitch audio buffers together
            console.log('TTS handler: Stitching audio chunks together');
            const combinedAudioBuffer = Buffer.concat(audioBuffers);
            
            // Create attachment
            const audioAttachment = new AttachmentBuilder(combinedAudioBuffer, {
                name: 'uncensored_ai_response.wav',
                description: `AI-generated speech from Uncensored.AI (${textChunks.length} chunks combined)`
            });

            // Send combined audio file
            await interaction.editReply({ 
                content: `🔊 **Audio Generated!** (${textChunks.length} chunks combined)`,
                files: [audioAttachment]
            });

        } catch (error) {
            console.error('Error generating TTS:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while generating TTS audio.' 
            });
        }

        return true;
    }
};
