const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Lock the current channel (Executive Mod+ Only)'),
    permissions: ['executiveMod'],
    async execute(interaction) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        // Roles to lock: @everyone, maga, ogMembers
        const denyRoleIds = [
            guild.id, // @everyone
            config.roles.maga,
            config.roles.ogMembers
        ];
        // Roles to allow: trialMod, mod, executiveMod, plus custom staff roles
        const allowRoleIds = [
            config.roles.trialMod,
            config.roles.mod,
            config.roles.executiveMod,
            '1386639558636208228', // custom staff role 1
            '1377575771073417257'  // custom staff role 2
        ];
        try {
            // Deny permissions for non-staff
            for (const roleId of denyRoleIds) {
                if (!guild.roles.cache.has(roleId)) continue; // Skip if role doesn't exist
                await channel.permissionOverwrites.edit(roleId, {
                    SendMessages: false,
                    SendMessagesInThreads: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false
                });
            }
            // Allow permissions for staff
            for (const roleId of allowRoleIds) {
                if (!guild.roles.cache.has(roleId)) continue; // Skip if role doesn't exist
                await channel.permissionOverwrites.edit(roleId, {
                    SendMessages: true,
                    SendMessagesInThreads: true,
                    CreatePublicThreads: true,
                    CreatePrivateThreads: true
                });
            }
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🔒 Channel Locked')
                .setDescription(`This channel has been locked by ${interaction.user.tag}. Only staff can chat.`)
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            // Log the actual error for debugging
            console.error('Lockdown error:', error);
            await interaction.reply({ content: `Failed to lock the channel: ${error.message}`, ephemeral: true });
        }
    }
}; 