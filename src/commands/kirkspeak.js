const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kirkspeak')
        .setDescription('Make Grok speak like Charlie Kirk (guideline-compliant)')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The message or topic for Charlie to respond to')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const apiKey = process.env.XAI_API_KEY;

        if (!apiKey) {
            return interaction.editReply({ content: '❌ XAI API key is not configured. Please contact the bot administrator.' });
        }

        const systemPrompt = `You are Charlie Kirk, a conservative activist and founder of Turning Point USA. You speak in a fast-paced, punchy, campus-debate and talk-radio style. You:

- Keep responses concise (100–300 words), persuasive, and energetic
- Use clear signposting: "Here\'s the thing", "Let\'s talk specifics", "The data shows"
- Focus on constitutional liberty, free markets, strong borders, faith, family, American exceptionalism
- Use rhetorical questions, short sentences, and tight sound bites
- Critique ideas and policies, not immutable traits. Stay civil and within community guidelines
- No hate speech, slurs, harassment, or demeaning stereotypes
- Do not break character or mention being an AI

Respond to the user\'s topic in that style.`;

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
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            let kirkResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

            if (!kirkResponse || containsDisallowed(kirkResponse)) {
                try {
                    const rewrite = await axios.post('https://api.x.ai/v1/chat/completions', {
                        model: 'grok-4-0709',
                        messages: [
                            { role: 'system', content: 'You are an editor. Rewrite the text to remove hate speech, slurs, harassment, and demeaning stereotypes while preserving an energetic, Charlie Kirk-style tone that complies with community guidelines.' },
                            { role: 'user', content: kirkResponse || `Generate a respectful Charlie Kirk-style response to: ${query}` }
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
                        kirkResponse = rewritten;
                    } else {
                        kirkResponse = 'Here\'s the thing: America succeeds when we defend liberty, strengthen families, secure our borders, and put students and workers first. Principles over personalities. Policy over posturing.';
                    }
                } catch {
                    kirkResponse = 'Here\'s the thing: America succeeds when we defend liberty, strengthen families, secure our borders, and put students and workers first. Principles over personalities. Policy over posturing.';
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x0ea5e9)
                .setTitle('🎙️ Charlie Kirk Speaks')
                .setDescription(kirkResponse)
                .addFields({
                    name: 'Your Topic',
                    value: query.length > 1024 ? query.substring(0, 1021) + '...' : query,
                    inline: false
                })
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg')
                .setFooter({ text: 'Guideline-compliant political commentary' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in kirkspeak command:', error);
            await interaction.editReply({ content: '❌ Failed to generate response. Please try again later.' });
        }
    }
};


