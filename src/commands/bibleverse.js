const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bibleverse')
        .setDescription('Look up a Bible verse')
        .addStringOption(option =>
            option.setName('reference')
                .setDescription('Bible verse reference (e.g., John 3:16, Genesis 1:1-3)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('version')
                .setDescription('Bible version to use')
                .setRequired(false)
                .addChoices(
                    { name: 'King James Version (KJV)', value: 'kjv' },
                    { name: 'American Standard Version (ASV)', value: 'asv' },
                    { name: 'Bible in Basic English (BBE)', value: 'bbe' },
                    { name: 'Darby Bible', value: 'darby' },
                    { name: 'Douay-Rheims (DRA)', value: 'dra' },
                    { name: 'World English Bible (WEB)', value: 'web' },
                    { name: 'Young\'s Literal Translation (YLT)', value: 'ylt' },
                    { name: 'Open English Bible US (OEB-US)', value: 'oeb-us' },
                    { name: 'Open English Bible UK (OEB-CW)', value: 'oeb-cw' },
                    { name: 'World English Bible UK (WEBBE)', value: 'webbe' }
                )),
    
    async execute(interaction, bot) {
        const reference = interaction.options.getString('reference');
        const version = interaction.options.getString('version') || 'kjv';
        
        await interaction.deferReply();
        
        try {
            const verseData = await this.fetchBibleVerse(reference, version);
            
            if (!verseData) {
                await interaction.editReply({ 
                    content: '❌ Could not find that Bible verse. Please check the reference format (e.g., John 3:16, Genesis 1:1-3).' 
                });
                return;
            }
            
            const embed = this.createVerseEmbed(verseData, version);
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error fetching Bible verse:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while fetching the Bible verse. Please try again later.' 
            });
        }
    },

    async fetchBibleVerse(reference, version = 'kjv') {
        try {
            // Clean and format the reference
            const cleanRef = reference.trim().replace(/\s+/g, ' ');
            
            // Try multiple API endpoints for better reliability
            const apis = [
                // Primary API - Bible API with version parameter
                `https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=${version}`,
                // Alternative API - Bible API without version (defaults to KJV)
                `https://bible-api.com/${encodeURIComponent(cleanRef)}`,
                // Fallback - Simple format with version parameter
                `https://bible-api.com/${cleanRef.replace(/\s+/g, '+')}?translation=${version}`
            ];
            
            for (const apiUrl of apis) {
                try {
                    console.log(`Trying API: ${apiUrl}`);
                    const response = await axios.get(apiUrl, {
                        timeout: 8000,
                        headers: {
                            'User-Agent': 'DarkMAGABot/1.0',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.data && response.data.text) {
                        return {
                            reference: response.data.reference || cleanRef,
                            text: response.data.text,
                            translation_name: response.data.translation_name || version.toUpperCase(),
                            translation_id: response.data.translation_id || version
                        };
                    }
                } catch (apiError) {
                    console.log(`API failed: ${apiUrl} - ${apiError.message}`);
                    continue; // Try next API
                }
            }
            
            // If all APIs fail, try a local fallback for common verses
            return this.getLocalVerse(cleanRef, version);
            
        } catch (error) {
            console.error('All Bible APIs failed:', error.message);
            return null;
        }
    },

    // Local fallback for common Bible verses
    getLocalVerse(reference, version) {
        const commonVerses = {
            'john 3:16': {
                kjv: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
                niv: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
                esv: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.'
            },
            'genesis 1:1': {
                kjv: 'In the beginning God created the heaven and the earth.',
                niv: 'In the beginning God created the heavens and the earth.',
                esv: 'In the beginning, God created the heavens and the earth.'
            },
            'psalm 23:1': {
                kjv: 'The Lord is my shepherd; I shall not want.',
                niv: 'The Lord is my shepherd, I lack nothing.',
                esv: 'The Lord is my shepherd; I shall not want.'
            }
        };
        
        const normalizedRef = reference.toLowerCase().trim();
        const verseData = commonVerses[normalizedRef];
        
        if (verseData && verseData[version]) {
            return {
                reference: reference,
                text: verseData[version],
                translation_name: version.toUpperCase(),
                translation_id: version
            };
        }
        
        return null;
    },

    createVerseEmbed(verseData, version) {
        const embed = new EmbedBuilder()
            .setColor(0xFFD700) // Gold color
            .setTitle(`📖 ${verseData.reference}`)
            .setDescription(verseData.text)
            .addFields(
                {
                    name: 'Translation',
                    value: verseData.translation_name || version.toUpperCase(),
                    inline: true
                }
            )
            .setFooter({ 
                text: 'Dark MAGA Bot • Bible Verse Lookup'
            })
            .setTimestamp();

        return embed;
    },

    // Function to detect Bible verses in messages
    async detectAndRespondToVerse(message, bot) {
        // Skip if message is from a bot
        if (message.author.bot) return;
        
        // Regex pattern to detect Bible verse references
        const versePattern = /\b([1-3]?\s?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+(?:-\d+)?)(?:\s+([A-Za-z]+))?\b/gi;
        
        const matches = message.content.match(versePattern);
        if (!matches) return;
        
        console.log(`Bible verse detected in message: "${message.content}" - Matches: ${matches.join(', ')}`);
        
        // Process each match
        for (const match of matches) {
            try {
                // Extract version if specified
                const parts = match.trim().split(/\s+/);
                let version = 'kjv'; // Default version
                let reference = match;
                
                // Check if last part is a version abbreviation
                const lastPart = parts[parts.length - 1].toLowerCase();
                const validVersions = ['kjv', 'asv', 'bbe', 'darby', 'dra', 'web', 'ylt', 'oeb-us', 'oeb-cw', 'webbe'];
                
                if (validVersions.includes(lastPart)) {
                    version = lastPart;
                    reference = parts.slice(0, -1).join(' ');
                }
                
                console.log(`Processing verse: "${reference}" with version: ${version}`);
                const verseData = await this.fetchBibleVerse(reference, version);
                
                if (verseData) {
                    console.log(`Successfully fetched verse: ${verseData.reference}`);
                    const embed = this.createVerseEmbed(verseData, version);
                    await message.reply({ embeds: [embed] });
                    
                    // Only respond to the first valid verse found to avoid spam
                    break;
                } else {
                    console.log(`Failed to fetch verse: ${reference}`);
                }
            } catch (error) {
                console.error('Error processing verse detection:', error);
            }
        }
    }
};
