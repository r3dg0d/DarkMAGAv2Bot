const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listvoicemodels')
        .setDescription('List available Fish Audio voice models')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number (default 1)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription('Page size (default 10)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Filter by title contains')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const apiKey = process.env.FISHAUDIO_API;
        if (!apiKey) {
            return interaction.editReply({ content: '❌ Fish Audio API key not configured. Set `FISHAUDIO_API` on the host.' });
        }

        const page = interaction.options.getInteger('page') || 1;
        const size = interaction.options.getInteger('size') || 10;
        const title = interaction.options.getString('title') || undefined;

        try {
            const params = new URLSearchParams();
            params.set('page_number', String(page));
            params.set('page_size', String(size));
            if (title) params.set('title', title);

            const url = `https://api.fish.audio/model?${params.toString()}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const items = response.data?.items || [];

            if (items.length === 0) {
                await interaction.editReply('No models found for the given filters.');
                return;
            }

            const fields = items.slice(0, size).map((m, idx) => ({
                name: `${idx + 1}. ${m.title || 'Untitled'}`,
                value: `ID: 
${m._id}
Type: ${m.type || 'n/a'} | State: ${m.state || 'n/a'}`,
                inline: false
            }));

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎵 Fish Audio Voice Models')
                .setDescription(`Page ${page} | Size ${size}${title ? ` | Filter: "${title}"` : ''}`)
                .addFields(fields)
                .setFooter({ text: 'Use the model ID with supported TTS commands' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing Fish Audio models:', error?.response?.data || error.message);
            await interaction.editReply('❌ Failed to list voice models.');
        }
    }
};


