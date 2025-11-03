const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PaymentUtils = require('../utils/paymentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testrole')
        .setDescription('Test premium role assignment (Admin only)'),
    
    async execute(interaction, bot) {
        // Check if user is admin
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ This command is for administrators only.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const paymentUtils = new PaymentUtils();
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            console.log('Testing premium role assignment for:', { userId, guildId });

            const roleAssigned = await paymentUtils.assignPremiumRole(bot.client, userId, guildId);

            if (roleAssigned) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Premium Role Test Successful')
                    .setDescription(`Premium role has been assigned to <@${userId}>`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Premium Role Test Failed')
                    .setDescription('Failed to assign premium role. Check console logs for details.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in testrole command:', error);
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Test Command Error')
                .setDescription(`Error: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
