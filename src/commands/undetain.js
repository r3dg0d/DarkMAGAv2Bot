const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('undetain')
        .setDescription('Release a user from detainment (Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to release')
                .setRequired(true)),
    permissions: ['mod'],
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        const detainedRoleId = config.roles.detained;
        
        if (!detainedRoleId) {
            await interaction.reply({ content: 'Detained role is not configured.', ephemeral: true });
            return;
        }

        let hasReplied = false;

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.roles.cache.has(detainedRoleId)) {
                await interaction.reply({ content: 'User is not detained.', ephemeral: true });
                return;
            }

            // Remove detained role
            await member.roles.remove(detainedRoleId);

            // Get saved roles
            const savedRoleData = await bot.database.getDetainedUserRoles(user.id, interaction.guild.id);
            let restoredRoles = [];
            let failedRoles = [];

            if (savedRoleData && savedRoleData.roleIds) {
                // Restore saved roles
                for (const roleId of savedRoleData.roleIds) {
                    try {
                        const role = interaction.guild.roles.cache.get(roleId);
                        if (role) {
                            await member.roles.add(role);
                            restoredRoles.push(role.name);
                        } else {
                            failedRoles.push(roleId);
                        }
                    } catch (error) {
                        console.error(`Failed to restore role ${roleId}:`, error);
                        failedRoles.push(roleId);
                    }
                }

                // Clean up saved role data
                await bot.database.removeDetainedUserRoles(user.id, interaction.guild.id);
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ User Released')
                .setDescription(`**${user}** has been released from detainment.`)
                .addFields(
                    { name: 'User', value: `${user} (${user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            // Add role restoration info
            if (restoredRoles.length > 0) {
                embed.addFields({ 
                    name: `✅ Roles Restored (${restoredRoles.length})`, 
                    value: restoredRoles.slice(0, 10).join(', ') + (restoredRoles.length > 10 ? '...' : ''), 
                    inline: false 
                });
            }

            if (failedRoles.length > 0) {
                embed.addFields({ 
                    name: `⚠️ Roles Not Found (${failedRoles.length})`, 
                    value: 'Some roles were deleted or no longer exist', 
                    inline: false 
                });
            }

            if (!savedRoleData) {
                embed.addFields({ 
                    name: 'ℹ️ No Saved Roles', 
                    value: 'No roles were saved when this user was detained', 
                    inline: false 
                });
            }

            await interaction.reply({ embeds: [embed] });
            hasReplied = true;

            // Send log to jail-log channel
            const jailLogChannelId = config.channels.jailLog;
            const jailLogChannel = interaction.guild.channels.cache.get(jailLogChannelId);
            if (jailLogChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ User Released from Detainment')
                    .setDescription(`**${user.tag}** has been released from detainment.`)
                    .addFields(
                        { name: 'User', value: `${user} (${user.id})`, inline: true },
                        { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                        { name: 'Roles Restored', value: restoredRoles.length > 0 ? `${restoredRoles.length} roles restored` : 'No roles restored', inline: false }
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: 'Jail Log • Dark MAGA Bot' });
                await jailLogChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error releasing user:', error);
            
            if (!hasReplied) {
                await interaction.reply({ 
                    content: 'Failed to release user. Make sure the user is in the server.', 
                    ephemeral: true 
                });
            } else {
                // If we already replied, use followUp for error message
                await interaction.followUp({ 
                    content: 'User was released but there was an error sending the log message.', 
                    ephemeral: true 
                });
            }
        }
    }
}; 