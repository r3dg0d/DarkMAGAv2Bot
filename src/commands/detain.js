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

            // Create jail infrastructure if it doesn't exist
            let jailCategory = interaction.guild.channels.cache.find(
                channel => channel.type === 4 && channel.name.toLowerCase().includes('alligator-alcatraz')
            );
            
            if (!jailCategory) {
                // Create jail category
                jailCategory = await interaction.guild.channels.create({
                    name: '🐊 alligator-alcatraz',
                    type: 4, // Category
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: ['ViewChannel']
                        }
                    ]
                });
            }

            // Create jailcell VC if it doesn't exist
            let jailVC = interaction.guild.channels.cache.find(
                channel => channel.parentId === jailCategory.id && channel.name === 'jailcell'
            );

            if (!jailVC) {
                // Get staff role IDs for permissions
                const { roles } = require('../config');
                const staffRoleIds = [
                    roles.trialMod,
                    roles.mod,
                    roles.executiveMod,
                    roles.coFounder,
                    roles.founder
                ];
                
                const permissionOverwrites = [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: bot.client.user.id,
                        allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels']
                    }
                ];
                
                for (const roleId of staffRoleIds) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role) {
                        permissionOverwrites.push({
                            id: roleId,
                            allow: ['ViewChannel', 'Connect', 'Speak']
                        });
                    }
                }

                jailVC = await interaction.guild.channels.create({
                    name: 'jailcell',
                    type: 2, // Voice channel
                    parent: jailCategory,
                    permissionOverwrites: permissionOverwrites
                });
            }

            // Create jail-appeals text channel if it doesn't exist
            let jailTextChannel = interaction.guild.channels.cache.find(
                channel => channel.parentId === jailCategory.id && channel.name === 'jail-appeals'
            );

            if (!jailTextChannel) {
                // Get staff role IDs for permissions
                const { roles } = require('../config');
                const staffRoleIds = [
                    roles.trialMod,
                    roles.mod,
                    roles.executiveMod,
                    roles.coFounder,
                    roles.founder
                ];
                
                const textPermissionOverwrites = [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: bot.client.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
                    }
                ];
                
                for (const roleId of staffRoleIds) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role) {
                        textPermissionOverwrites.push({
                            id: roleId,
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                        });
                    }
                }

                jailTextChannel = await interaction.guild.channels.create({
                    name: 'jail-appeals',
                    type: 0, // Text channel
                    parent: jailCategory,
                    permissionOverwrites: textPermissionOverwrites
                });
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
                try {
                    await member.roles.remove(rolesToRemove);
                } catch (removeError) {
                    console.error('Error removing roles:', removeError);
                    // Continue anyway, we'll try to add the detained role
                }
            }

            // Add detained role
            try {
                await member.roles.add(detainedRoleId);
            } catch (addError) {
                console.error('Error adding detained role:', addError);
                await interaction.reply({ 
                    content: 'Failed to detain user. Make sure:\n' +
                             '• I have "Manage Roles" permission\n' +
                             '• The detained role is below my highest role in the hierarchy\n' +
                             '• The detained role exists and is assignable', 
                    ephemeral: true 
                });
                return;
            }

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