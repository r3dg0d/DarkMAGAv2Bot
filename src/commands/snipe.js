const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Fetch last deleted message'),
    
    async execute(interaction, bot) {
        if (!bot.lastDeletedMessage) {
            await interaction.reply({ content: 'No deleted message to snipe!', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🔫 Message Sniped!')
            .setDescription(bot.lastDeletedMessage.content)
            .addFields(
                {
                    name: 'Author',
                    value: bot.lastDeletedMessage.author.tag,
                    inline: true
                },
                {
                    name: 'Channel',
                    value: bot.lastDeletedMessage.channel.name,
                    inline: true
                },
                {
                    name: 'Time',
                    value: bot.lastDeletedMessage.timestamp.toLocaleString(),
                    inline: true
                }
            )
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 