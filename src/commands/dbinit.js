const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbinit')
        .setDescription('Reinitialize database files (Founder Only)'),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🔄 Database Reinitialization')
                .setDescription('Reinitializing database files...')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Force reinitialize database
            await bot.database.forceReinitialize();
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Database Reinitialized')
                .setDescription('All database files have been recreated successfully.')
                .addFields({
                    name: 'Database Path',
                    value: bot.database.dbPath,
                    inline: false
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Error reinitializing database:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Database Error')
                .setDescription('Failed to reinitialize database files.')
                .addFields({
                    name: 'Error',
                    value: error.message,
                    inline: false
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
