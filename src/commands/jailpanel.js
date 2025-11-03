const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jailpanel')
        .setDescription('Create a jail appeal panel (Staff Only)'),
    
    permissions: ['mod'],
    
    async execute(interaction, bot) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('⛓️ Dark MAGA Detainment Appeal')
                .setDescription(
                    '**If you ended up here, you likely broke the rules.**\n\n' +
                    'Please read the server rules below and create an appeal using the button.\n\n' +
                    '⚠️ **IMPORTANT:** Failing to make an appeal within 1-2 weeks will result in a permanent ban.'
                )
                .addFields(
                    {
                        name: '📋 Dark MAGA Server Rules',
                        value: '1. **Respect and Civility** - Treat all members with respect\n' +
                               '2. **No Hate Speech** - Discriminatory language is prohibited\n' +
                               '3. **No Nazi Imagery** - Nazi symbols/references are forbidden\n' +
                               '4. **No Furry Content** - Furry-related content not permitted\n' +
                               '5. **Zero LGBTQ+ Posting** - No LGBTQ+ topics, pronouns, or NSFW content\n' +
                               '6. **Appropriate Language** - Keep language family-friendly\n' +
                               '7. **No Spam** - Excessive posting not allowed\n' +
                               '8. **Stay On Topic** - Keep discussions relevant\n' +
                               '9. **No Doxxing** - Privacy violations prohibited\n' +
                               '10. **Follow Discord ToS** - All ToS must be followed\n' +
                               '11. **Moderator Discretion** - Mods can take action as needed',
                        inline: false
                    },
                    {
                        name: '⚠️ Consequences',
                        value: 'Violations may result in warnings, temporary mutes, or permanent bans.',
                        inline: false
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot - Detainment Appeal System' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_jail_appeal')
                        .setLabel('📝 Create Appeal')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚖️')
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Error creating jail panel:', error);
            await interaction.reply({ 
                content: 'An error occurred while creating the jail panel.', 
                ephemeral: true 
            });
        }
    }
};

