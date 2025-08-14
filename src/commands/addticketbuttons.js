const { SlashCommandBuilder } = require('discord.js');
const { hasStaffRole } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addticketbuttons')
        .setDescription('Add close/archive buttons to the current ticket (Staff Only)'),
    
    async execute(interaction) {
        // Check if user has staff permissions
        if (!hasStaffRole(interaction.member)) {
            await interaction.reply({ 
                content: '❌ You need staff permissions to use this command.', 
                ephemeral: true 
            });
            return;
        }

        // Check if this is a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            await interaction.reply({ 
                content: '❌ This command can only be used in ticket channels.', 
                ephemeral: true 
            });
            return;
        }

        // Create action row with close and archive buttons
        const actionRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 4, // Danger (red)
                    label: 'Close Ticket',
                    emoji: '🔒',
                    custom_id: 'ticket_close'
                },
                {
                    type: 2,
                    style: 2, // Secondary (gray)
                    label: 'Archive Ticket',
                    emoji: '📁',
                    custom_id: 'ticket_archive'
                }
            ]
        };

        try {
            await interaction.channel.send({ 
                content: '🔧 **Ticket Management Buttons Added**\n\nUse these buttons to manage this ticket:',
                components: [actionRow]
            });
            
            await interaction.reply({ 
                content: '✅ Ticket management buttons have been added to this channel.', 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Error adding ticket buttons:', error);
            await interaction.reply({ 
                content: '❌ Failed to add ticket buttons. Please try again.', 
                ephemeral: true 
            });
        }
    }
}; 