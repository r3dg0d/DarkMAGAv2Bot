const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the current channel (Executive Mod+ Only)'),
    permissions: ['executiveMod'],
    async execute(interaction) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        // All roles affected by lockdown
        const affectedRoleIds = [
            guild.id, // @everyone
            config.roles.maga,
            config.roles.ogMembers,
            config.roles.trialMod,
            config.roles.mod,
            config.roles.executiveMod,
            '1386639558636208228',
            '1377575771073417257'
        ];
        try {
            for (const roleId of affectedRoleIds) {
                if (!guild.roles.cache.has(roleId) && roleId !== guild.id) continue;
                await channel.permissionOverwrites.edit(roleId, {
                    SendMessages: null,
                    SendMessagesInThreads: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null
                });
            }
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`This channel has been unlocked by ${interaction.user.tag}.`)
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: 'Failed to unlock the channel.', ephemeral: true });
        }
    }
}; 