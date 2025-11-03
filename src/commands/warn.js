const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user (Trial Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)),
    permissions: ['trialMod'],
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        // Log warning to mod log if available
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ User Warned')
            .setDescription(`**${user.tag}** has been warned.`)
            .addFields(
                { name: 'User ID', value: user.id, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        // Send to mod log if configured
        if (bot && bot.client && bot.client.channels && bot.config && bot.config.channels && bot.config.channels.modLog) {
            const modLogChannel = bot.client.channels.cache.get(bot.config.channels.modLog);
            if (modLogChannel) {
                await modLogChannel.send({ embeds: [embed] });
            }
        }
    }
}; 