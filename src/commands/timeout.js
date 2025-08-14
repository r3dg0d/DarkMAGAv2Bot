const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user for a specified duration (Trial Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Timeout duration in minutes (1-10080)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10080))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false)),
    permissions: ['trialMod'],
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        try {
            const member = await interaction.guild.members.fetch(user.id);
            if (!member.moderatable) {
                await interaction.reply({ content: 'I cannot timeout this user. They may have higher permissions than me.', ephemeral: true });
                return;
            }
            await member.timeout(duration * 60 * 1000, reason);
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('⏳ User Timed Out')
                .setDescription(`**${user.tag}** has been timed out for ${duration} minutes.`)
                .addFields(
                    { name: 'User ID', value: user.id, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: 'Failed to timeout user. Make sure the user is in the server.', ephemeral: true });
        }
    }
}; 