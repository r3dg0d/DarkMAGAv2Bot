const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify a user and assign/remove roles (Trial Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to verify')
                .setRequired(true)),
    
    permissions: ['trialMod'],
    
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        const moderator = interaction.member;
        
        // Role IDs
        const roleToGive = '1375329833361342577'; // MAGA role
        const roleToRemove = '1384321236095602809'; // Role to remove
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            // Get the roles
            const magaRole = interaction.guild.roles.cache.get(roleToGive);
            const roleToRemoveObj = interaction.guild.roles.cache.get(roleToRemove);
            
            if (!magaRole) {
                await interaction.reply({ 
                    content: 'Error: Could not find the MAGA role.', 
                    ephemeral: true 
                });
                return;
            }
            
            let changes = [];
            
            // Add MAGA role if user doesn't have it
            if (!member.roles.cache.has(roleToGive)) {
                await member.roles.add(magaRole);
                changes.push(`✅ Added ${magaRole.name} role`);
            } else {
                changes.push(`ℹ️ User already has ${magaRole.name} role`);
            }
            
            // Remove the specified role if user has it
            if (roleToRemoveObj && member.roles.cache.has(roleToRemove)) {
                await member.roles.remove(roleToRemoveObj);
                changes.push(`❌ Removed ${roleToRemoveObj.name} role`);
            } else if (roleToRemoveObj) {
                changes.push(`ℹ️ User doesn't have ${roleToRemoveObj.name} role`);
            } else {
                changes.push(`⚠️ Could not find role to remove (ID: ${roleToRemove})`);
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ User Verified')
                .setDescription(`**${user.tag}** has been verified.`)
                .addFields(
                    {
                        name: 'Changes Made',
                        value: changes.join('\n'),
                        inline: false
                    },
                    {
                        name: 'User ID',
                        value: user.id,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: moderator.user.tag,
                        inline: true
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
            // Send mod log
            await this.sendModLog(bot, moderator, user, changes);

        } catch (error) {
            console.error('Error verifying user:', error);
            await interaction.reply({ 
                content: 'An error occurred while trying to verify the user.', 
                ephemeral: true 
            });
        }
    },

    async sendModLog(bot, moderator, target, changes) {
        const modLogChannel = bot.client.channels.cache.get(require('../config').channels.modLog);
        if (!modLogChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ User Verified')
            .setDescription(`**${target.tag}** has been verified.`)
            .addFields(
                {
                    name: 'Changes Made',
                    value: changes.join('\n'),
                    inline: false
                },
                {
                    name: 'User ID',
                    value: target.id,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value: moderator.user.tag,
                    inline: true
                }
            )
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await modLogChannel.send({ embeds: [embed] });
    }
};
