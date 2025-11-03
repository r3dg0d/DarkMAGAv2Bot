const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manage autoroles - roles automatically assigned to new members (Founder Only)')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to add or remove from autoroles')
                .setRequired(true)),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        const role = interaction.options.getRole('role');
        
        // Check if the bot can manage this role
        if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
            await interaction.reply({ 
                content: '❌ I don\'t have permission to manage roles.', 
                ephemeral: true 
            });
            return;
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            await interaction.reply({ 
                content: '❌ I cannot manage this role because it\'s higher than or equal to my highest role.', 
                ephemeral: true 
            });
            return;
        }

        const autoroles = await bot.fileUtils.loadAutoroles();
        const roleIndex = autoroles.indexOf(role.id);
        
        if (roleIndex > -1) {
            // Remove role from autoroles
            autoroles.splice(roleIndex, 1);
            await bot.fileUtils.saveAutoroles(autoroles);
            
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Autorole Removed')
                .setDescription(`**${role.name}** has been removed from autoroles.`)
                .addFields({
                    name: 'What this means',
                    value: 'New members will no longer automatically receive this role when they join the server.',
                    inline: false
                })
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } else {
            // Add role to autoroles
            autoroles.push(role.id);
            await bot.fileUtils.saveAutoroles(autoroles);
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Autorole Added')
                .setDescription(`**${role.name}** has been added to autoroles.`)
                .addFields({
                    name: 'What this means',
                    value: 'New members will automatically receive this role when they join the server.',
                    inline: false
                })
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    }
}; 