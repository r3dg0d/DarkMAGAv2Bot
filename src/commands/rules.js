const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Display the server rules and guidelines (Founder Only)'),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🇺🇸 Dark MAGA Server Rules')
            .setDescription('Please read and follow these rules to maintain a respectful and productive community environment.')
            .addFields(
                {
                    name: '1. Respect and Civility',
                    value: 'Treat all members with respect and dignity. Personal attacks, harassment, or bullying will not be tolerated.',
                    inline: false
                },
                {
                    name: '2. No Hate Speech or Discrimination',
                    value: 'Discriminatory language, hate speech, or content promoting violence against any group is strictly prohibited.',
                    inline: false
                },
                {
                    name: '3. No Nazi Imagery or Hitler-Posting',
                    value: 'Any content featuring Nazi symbols, imagery, or references to Adolf Hitler is absolutely forbidden. This includes memes, images, or discussions that glorify or promote Nazi ideology.',
                    inline: false
                },
                {
                    name: '4. No Furry Content',
                    value: 'Furry-related content, including artwork, discussions, or references to anthropomorphic characters, is not permitted in this server.',
                    inline: false
                },
                {
                    name: '5. Zero LGBTQ+ Posting, Pronouns, or NSFW Content',
                    value: 'Absolutely no LGBTQ+ topics, pronoun discussions, or NSFW (Not Safe For Work) content of any kind are allowed. This includes posts, usernames, profile content, and discussions. Violations will result in immediate moderation action.',
                    inline: false
                },
                {
                    name: '6. Appropriate Language',
                    value: 'Keep language appropriate and avoid excessive profanity. This is a family-friendly environment.',
                    inline: false
                },
                {
                    name: '7. No Spam or Self-Promotion',
                    value: 'Excessive posting, spam, or unsolicited self-promotion is not allowed. Respect the community\'s flow of conversation.',
                    inline: false
                },
                {
                    name: '8. Stay On Topic',
                    value: 'Keep discussions relevant to the channel topic. Off-topic conversations should be moved to appropriate channels.',
                    inline: false
                },
                {
                    name: '9. No Doxxing or Privacy Violations',
                    value: 'Sharing personal information about others without consent is strictly prohibited.',
                    inline: false
                },
                {
                    name: '10. Follow Discord Terms of Service',
                    value: 'All Discord Terms of Service and Community Guidelines must be followed.',
                    inline: false
                },
                {
                    name: '11. Moderator Discretion',
                    value: 'Moderators reserve the right to take action on any content that violates the spirit of these rules, even if not explicitly listed.',
                    inline: false
                }
            )
            .addFields(
                {
                    name: '⚠️ Consequences',
                    value: 'Violations may result in warnings, temporary mutes, or permanent bans depending on the severity and frequency of the offense.',
                    inline: false
                },
                {
                    name: '📞 Appeals',
                    value: 'If you believe a moderation action was taken in error, please contact a moderator or founder to discuss the situation.',
                    inline: false
                }
            )
            .setFooter({ text: 'Dark MAGA Bot - America First!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 