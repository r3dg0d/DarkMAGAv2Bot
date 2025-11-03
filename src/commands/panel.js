const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Create a support panel (Staff Only)'),
    
    permissions: ['mod'],
    
    async execute(interaction, bot) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🎫 Dark MAGA Support Center')
                .setDescription(
                    'Need help? Select an option below to create a support ticket.\n\n' +
                    '**What can we help you with?**'
                )
                .addFields(
                    {
                        name: '💬 General Support',
                        value: 'Questions about the server, features, or general inquiries',
                        inline: false
                    },
                    {
                        name: '🤖 Bot & Payment Issues',
                        value: 'Problems with bot commands, payments, or premium features',
                        inline: false
                    },
                    {
                        name: '🚨 Report a Member',
                        value: 'Report rule violations or problematic behavior by another member',
                        inline: false
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot - Support System' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('support_general')
                        .setLabel('General Support')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💬'),
                    new ButtonBuilder()
                        .setCustomId('support_bot')
                        .setLabel('Bot & Payment')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🤖'),
                    new ButtonBuilder()
                        .setCustomId('support_report')
                        .setLabel('Report Member')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🚨')
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Error creating support panel:', error);
            await interaction.reply({ 
                content: 'An error occurred while creating the support panel.', 
                ephemeral: true 
            });
        }
    }
};

