const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user (Executive Mod+ Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)),
    
    permissions: ['executiveMod'],
    
    async execute(interaction, bot) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.member;

        let hasReplied = false;

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.bannable) {
                await interaction.reply({ 
                    content: 'I cannot ban this user. They may have higher permissions than me.', 
                    ephemeral: true 
                });
                return;
            }

            await member.ban({ reason: `${reason} - Banned by ${moderator.user.tag}` });

            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🔨 User Banned')
                .setDescription(`**${user.tag}** has been banned from the server.`)
                .addFields(
                    {
                        name: 'User ID',
                        value: user.id,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason,
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
            hasReplied = true;

            // Send mod log
            await this.sendModLog(bot, 'ban', moderator, user, reason);

            // Log to public ban-list channel
            const banListChannelId = '1375541556152631356';
            const banListChannel = bot.client.channels.cache.get(banListChannelId);
            if (banListChannel) {
                try {
                    // Download avatar and attach as spoilered file
                    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
                    const fetch = require('node-fetch');
                    const res = await fetch(avatarUrl);
                    let fileAttachment = null;
                    if (res.ok) {
                        const buffer = await res.buffer();
                        const { AttachmentBuilder } = require('discord.js');
                        fileAttachment = new AttachmentBuilder(buffer, { name: `SPOILER_${user.id}_avatar.png` });
                    }
                    const banEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle(`Ban ${user.username}`)
                        .addFields(
                            { name: 'User:', value: `@${user.username} (${user})`, inline: false },
                            { name: 'Reason:', value: reason, inline: false }
                        )
                        .setFooter({ text: moderator.user.tag })
                        .setTimestamp();
                    if (fileAttachment) {
                        banEmbed.setThumbnail(`attachment://SPOILER_${user.id}_avatar.png`);
                        await banListChannel.send({ embeds: [banEmbed], files: [fileAttachment] });
                    } else {
                        banEmbed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }));
                        await banListChannel.send({ embeds: [banEmbed] });
                    }
                } catch (e) {
                    console.error('Failed to log ban to ban-list channel:', e);
                }
            }

        } catch (error) {
            console.error('Error banning user:', error);
            
            if (!hasReplied) {
                await interaction.reply({ 
                    content: 'An error occurred while trying to ban the user.', 
                    ephemeral: true 
                });
            } else {
                // If we already replied, use followUp for error message
                await interaction.followUp({ 
                    content: 'User was banned but there was an error sending the log messages.', 
                    ephemeral: true 
                });
            }
        }
    },

    async sendModLog(bot, action, moderator, target, reason) {
        const modLogChannel = bot.client.channels.cache.get(require('../config').channels.modLog);
        if (!modLogChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`🔨 User ${action.charAt(0).toUpperCase() + action.slice(1)}`)
            .setDescription(`**${target.tag}** has been ${action}ed.`)
            .addFields(
                {
                    name: 'User ID',
                    value: target.id,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason,
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