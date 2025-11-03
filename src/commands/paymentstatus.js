const { SlashCommandBuilder } = require('discord.js');
const PaymentUtils = require('../utils/paymentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paymentstatus')
        .setDescription('Check your AI features payment status'),
    
    async execute(interaction, bot) {
        const paymentUtils = new PaymentUtils();
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const embed = await paymentUtils.createPaymentStatusEmbed(
                interaction.user.id, 
                interaction.guild.id
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in paymentstatus command:', error);
            const errorEmbed = paymentUtils.createPaymentErrorEmbed(
                'Failed to check payment status. Please try again later.'
            );
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
