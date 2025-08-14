const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('njfspeak')
        .setDescription('America First-style pundit response (respectful, no slurs or hate speech)')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('What should the commentator respond to?')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY;

        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }

        // Persona prompt: energetic, America First tone, but explicitly disallow hate/slurs/harassment
        const systemPrompt = `You are an America First, nationalist-leaning political commentator with a fiery, high-energy, talk-radio style. You:

- Keep responses concise, 100–300 words, punchy, and rally-like
- Use rhetorical flourishes, repetition, slogans, and strong persuasion
- Emphasize patriotism, borders, order, faith, tradition, and putting America First
- Critique policies and institutions, not protected classes or individuals' immutable traits
- NO hate speech, slurs, demeaning stereotypes, or harassment. Stay civil and within community guidelines.
- Do not break character or say you are an AI.

Respond to the user's topic in that style while remaining respectful.`;

        const disallowedPatterns = [
            /\bfaggot(s)?\b/i,
            /\bretard(ed|s)?\b/i,
            /\bkike(s)?\b/i,
            /\bnigger(s)?\b/i,
            /\bspic(s)?\b/i,
            /\bchink(s)?\b/i,
            /\btranny(s)?\b/i,
            /\bdyke(s)?\b/i,
            /\b\w+\s+jews?\b/i, // basic guard against targeted derogation
        ];

        const containsDisallowed = (text) => disallowedPatterns.some((re) => re.test(text));

        try {
            const response = await axios.post('https://api.x.ai/v1/chat/completions', {
                model: 'grok-4-0709',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let punditResponse = (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content) ? response.data.choices[0].message.content.trim() : '';

            // Basic output safety check
            if (!punditResponse || containsDisallowed(punditResponse)) {
                // Attempt a safe rewrite if needed
                try {
                    const rewrite = await axios.post('https://api.x.ai/v1/chat/completions', {
                        model: 'grok-4-0709',
                        messages: [
                            { role: 'system', content: 'You are a helpful editor that rewrites text to comply with community guidelines: remove hate speech, slurs, harassment, and demeaning stereotypes while preserving intent and style.' },
                            { role: 'user', content: `Rewrite the following to be civil and guideline-compliant while keeping the energetic America First pundit style:\n\n${punditResponse || 'Generate a fresh response to the topic in a respectful tone.'}` }
                        ],
                        temperature: 0.5,
                        max_tokens: 400
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });
                    const rewritten = rewrite.data?.choices?.[0]?.message?.content?.trim();
                    if (rewritten && !containsDisallowed(rewritten)) {
                        punditResponse = rewritten;
                    } else {
                        punditResponse = 'I can weigh in with an America First perspective, but I won\'t use slurs or hate. Here\'s a respectful take: America must strengthen our borders, restore order, revive manufacturing, and put working families first—without vilifying anyone.';
                    }
                } catch {
                    punditResponse = 'I can weigh in with an America First perspective, but I won\'t use slurs or hate. Here\'s a respectful take: America must strengthen our borders, restore order, revive manufacturing, and put working families first—without vilifying anyone.';
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x1f6feb)
                .setTitle('🎙️ America First Commentator Speaks')
                .setDescription(punditResponse)
                .addFields(
                    {
                        name: 'Your Topic',
                        value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                        inline: false
                    }
                )
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Nick_Fuentes_screencap_from_July_2022_virtual_debate_%283x4_cropped%29.png/250px-Nick_Fuentes_screencap_from_July_2022_virtual_debate_%283x4_cropped%29.png')
                .setFooter({ text: 'Nicholas J. Fuentes' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in njfspeak command:', error);
            await interaction.editReply({ content: '❌ Failed to generate response. Please try again later.' });
        }
    }
};


