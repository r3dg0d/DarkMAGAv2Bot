const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user by ID, username#discriminator, or username (Executive Mod+ Only)')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('User ID, username#discriminator, or username to unban')
                .setRequired(true)),
    permissions: ['executiveMod'],
    async execute(interaction, bot) {
        const userInput = interaction.options.getString('user');
        let bannedUser = null;
        let banInfo = null;
        try {
            // Try direct unban by ID
            try {
                await interaction.guild.bans.remove(userInput);
                // If successful, fetch user for display
                bannedUser = await bot.client.users.fetch(userInput).catch(() => null);
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🔓 User Unbanned')
                    .setDescription(bannedUser ? `User @${bannedUser.username} (${bannedUser}) has been unbanned.` : `User with ID **${userInput}** has been unbanned.`)
                    .setFooter({ text: 'Dark MAGA Bot' })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
                return;
            } catch (idErr) {
                // Not a direct ID or not banned, continue to search
            }
            // Search ban list for username#discriminator or username
            const bans = await interaction.guild.bans.fetch();
            banInfo = bans.find(ban => {
                if (ban.user.id === userInput) return true;
                if (ban.user.tag && ban.user.tag.toLowerCase() === userInput.toLowerCase()) return true;
                if (ban.user.username && ban.user.username.toLowerCase() === userInput.toLowerCase()) return true;
                return false;
            });
            if (!banInfo) {
                await interaction.reply({ content: '❌ User not found in the ban list. Please provide a valid user ID, username#discriminator, or username.', ephemeral: true });
                return;
            }
            await interaction.guild.bans.remove(banInfo.user.id);
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🔓 User Unbanned')
                .setDescription(`User @${banInfo.user.username} (${banInfo.user}) has been unbanned.`)
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: 'Failed to unban user. Make sure the user is banned and the input is correct.', ephemeral: true });
        }
    }
}; 