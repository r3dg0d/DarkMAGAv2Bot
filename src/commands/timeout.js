const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user for a specified duration (Trial Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Timeout duration in minutes (1-10080)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10080))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false)),
    permissions: ['trialMod'],
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        
        // Handle both string and integer types for duration (Discord cache issue)
        let durationValue = null;
        try {
            durationValue = interaction.options.getInteger('duration');
        } catch (error) {
            // If getInteger fails, try getting as string and parsing
            try {
                const durationStr = interaction.options.getString('duration');
                if (durationStr) {
                    durationValue = parseInt(durationStr);
                }
            } catch (strError) {
                // If both fail, durationValue stays null
            }
        }
        
        if (!durationValue || isNaN(durationValue)) {
            await interaction.reply({ content: 'Invalid duration provided. Please provide a number of minutes.', ephemeral: true });
            return;
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.moderatable) {
                await interaction.reply({ content: 'I cannot timeout this user. They may have higher permissions than me.', ephemeral: true });
                return;
            }
            
            await member.timeout(durationValue * 60 * 1000, reason);
            
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('⏳ User Timed Out')
                .setDescription(`**${user.tag}** has been timed out for ${durationValue} minutes.`)
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
            console.error('Error executing timeout command:', error);
            await interaction.reply({ content: 'Failed to timeout user. Make sure the user is in the server and I have the proper permissions.', ephemeral: true });
        }
    }
}; 