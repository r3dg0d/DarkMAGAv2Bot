    const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

    module.exports = {
        data: new SlashCommandBuilder()
            .setName('rolelist')
            .setDescription('List all server roles (Founder Only)'),
        permissions: ['founder'],
        async execute(interaction) {
            const roles = interaction.guild.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => `${role.name} (${role.id})`).join('\n');
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('📜 Server Roles')
                .setDescription(roles.length ? roles : 'No roles found.')
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
    };