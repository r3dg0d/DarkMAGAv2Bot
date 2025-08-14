const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blockmodmail')
        .setDescription('Block a user from using modmail (Executive Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to block')
                .setRequired(true)),
    permissions: ['executiveMod'],
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        const blockedUsers = await bot.fileUtils.loadBlockedUsers();
        if (blockedUsers.includes(user.id)) {
            await interaction.reply({ content: 'User is already blocked from modmail.', ephemeral: true });
            return;
        }
        blockedUsers.push(user.id);
        await bot.fileUtils.saveBlockedUsers(blockedUsers);
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚫 Modmail Blocked')
            .setDescription(`**${user.tag}** has been blocked from using modmail.`)
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
}; 