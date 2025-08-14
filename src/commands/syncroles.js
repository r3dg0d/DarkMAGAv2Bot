const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('syncroles')
        .setDescription('Sync leveling roles for all users in the guild (Founder Only)')
        .addBooleanOption(option =>
            option.setName('dry_run')
                .setDescription('Show what would be changed without making changes')
                .setRequired(false)),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        const dryRun = interaction.options.getBoolean('dry_run') || false;
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Get all users with level data
            const allUsers = await bot.leveling.getAllUsersWithLevels(interaction.guild.id);
            
            if (allUsers.length === 0) {
                await interaction.editReply('No users with level data found in this guild.');
                return;
            }

            // Get all Patriot role IDs
            const patriotRoles = {
                patriotI: config.roles.patriotI,
                patriotII: config.roles.patriotII,
                patriotIII: config.roles.patriotIII,
                patriotIV: config.roles.patriotIV,
                patriotV: config.roles.patriotV,
                patriotVI: config.roles.patriotVI,
                patriotVII: config.roles.patriotVII,
                patriotVIII: config.roles.patriotVIII,
                patriotIX: config.roles.patriotIX,
                patriotX: config.roles.patriotX
            };

            // Get MAGA Legend role ID
            const magaLegendRoleId = config.roles.magaLegend;

            // Verify all roles exist
            const missingRoles = [];
            for (const [roleName, roleId] of Object.entries(patriotRoles)) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    missingRoles.push(roleName);
                }
            }
            
            // Check MAGA Legend role
            const magaLegendRole = interaction.guild.roles.cache.get(magaLegendRoleId);
            if (!magaLegendRole) {
                missingRoles.push('magaLegend');
            }

            if (missingRoles.length > 0) {
                await interaction.editReply(`❌ Missing roles: ${missingRoles.join(', ')}. Please ensure all Patriot roles exist.`);
                return;
            }

            let processed = 0;
            let rolesAdded = 0;
            let rolesRemoved = 0;
            let errors = 0;
            const changes = [];

            // Process each user
            for (const userData of allUsers) {
                try {
                    const member = await interaction.guild.members.fetch(userData.userId).catch(() => null);
                    if (!member) {
                        errors++;
                        continue;
                    }

                    const currentLevel = userData.level;
                    const expectedRoleId = bot.leveling.getRankRoleId(currentLevel);
                    
                    if (!expectedRoleId) {
                        // User is level 0 or invalid, remove all patriot and maga legend roles
                        const allRoleIds = [...Object.values(patriotRoles), magaLegendRoleId];
                        for (const roleId of allRoleIds) {
                            if (member.roles.cache.has(roleId)) {
                                if (!dryRun) {
                                    await member.roles.remove(roleId);
                                }
                                rolesRemoved++;
                                changes.push(`Removed ${interaction.guild.roles.cache.get(roleId).name} from ${member.user.tag}`);
                            }
                        }
                    } else {
                        // Get the expected role
                        let expectedRole;
                        let actualRoleId;
                        
                        if (expectedRoleId === "magaLegend") {
                            expectedRole = interaction.guild.roles.cache.get(magaLegendRoleId);
                            actualRoleId = magaLegendRoleId;
                        } else {
                            expectedRole = interaction.guild.roles.cache.get(patriotRoles[expectedRoleId]);
                            actualRoleId = patriotRoles[expectedRoleId];
                        }
                        
                        // Remove all other patriot roles and MAGA Legend role
                        const allRoleIds = [...Object.values(patriotRoles), magaLegendRoleId];
                        for (const roleId of allRoleIds) {
                            if (roleId !== actualRoleId && member.roles.cache.has(roleId)) {
                                if (!dryRun) {
                                    await member.roles.remove(roleId);
                                }
                                rolesRemoved++;
                                changes.push(`Removed ${interaction.guild.roles.cache.get(roleId).name} from ${member.user.tag}`);
                            }
                        }
                        
                        // Add expected role if not already present
                        if (!member.roles.cache.has(actualRoleId)) {
                            if (!dryRun) {
                                await member.roles.add(actualRoleId);
                            }
                            rolesAdded++;
                            changes.push(`Added ${expectedRole.name} to ${member.user.tag} (Level ${currentLevel})`);
                        }
                    }
                    
                    processed++;
                    
                    // Add a small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Error processing user ${userData.userId}:`, error);
                    errors++;
                }
            }

            // Create summary embed
            const embed = new EmbedBuilder()
                .setColor(dryRun ? 0xffa500 : 0x00ff00)
                .setTitle(`🔄 Role Sync ${dryRun ? '(Dry Run)' : 'Complete'}`)
                .addFields(
                    {
                        name: '📊 Summary',
                        value: `**Processed:** ${processed} users\n**Roles Added:** ${rolesAdded}\n**Roles Removed:** ${rolesRemoved}\n**Errors:** ${errors}`,
                        inline: false
                    }
                )
                .setFooter({ text: `Dark MAGA Bot - ${dryRun ? 'Dry Run Mode' : 'Sync Complete'}` })
                .setTimestamp();

            // Add recent changes to embed (limit to 10 to avoid embed size limits)
            if (changes.length > 0) {
                const recentChanges = changes.slice(-10);
                embed.addFields({
                    name: '📝 Recent Changes',
                    value: recentChanges.join('\n'),
                    inline: false
                });
                
                if (changes.length > 10) {
                    embed.addFields({
                        name: '📋 Additional Changes',
                        value: `... and ${changes.length - 10} more changes`,
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });

            // If this was a dry run and there are changes, suggest running without dry run
            if (dryRun && (rolesAdded > 0 || rolesRemoved > 0)) {
                await interaction.followUp({
                    content: '💡 **Tip:** Run `/syncroles` without the `dry_run` option to apply these changes.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error in syncroles command:', error);
            await interaction.editReply('❌ An error occurred while syncing roles. Please check the console for details.');
        }
    }
}; 