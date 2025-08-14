const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your rank and level progress')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check rank for (optional)')
                .setRequired(false)),

    async execute(interaction, bot) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            // Get user's level data
            const userData = await bot.leveling.getUserLevel(targetUser.id, interaction.guild.id);
            const level = userData.level;
            const totalXp = userData.totalXp;
            const rankName = bot.leveling.getRankName(level);
            
            // Calculate progress to next level
            const progress = bot.leveling.getLevelProgress(totalXp, level);
            const nextLevelXp = bot.leveling.xpForNextLevel(level);
            
            // Create progress bar
            const progressBarLength = 20;
            const filledBars = Math.round((progress.percentage / 100) * progressBarLength);
            const emptyBars = progressBarLength - filledBars;
            const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
            
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle(`📊 ${targetUser.username}'s Rank`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🏆 Rank', value: rankName, inline: true },
                    { name: '📈 Level', value: level.toString(), inline: true },
                    { name: '✨ Total XP', value: totalXp.toLocaleString(), inline: true },
                    { 
                        name: '📊 Progress to Next Level', 
                        value: `${progressBar}\n${progress.current}/${progress.needed} XP (${progress.percentage}%)`,
                        inline: false 
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot - Leveling System' })
                .setTimestamp();

            // Add special message for max level
            if (level >= 100) {
                embed.addFields({ 
                    name: '🎉 Max Level Reached!', 
                    value: 'You have achieved the highest rank! Keep being awesome!', 
                    inline: false 
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error getting rank:', error);
            await interaction.reply({ 
                content: 'An error occurred while fetching rank data. Please try again.', 
                ephemeral: true 
            });
        }
    }
}; 