const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Display a user\'s banner')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose banner to display (optional - defaults to yourself)')
                .setRequired(false)),
    
    async execute(interaction, bot) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const user = await interaction.client.users.fetch(targetUser.id, { force: true });
        const bannerURL = user.bannerURL({ size: 1024 });

        if (!bannerURL) {
            await interaction.reply({ content: 'This user does not have a banner set.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(`🏳️ ${user.tag}'s Banner`)
            .setImage(bannerURL)
            .addFields({
                name: 'Banner URL',
                value: `[Click here](${bannerURL})`,
                inline: true
            })
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 