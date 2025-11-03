const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketlist')
        .setDescription('List all current open tickets (Staff Only)'),
    
    async execute(interaction) {
        // Check if user has staff permissions
        if (!hasStaffRole(interaction.member)) {
            await interaction.reply({ 
                content: '❌ You need staff permissions to use this command.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Find ticket category
            let ticketCategory = null;
            const config = require('../config');
            if (config.channels?.ticketCategory) {
                ticketCategory = interaction.guild.channels.cache.get(config.channels.ticketCategory);
            }
            
            // Fallback: find any category with "ticket" in the name
            if (!ticketCategory) {
                ticketCategory = interaction.guild.channels.cache.find(channel => 
                    channel.type === 4 && // CategoryChannel
                    channel.name.toLowerCase().includes('ticket')
                );
            }

            if (!ticketCategory) {
                await interaction.editReply('❌ No ticket category found.');
                return;
            }

            // Get all ticket channels
            const ticketChannels = ticketCategory.children.cache.filter(
                channel => channel.name.startsWith('ticket-') && channel.type === 0
            );

            if (ticketChannels.size === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🎫 Current Tickets')
                    .setDescription('No open tickets found.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Create embed with ticket information
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🎫 Current Open Tickets')
                .setDescription(`Found **${ticketChannels.size}** open ticket(s)`)
                .setTimestamp();

            const ticketList = [];
            let index = 1;

            for (const [channelId, channel] of ticketChannels) {
                const userId = channel.name.replace('ticket-', '');
                
                try {
                    const user = await interaction.client.users.fetch(userId);
                    const member = interaction.guild.members.cache.get(userId);
                    
                    const userInfo = member ? 
                        `${user.tag} (${member.nickname || 'No nickname'})` : 
                        `${user.tag} (Not in server)`;
                    
                    const joinedInfo = member?.joinedAt ? 
                        member.joinedAt.toLocaleDateString() : 
                        'Unknown';
                    
                    ticketList.push({
                        name: `${index}. ${channel.name}`,
                        value: `👤 **User:** ${userInfo}\n📅 **Joined:** ${joinedInfo}\n🔗 **Channel:** ${channel}`,
                        inline: false
                    });
                    
                    index++;
                } catch (error) {
                    // User not found, still show the ticket
                    ticketList.push({
                        name: `${index}. ${channel.name}`,
                        value: `👤 **User:** Unknown (ID: ${userId})\n🔗 **Channel:** ${channel}`,
                        inline: false
                    });
                    index++;
                }
            }

            // Add fields in chunks to avoid embed limits
            const chunks = [];
            for (let i = 0; i < ticketList.length; i += 5) {
                chunks.push(ticketList.slice(i, i + 5));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const embedCopy = new EmbedBuilder(embed.data);
                
                chunk.forEach(field => {
                    embedCopy.addFields(field);
                });
                
                if (i === 0) {
                    await interaction.editReply({ embeds: [embedCopy] });
                } else {
                    await interaction.followUp({ embeds: [embedCopy], ephemeral: true });
                }
            }

        } catch (error) {
            console.error('Error listing tickets:', error);
            await interaction.editReply('❌ Failed to list tickets. Please try again.');
        }
    }
}; 