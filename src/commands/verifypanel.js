const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verifypanel')
        .setDescription('Create a verification panel with a ticket button (Staff Only)'),
    
    permissions: ['mod'],
    
    async execute(interaction, bot) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🇺🇸 MAGA Verification Required')
                .setDescription(
                    'Please verify your identity by opening a verification ticket.\n\n' +
                    '**What we need from you:**\n' +
                    '• Proof that you are MAGA\n' +
                    '• Support for America First ideals\n' +
                    '• Your dedication to making America great again\n\n' +
                    '**Click the button below to open a verification ticket.**\n\n' +
                    'Once verified, you will gain full access to the server and all MAGA channels.'
                )
                .addFields(
                    {
                        name: '📋 Instructions',
                        value: '1. Click "Request Verification" below\n' +
                               '2. Complete the form in your ticket\n' +
                               '3. Wait for staff to review your application\n' +
                               '4. Get verified and start participating!',
                        inline: false
                    },
                    {
                        name: '⏱️ Response Time',
                        value: 'Most verification requests are processed within 24 hours.',
                        inline: true
                    },
                    {
                        name: '🛡️ Privacy',
                        value: 'Your verification information is kept confidential.',
                        inline: true
                    }
                )
                .setFooter({ text: 'Dark MAGA Bot - Verification System' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_verification_ticket')
                        .setLabel('📝 Request Verification')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🇺🇸')
                );

            await interaction.reply({ 
                content: '@here Please verify that you are MAGA and support the America First ideals that our nation so desperately needs. MAGA!',
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Error creating verification panel:', error);
            await interaction.reply({ 
                content: 'An error occurred while creating the verification panel.', 
                ephemeral: true 
            });
        }
    }
};

