const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testmodmail')
        .setDescription('Test modmail system and permissions (Staff Only)'),
    
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
            const config = require('../config');
            
            // Create test embed
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🧪 Modmail System Test')
                .setDescription('Testing modmail functionality and permissions...')
                .setTimestamp();

            // Check user's staff roles
            const userStaffRoles = [];
            for (const role of interaction.member.roles.cache.values()) {
                const roleIds = [
                    config.roles.trialMod,
                    config.roles.mod,
                    config.roles.executiveMod,
                    config.roles.coFounder,
                    config.roles.founder
                ];
                if (roleIds.includes(role.id)) {
                    userStaffRoles.push(role.name);
                }
            }

            embed.addFields({
                name: '👤 Your Staff Roles',
                value: userStaffRoles.length > 0 ? userStaffRoles.join(', ') : 'None found',
                inline: false
            });

            // Check if tickets category exists
            let ticketCategory = null;
            if (config.channels?.ticketCategory) {
                ticketCategory = interaction.guild.channels.cache.get(config.channels.ticketCategory);
            }
            
            if (!ticketCategory) {
                ticketCategory = interaction.guild.channels.cache.find(channel => 
                    channel.type === 4 && channel.name.toLowerCase().includes('ticket')
                );
            }

            embed.addFields({
                name: '📁 Tickets Category',
                value: ticketCategory ? `✅ Found: ${ticketCategory.name}` : '❌ Not found',
                inline: true
            });

            // Check bot permissions
            const botMember = interaction.guild.members.me;
            const botPermissions = [];
            
            if (botMember.permissions.has('ManageChannels')) {
                botPermissions.push('✅ Manage Channels');
            } else {
                botPermissions.push('❌ Manage Channels');
            }
            
            if (botMember.permissions.has('ManageRoles')) {
                botPermissions.push('✅ Manage Roles');
            } else {
                botPermissions.push('❌ Manage Roles');
            }

            embed.addFields({
                name: '🤖 Bot Permissions',
                value: botPermissions.join('\n'),
                inline: true
            });

            // Count current tickets
            let currentTickets = 0;
            if (ticketCategory) {
                currentTickets = ticketCategory.children.cache.filter(
                    channel => channel.name.startsWith('ticket-') && channel.type === 0
                ).size;
            }

            embed.addFields({
                name: '🎫 Current Tickets',
                value: `${currentTickets} open tickets`,
                inline: true
            });

            // Check archive category
            const archiveCategory = interaction.guild.channels.cache.find(
                channel => channel.type === 4 && channel.name === 'Archived Tickets'
            );

            embed.addFields({
                name: '📁 Archive Category',
                value: archiveCategory ? '✅ Found' : '❌ Not found (will be created when needed)',
                inline: true
            });

            // Overall system status
            const systemStatus = ticketCategory && botMember.permissions.has('ManageChannels') ? 
                '✅ Modmail system operational' : 
                '⚠️ Check permissions/setup';

            embed.addFields({
                name: '📊 System Status',
                value: systemStatus,
                inline: true
            });

            embed.setFooter({ text: 'Dark MAGA Modmail Test | If issues persist, contact developer' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error testing modmail:', error);
            await interaction.editReply('❌ Failed to test modmail system. Please try again.');
        }
    }
}; 