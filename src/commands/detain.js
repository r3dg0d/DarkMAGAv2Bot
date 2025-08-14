const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('detain')
        .setDescription('Detain a user (Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to detain')
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
            
            if (member.roles.cache.has(detainedRoleId)) {
                await interaction.reply({ content: 'User is already detained.', ephemeral: true });
                return;
            }

            // Get all roles except @everyone and detained role
            const rolesToRemove = member.roles.cache.filter(r => r.id !== interaction.guild.id && r.id !== detainedRoleId);
            const roleIds = rolesToRemove.map(r => r.id);

            // Save the user's current roles before removing them
            if (roleIds.length > 0) {
                await bot.database.saveDetainedUserRoles(user.id, interaction.guild.id, roleIds);
            }

            // Remove all roles except @everyone
            if (rolesToRemove.size > 0) {
                await member.roles.remove(rolesToRemove);
            }

            // Add detained role
            await member.roles.add(detainedRoleId);

            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('🚨 User Detained')
                .setDescription(`**${user}** has been detained.`)
                .addFields(
                    { name: 'User', value: `${user} (${user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                    { name: 'Roles Saved', value: roleIds.length > 0 ? `${roleIds.length} roles saved for restoration` : 'No roles to save', inline: false }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            hasReplied = true;

            // Send log to jail-log channel
            const jailLogChannelId = config.channels.jailLog;
            const jailLogChannel = interaction.guild.channels.cache.get(jailLogChannelId);
            if (jailLogChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setTitle('🚨 User Detained')
                    .setDescription(`**${user.tag}** has been detained.`)
                    .addFields(
                        { name: 'User', value: `${user} (${user.id})`, inline: true },
                        { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                        { name: 'Roles Removed', value: roleIds.length > 0 ? `${roleIds.length} roles removed` : 'No roles removed', inline: false }
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: 'Jail Log • Dark MAGA Bot' });
                await jailLogChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error detaining user:', error);
            
            if (!hasReplied) {
                await interaction.reply({ 
                    content: 'Failed to detain user. Make sure the user is in the server.', 
                    ephemeral: true 
                });
            } else {
                // If we already replied, use followUp for error message
                await interaction.followUp({ 
                    content: 'User was detained but there was an error sending the log message.', 
                    ephemeral: true 
                });
            }
        }
    }
}; 