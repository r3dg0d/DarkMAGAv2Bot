const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unblockmodmail')
        .setDescription('Unblock a user from modmail (Executive Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unblock')
                .setRequired(true)),
    permissions: ['executiveMod'],
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        let blockedUsers = await bot.fileUtils.loadBlockedUsers();
        if (!blockedUsers.includes(user.id)) {
            await interaction.reply({ content: 'User is not blocked from modmail.', ephemeral: true });
            return;
        }
        blockedUsers = blockedUsers.filter(id => id !== user.id);
        await bot.fileUtils.saveBlockedUsers(blockedUsers);
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Modmail Unblocked')
            .setDescription(`**${user.tag}** has been unblocked from using modmail.`)
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
}; 