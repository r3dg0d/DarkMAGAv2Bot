const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorolelist')
        .setDescription('List all autoroles - roles automatically assigned to new members (Founder Only)'),
    permissions: ['founder'],
    async execute(interaction, bot) {
        const autoroles = await bot.fileUtils.loadAutoroles();
        
        if (!autoroles.length) {
            const embed = new EmbedBuilder()
                .setColor(0xffff00)
                .setTitle('🤖 Autoroles')
                .setDescription('No autoroles are currently set.')
                .addFields({
                    name: 'How to add autoroles',
                    value: 'Use `/autorole @role` to add or remove roles from the autorole list.',
                    inline: false
                })
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const roleFields = [];
        const validRoles = [];
        const invalidRoles = [];

        for (const roleId of autoroles) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                validRoles.push(role);
            } else {
                invalidRoles.push(roleId);
            }
        }

        // Create fields for valid roles
        if (validRoles.length > 0) {
            const roleList = validRoles.map(role => {
                const color = role.hexColor === '#000000' ? 'No Color' : role.hexColor;
                return `• **${role.name}** (${role.members.size} members)\n  ID: \`${role.id}\` | Color: ${color}`;
            }).join('\n\n');
            
            roleFields.push({
                name: `✅ Active Autoroles (${validRoles.length})`,
                value: roleList,
                inline: false
            });
        }

        // Create fields for invalid roles
        if (invalidRoles.length > 0) {
            const invalidList = invalidRoles.map(id => `• Unknown Role (\`${id}\`)`).join('\n');
            roleFields.push({
                name: `❌ Invalid Autoroles (${invalidRoles.length})`,
                value: invalidList + '\n\n*These roles no longer exist and should be removed.*',
                inline: false
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🤖 Autoroles')
            .setDescription('Roles automatically assigned to new members when they join the server.')
            .addFields(roleFields)
            .addFields({
                name: 'How to manage autoroles',
                value: 'Use `/autorole @role` to add or remove roles from this list.',
                inline: false
            })
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 