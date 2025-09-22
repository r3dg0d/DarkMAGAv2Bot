const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assignpatriot')
        .setDescription('Assign Patriot I role to all members who don\'t have any Patriot role (Founder Only)'),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        const config = require('../config');
        
        // Check if the bot can manage roles
        if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
            await interaction.reply({ 
                content: '❌ I don\'t have permission to manage roles.', 
                ephemeral: true 
            });
            return;
        }

        // Get Patriot I role
        const patriotIRole = interaction.guild.roles.cache.get(config.roles.patriotI);
        if (!patriotIRole) {
            await interaction.reply({ 
                content: '❌ Patriot I role not found. Please check the role configuration.', 
                ephemeral: true 
            });
            return;
        }

        // Check if bot can manage Patriot I role
        if (patriotIRole.position >= interaction.guild.members.me.roles.highest.position) {
            await interaction.reply({ 
                content: '❌ I cannot manage the Patriot I role because it\'s higher than or equal to my highest role.', 
                ephemeral: true 
            });
            return;
        }

        // Get all Patriot role IDs
        const patriotRoles = [
            config.roles.patriotI,
            config.roles.patriotII,
            config.roles.patriotIII,
            config.roles.patriotIV,
            config.roles.patriotV,
            config.roles.patriotVI,
            config.roles.patriotVII,
            config.roles.patriotVIII,
            config.roles.patriotIX,
            config.roles.patriotX,
            config.roles.magaLegend
        ];

        await interaction.deferReply();

        try {
            // Fetch all members
            await interaction.guild.members.fetch();
            
            // Find members without any Patriot role
            const membersWithoutPatriotRole = interaction.guild.members.cache.filter(member => {
                // Skip bots
                if (member.user.bot) return false;
                
                // Check if member has any Patriot role
                const hasPatriotRole = patriotRoles.some(roleId => member.roles.cache.has(roleId));
                return !hasPatriotRole;
            });

            let assignedCount = 0;
            let errorCount = 0;

            // Assign Patriot I role to eligible members
            for (const [, member] of membersWithoutPatriotRole) {
                try {
                    await member.roles.add(patriotIRole);
                    assignedCount++;
                } catch (error) {
                    console.error(`Error assigning Patriot I role to ${member.user.tag}:`, error);
                    errorCount++;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Patriot Role Assignment Complete')
                .setDescription(`Successfully assigned Patriot I role to members without any Patriot role.`)
                .addFields(
                    {
                        name: '📊 Results',
                        value: `**Assigned:** ${assignedCount} members\n**Errors:** ${errorCount} members\n**Total Processed:** ${membersWithoutPatriotRole.size} members`,
                        inline: false
                    },
                    {
                        name: 'ℹ️ What this means',
                        value: 'All members who didn\'t have any Patriot role (Patriot I-X or MAGA Legend) now have the Patriot I role.',
                        inline: false
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in assignpatriot command:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while processing the command. Please try again later.',
                ephemeral: true 
            });
        }
    }
};
