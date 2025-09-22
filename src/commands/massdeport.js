const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('massdeport')
        .setDescription('Mass ban all users except those who reacted to the specified message (Executive Mod+ Only)')
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Set to True to confirm this dangerous action')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mass deportation')
                .setRequired(false)),
    
    permissions: ['executiveMod'],
    
    async execute(interaction, bot) {
        const reason = interaction.options.getString('reason') || 'Mass deportation - no reaction to verification message';
        const confirm = interaction.options.getBoolean('confirm');
        
        // Safety check - require explicit confirmation
        if (!confirm) {
            await interaction.reply({ 
                content: '⚠️ **DANGER**: This command will ban ALL users except those who reacted to message ID `1415806404866080778` in channel ID `1375329874444816455`. Set `confirm` to `true` to proceed.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get the channel and message
            const channelId = '1375329874444816455';
            const messageId = '1415806404866080778';
            
            const channel = bot.client.channels.cache.get(channelId);
            if (!channel) {
                await interaction.editReply({ 
                    content: '❌ Error: Could not find the specified channel.', 
                    ephemeral: true 
                });
                return;
            }

            let message;
            try {
                message = await channel.messages.fetch(messageId);
            } catch (error) {
                await interaction.editReply({ 
                    content: '❌ Error: Could not find the specified message.', 
                    ephemeral: true 
                });
                return;
            }

            // Get all reactions on the message
            const reactions = message.reactions.cache;
            const reactedUsers = new Set();
            
            // Collect all users who reacted with any emoji
            for (const reaction of reactions.values()) {
                try {
                    const users = await reaction.users.fetch();
                    users.forEach(user => {
                        if (!user.bot) { // Exclude bots
                            reactedUsers.add(user.id);
                        }
                    });
                } catch (error) {
                    console.error(`Error fetching users for reaction ${reaction.emoji.name}:`, error);
                }
            }

            // Get all guild members
            const members = await interaction.guild.members.fetch();
            const membersToBan = members.filter(member => 
                !member.user.bot && 
                !reactedUsers.has(member.user.id) &&
                member.bannable &&
                member.id !== interaction.user.id // Don't ban the command executor
            );

            if (membersToBan.size === 0) {
                await interaction.editReply({ 
                    content: '✅ No users need to be banned. All users have reacted to the verification message or are protected.', 
                    ephemeral: true 
                });
                return;
            }

            // Send initial status
            const statusEmbed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('🚨 Mass Deportation Started')
                .setDescription(`Found **${membersToBan.size}** users to ban. Starting ban process...`)
                .addFields(
                    {
                        name: 'Reason',
                        value: reason,
                        inline: false
                    },
                    {
                        name: 'Moderator',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: 'Verification Message',
                        value: `[Message Link](https://discord.com/channels/${interaction.guild.id}/${channelId}/${messageId})`,
                        inline: true
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            await interaction.editReply({ embeds: [statusEmbed] });

            // Ban users in batches to avoid rate limits
            let bannedCount = 0;
            let failedCount = 0;
            const batchSize = 5;
            const membersArray = Array.from(membersToBan.values());

            for (let i = 0; i < membersArray.length; i += batchSize) {
                const batch = membersArray.slice(i, i + batchSize);
                
                // Process batch in parallel
                const banPromises = batch.map(async (member) => {
                    try {
                        await member.ban({ 
                            reason: `${reason} - Mass deportation by ${interaction.user.tag}` 
                        });
                        bannedCount++;
                        return { success: true, user: member.user };
                    } catch (error) {
                        console.error(`Failed to ban ${member.user.tag}:`, error);
                        failedCount++;
                        return { success: false, user: member.user, error: error.message };
                    }
                });

                await Promise.all(banPromises);
                
                // Small delay between batches to avoid rate limits
                if (i + batchSize < membersArray.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Send completion status
            const completionEmbed = new EmbedBuilder()
                .setColor(bannedCount > 0 ? 0xff0000 : 0x00ff00)
                .setTitle('✅ Mass Deportation Complete')
                .setDescription(`Mass deportation process completed.`)
                .addFields(
                    {
                        name: 'Users Banned',
                        value: bannedCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Failed Bans',
                        value: failedCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Total Processed',
                        value: membersToBan.size.toString(),
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: false
                    },
                    {
                        name: 'Moderator',
                        value: interaction.user.tag,
                        inline: true
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            await interaction.followUp({ embeds: [completionEmbed] });

            // Send mod log
            await this.sendModLog(bot, 'massdeport', interaction.member, bannedCount, failedCount, reason);

        } catch (error) {
            console.error('Error in mass deportation:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred during the mass deportation process.', 
                ephemeral: true 
            });
        }
    },

    async sendModLog(bot, action, moderator, bannedCount, failedCount, reason) {
        const modLogChannel = bot.client.channels.cache.get(require('../config').channels.modLog);
        if (!modLogChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚨 Mass Deportation Executed')
            .setDescription(`Mass deportation has been executed by **${moderator.user.tag}**.`)
            .addFields(
                {
                    name: 'Users Banned',
                    value: bannedCount.toString(),
                    inline: true
                },
                {
                    name: 'Failed Bans',
                    value: failedCount.toString(),
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason,
                    inline: false
                },
                {
                    name: 'Moderator',
                    value: moderator.user.tag,
                    inline: true
                },
                {
                    name: 'Verification Message',
                    value: '[Message Link](https://discord.com/channels/1375329874444816455/1375329874444816455/1415806404866080778)',
                    inline: false
                }
            )
            .setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        await modLogChannel.send({ embeds: [embed] });
    }
};
