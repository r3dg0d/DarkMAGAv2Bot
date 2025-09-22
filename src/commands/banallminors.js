const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banallminors')
        .setDescription('Ban all users with the minors role')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for banning (optional)')
                .setRequired(false)),

    async execute(interaction) {
        // Check if user has ban permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ 
                content: '❌ You do not have permission to ban members.', 
                ephemeral: true 
            });
        }

        // Check if bot has ban permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ 
                content: '❌ I do not have permission to ban members.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const roleId = '1377447032209539113';
        const reason = interaction.options.getString('reason') || 'Banned by banallminors command';
        
        try {
            // Get the role
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                return interaction.editReply({ 
                    content: `❌ Role with ID ${roleId} not found.` 
                });
            }

            // Get all members with the role
            const membersWithRole = role.members.map(member => member);
            
            if (membersWithRole.length === 0) {
                return interaction.editReply({ 
                    content: `✅ No members found with the role "${role.name}".` 
                });
            }

            // Create embed for progress
            const progressEmbed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('🔨 Banning All Minors...')
                .setDescription(`Found ${membersWithRole.length} members with the "${role.name}" role.\n\nBanning in progress...`)
                .setTimestamp();

            await interaction.editReply({ embeds: [progressEmbed] });

            let successCount = 0;
            let failCount = 0;
            const failedUsers = [];

            // Ban each member
            for (const member of membersWithRole) {
                try {
                    // Check if member is bannable
                    if (member.bannable) {
                        await member.ban({ reason: reason });
                        successCount++;
                        console.log(`Banned user: ${member.user.tag} (${member.id})`);
                    } else {
                        failCount++;
                        failedUsers.push(`${member.user.tag} (${member.id}) - Not bannable`);
                        console.log(`Failed to ban user: ${member.user.tag} (${member.id}) - Not bannable`);
                    }
                } catch (error) {
                    failCount++;
                    failedUsers.push(`${member.user.tag} (${member.id}) - ${error.message}`);
                    console.error(`Failed to ban user: ${member.user.tag} (${member.id})`, error);
                }

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Create final result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(successCount > 0 ? 0x00ff00 : 0xff0000)
                .setTitle('🔨 Ban All Minors - Complete')
                .addFields(
                    { name: '✅ Successfully Banned', value: successCount.toString(), inline: true },
                    { name: '❌ Failed to Ban', value: failCount.toString(), inline: true },
                    { name: '📊 Total Processed', value: membersWithRole.length.toString(), inline: true }
                )
                .setTimestamp();

            if (failedUsers.length > 0) {
                // Split failed users into chunks if too long
                const failedUsersText = failedUsers.join('\n');
                if (failedUsersText.length > 1024) {
                    const chunks = [];
                    let currentChunk = '';
                    
                    for (const user of failedUsers) {
                        if (currentChunk.length + user.length + 1 > 1024) {
                            chunks.push(currentChunk);
                            currentChunk = user;
                        } else {
                            currentChunk += (currentChunk ? '\n' : '') + user;
                        }
                    }
                    if (currentChunk) chunks.push(currentChunk);
                    
                    chunks.forEach((chunk, index) => {
                        resultEmbed.addFields({
                            name: `Failed Users ${index + 1}`,
                            value: chunk,
                            inline: false
                        });
                    });
                } else {
                    resultEmbed.addFields({
                        name: 'Failed Users',
                        value: failedUsersText,
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Error in banallminors command:', error);
            await interaction.editReply({ 
                content: `❌ An error occurred while banning members: ${error.message}` 
            });
        }
    }
};
