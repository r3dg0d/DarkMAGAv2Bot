const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the server leveling leaderboard')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (1-20)')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)),

    async execute(interaction, bot) {
        const limit = interaction.options.getInteger('limit') || 10;
        
        try {
            await interaction.deferReply();

            // Get leaderboard data
            const leaderboard = await bot.leveling.getLeaderboard(interaction.guild.id, limit);
            
            if (leaderboard.length === 0) {
                await interaction.editReply({ 
                    content: 'No leveling data found for this server yet. Start chatting to earn XP!',
                    ephemeral: true 
                });
                return;
            }

            // Build leaderboard description
            let description = '';
            for (let i = 0; i < leaderboard.length; i++) {
                const userData = leaderboard[i];
                const user = await interaction.client.users.fetch(userData.userId).catch(() => null);
                const username = user ? user.username : 'Unknown User';
                const rankName = bot.leveling.getRankName(userData.level);
                
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
                
                description += `${medal} **${username}**\n`;
                description += `└ ${rankName} (Level ${userData.level}) • ${userData.totalXp.toLocaleString()} XP\n\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setTitle('🏆 Server Leaderboard')
                .setDescription(description)
                .setFooter({ text: `Dark MAGA Bot - Top ${leaderboard.length} Patriots` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error getting leaderboard:', error);
            
            try {
                await interaction.editReply({ 
                    content: 'An error occurred while fetching the leaderboard. Please try again.', 
                    ephemeral: true 
                });
            } catch (editError) {
                await interaction.followUp({ 
                    content: 'An error occurred while fetching the leaderboard. Please try again.', 
                    ephemeral: true 
                });
            }
        }
    }
}; 