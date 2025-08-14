const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blocklist')
        .setDescription('List all users blocked from modmail (Executive Mod+ Only)'),
    permissions: ['executiveMod'],
    async execute(interaction, bot) {
        const blockedUsers = await bot.fileUtils.loadBlockedUsers();
        if (!blockedUsers.length) {
            await interaction.reply({ content: 'No users are currently blocked from modmail.', ephemeral: true });
            return;
        }
        const userTags = await Promise.all(blockedUsers.map(async id => {
            try {
                const user = await interaction.client.users.fetch(id);
                return `${user.tag} (${id})`;
            } catch {
                return `Unknown User (${id})`;
            }
        }));
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('🚫 Modmail Blocklist')
            .setDescription(userTags.join('\n'))
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
}; 