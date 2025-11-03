const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user (Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)),
    permissions: ['mod'],
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.kickable) {
                await interaction.reply({ content: 'I cannot kick this user. They may have higher permissions than me.', ephemeral: true });
                return;
            }
            
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('👢 User Kicked')
                .setDescription(`**${user.tag}** has been kicked from the server.`)
                .addFields(
                    { name: 'User ID', value: user.id, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
            // Send to mod log if configured
            if (bot && bot.client && bot.client.channels && config.channels && config.channels.modLog) {
                const modLogChannel = bot.client.channels.cache.get(config.channels.modLog);
                if (modLogChannel) {
                    await modLogChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error executing kick command:', error);
            await interaction.reply({ content: 'Failed to kick user. Make sure the user is in the server and I have the proper permissions.', ephemeral: true });
        }
    }
}; 