const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createroles')
        .setDescription('Bulk create roles for reaction role system (Founder Only)')
        .addStringOption(option =>
            option.setName('role_names')
                .setDescription('Role names separated by commas (e.g., Role1, Role2, Role3)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Hex color for the roles (e.g., #ff0000 for red)')
                .setRequired(false)),
    permissions: ['founder'],
    async execute(interaction) {
        const roleNames = interaction.options.getString('role_names').split(',').map(r => r.trim()).filter(Boolean);
        let color = interaction.options.getString('color') || '#808080';
        if (!color.startsWith('#')) color = '#' + color;
        let roleColor;
        try {
            roleColor = parseInt(color.replace('#', ''), 16);
            if (isNaN(roleColor)) throw new Error('Invalid color');
        } catch {
            await interaction.reply({ content: '❌ Invalid color format. Use hex like #ff0000.', ephemeral: true });
            return;
        }
        if (!roleNames.length) {
            await interaction.reply({ content: '❌ No valid role names provided.', ephemeral: true });
            return;
        }
        if (roleNames.length > 20) {
            await interaction.reply({ content: '❌ Maximum of 20 roles can be created at once.', ephemeral: true });
            return;
        }
        const created = [], existing = [], failed = [];
        for (const name of roleNames) {
            if (interaction.guild.roles.cache.some(r => r.name === name)) {
                existing.push(name);
                continue;
            }
            try {
                await interaction.guild.roles.create({ name, color: roleColor, reason: `Bulk role creation by ${interaction.user.tag}` });
                created.push(name);
            } catch (e) {
                failed.push(`${name} (${e.message})`);
            }
        }
        let msg = '';
        if (created.length) msg += `✅ Created roles: ${created.join(', ')}\n`;
        if (existing.length) msg += `⚠️ Already existed: ${existing.join(', ')}\n`;
        if (failed.length) msg += `❌ Failed: ${failed.join(', ')}\n`;
        await interaction.reply({ content: msg || '❌ No roles were processed.', ephemeral: true });
    }
}; 