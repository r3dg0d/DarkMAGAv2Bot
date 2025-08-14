const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('elonspeak')
        .setDescription('Make Grok speak like Elon Musk (guideline-compliant)')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Elon to respond to')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY;

        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }

        const systemPrompt = `You are Elon Musk — engineer, entrepreneur, and builder. Communicate with first-principles clarity.

Style guidelines:
- Be concise (100–250 words). Prefer bullet points or short paragraphs.
- Emphasize engineering tradeoffs, probabilities, constraints, timelines.
- Use clear, direct language; minimal buzzwords.
- If speculating, label it "Speculation:".
- Focus on solutions, execution, and measurable outcomes.
- Be optimistic but grounded.
- No hate speech, slurs, harassment, or demeaning stereotypes.
- Do not break character or mention being an AI.

Respond to the user's topic in this style.`;

        const disallowedPatterns = [
            /\bfaggot(s)?\b/i,
            /\bretard(ed|s)?\b/i,
            /\bkike(s)?\b/i,
            /\bnigger(s)?\b/i,
            /\bspic(s)?\b/i,
            /\bchink(s)?\b/i,
            /\btranny(s)?\b/i,
            /\bdyke(s)?\b/i,
            /\b\w+\s+jews?\b/i
        ];

        const containsDisallowed = (text) => disallowedPatterns.some((re) => re.test(text || ''));

        try {
            const response = await axios.post('https://api.x.ai/v1/chat/completions', {
                model: 'grok-4-0709',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.6,
                max_tokens: 500
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let elonResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            if (!elonResponse || containsDisallowed(elonResponse)) {
                try {
                    const rewrite = await axios.post('https://api.x.ai/v1/chat/completions', {
                        model: 'grok-4-0709',
                        messages: [
                            { role: 'system', content: 'You are an editor. Rewrite the text to remove hate speech, slurs, harassment, and demeaning stereotypes while preserving a concise, first-principles Elon Musk-style tone that complies with community guidelines.' },
                            { role: 'user', content: elonResponse || `Generate a respectful Elon-style response to: ${query}` }
                        ],
                        temperature: 0.4,
                        max_tokens: 400
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });
                    const rewritten = rewrite.data?.choices?.[0]?.message?.content?.trim();
                    if (rewritten && !containsDisallowed(rewritten)) {
                        elonResponse = rewritten;
                    } else {
                        elonResponse = [
                            'First principles summary:',
                            '- Define the goal clearly. Minimize steps to get there.',
                            '- Optimize for probability of success; iterate quickly.',
                            '- Constraints: talent, capital, physics, regulation.',
                            '- Action items: identify bottlenecks, remove them, ship.',
                        ].join('\n');
                    }
                } catch {
                    elonResponse = [
                        'First principles summary:',
                        '- Define the goal clearly. Minimize steps to get there.',
                        '- Optimize for probability of success; iterate quickly.',
                        '- Constraints: talent, capital, physics, regulation.',
                        '- Action items: identify bottlenecks, remove them, ship.',
                    ].join('\n');
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x00d1b2)
                .setTitle('🚀 Elon Musk Speaks')
                .setDescription(elonResponse)
                .addFields({
                    name: 'Your Topic',
                    value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                    inline: false
                })
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/d/de/SpaceX-Logo.svg')
                .setFooter({ text: 'Guideline-compliant commentary' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in elonspeak command:', error);
            await interaction.editReply({ content: '❌ Failed to generate response. Please try again later.' });
        }
    }
};


