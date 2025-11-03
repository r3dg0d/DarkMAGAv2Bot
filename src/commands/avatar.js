const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display a user\'s avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose avatar to display (optional - defaults to yourself)')
                .setRequired(false)),
    
    async execute(interaction, bot) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(`🖼️ ${targetUser.tag}'s Avatar`)
            .setImage(targetUser.displayAvatarURL({ size: 1024, dynamic: true }))
            .addFields(
                {
                    name: 'Avatar URL',
                    value: `[Click here](${targetUser.displayAvatarURL({ size: 1024, dynamic: true })})`,
                    inline: true
                }
            )
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 