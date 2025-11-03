const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display detailed information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get information about (optional - defaults to yourself)')
                .setRequired(false)),
    
    async execute(interaction, bot) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);

        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .map(role => role.name)
            .join(', ') || 'No roles';

        const permissions = member.permissions.toArray().join(', ') || 'No permissions';

        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor)
            .setTitle('👤 User Information')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: 'Username',
                    value: targetUser.tag,
                    inline: true
                },
                {
                    name: 'User ID',
                    value: targetUser.id,
                    inline: true
                },
                {
                    name: 'Nickname',
                    value: member.nickname || 'None',
                    inline: true
                },
                {
                    name: 'Account Created',
                    value: moment(targetUser.createdAt).format('MMM DD, YYYY HH:mm:ss'),
                    inline: true
                },
                {
                    name: 'Joined Server',
                    value: moment(member.joinedAt).format('MMM DD, YYYY HH:mm:ss'),
                    inline: true
                },
                {
                    name: 'Status',
                    value: member.presence?.status || 'Unknown',
                    inline: true
                },
                {
                    name: 'Roles',
                    value: roles.length > 1024 ? 'Too many roles to display' : roles,
                    inline: false
                },
                {
                    name: 'Key Permissions',
                    value: permissions.length > 1024 ? 'Too many permissions to display' : permissions,
                    inline: false
                }
            )
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 