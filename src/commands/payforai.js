const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const PaymentUtils = require('../utils/paymentUtils');
const Database = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payforai')
        .setDescription('Get access to all AI features with a one-time $25 payment')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email address for PayPal invoice (optional)')
                .setRequired(false)),
    
    async execute(interaction, bot) {
        const paymentUtils = new PaymentUtils();
        const db = new Database();
        
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const userEmail = interaction.options.getString('email');

        // Check if user already has access
        const hasPaid = await paymentUtils.hasPaidForAI(userId, guildId, interaction.member);
        
        if (hasPaid) {
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Already Have Access!')
                .setDescription(
                    `You already have full access to all AI features!\n\n` +
                    `**Available Commands:**\n` +
                    `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                    `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                    `• AI image generation (/imagegen, /editimage)\n` +
                    `• Uncensored AI responses\n\n` +
                    `Enjoy your premium AI features! 🚀`
                )
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Create PayPal invoice
            const invoiceResult = await paymentUtils.createPayPalInvoice(
                userId,
                guildId,
                interaction.user.tag,
                userEmail
            );

            if (invoiceResult.success) {
                // Save payment record with invoice ID
            const paymentData = {
                status: 'pending',
                amount: 25.00,
                currency: 'USD',
                    reference: invoiceResult.invoiceNumber,
                    invoiceId: invoiceResult.invoiceId,
                    invoiceUrl: invoiceResult.invoiceUrl,
                description: 'Dark MAGA Bot - AI Features Access (One-time Payment)'
            };

            await db.savePayment(userId, guildId, paymentData);

                // Start polling for this invoice
                startInvoicePolling(invoiceResult.invoiceId, userId, guildId, paymentUtils, interaction.client);

                const embed = new EmbedBuilder()
                    .setColor(0x1e40af)
                    .setTitle('💳 Payment Invoice Generated')
                    .setDescription(
                        `**One-time payment of $25.00 USD**\n\n` +
                        `This gives you unlimited access to ALL AI features:\n` +
                        `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                        `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                        `• AI image generation (/imagegen, /editimage)\n` +
                        `• Uncensored AI responses\n\n` +
                        `**Future Features Coming Soon:**\n` +
                        `• Uncensored AI Image generation\n` +
                        `• Text-to-video generation\n` +
                        `• Real-time AI voice chat\n` +
                        `• And much more to come!\n\n` +
                        `**Invoice #:** \`${invoiceResult.invoiceNumber}\`\n\n` +
                        `Click "Pay Invoice" below to complete your payment. Your access will be activated automatically within 1 minute after payment!\n\n` +
                        `${userEmail ? `📧 Invoice sent to: \`${userEmail}\`` : '⚠️ **Note:** No email provided - you may need to provide your email address for the invoice to be sent properly.'}`
                    )
                    .addFields(
                        { name: 'Payment Method', value: 'PayPal (Credit Card, Debit Card, PayPal Balance)', inline: true },
                        { name: 'Processing Time', value: 'Automatic (1-2 minutes)', inline: true },
                        { name: 'Access Duration', value: 'Lifetime', inline: true }
                    )
                    .setThumbnail('https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png')
                    .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('💳 Pay Invoice')
                            .setStyle(ButtonStyle.Link)
                            .setURL(invoiceResult.invoiceUrl),
                        new ButtonBuilder()
                            .setCustomId(`check_payment_${userId}_${guildId}`)
                            .setLabel('✅ I Paid - Verify Now')
                            .setStyle(ButtonStyle.Success)
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });
            } else {
                throw new Error(invoiceResult.error || 'Failed to create payment invoice');
            }

        } catch (error) {
            console.error('Error in payforai command:', error);
            const errorEmbed = paymentUtils.createPaymentErrorEmbed(
                'Failed to create payment invoice. Please try again later or contact support.'
            );
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async handleButtonInteraction(interaction, bot) {
        if (!interaction.isButton() || !interaction.customId.startsWith('check_payment_')) return false;

        const paymentUtils = new PaymentUtils();
        const db = new Database();

        await interaction.deferReply({ ephemeral: true });

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Check if user already has premium access
            const hasPaid = await db.hasPaidForAI(userId, guildId);
            
            if (hasPaid) {
                // User already has premium access
                const successEmbed = paymentUtils.createPaymentSuccessEmbed(
                    userId, 
                    'VERIFIED'
                );
                await interaction.editReply({ embeds: [successEmbed] });
                return true;
            }

            // Get payment record to find invoice ID
            const paymentRecord = await db.getPayment(userId, guildId);
            
            if (!paymentRecord || !paymentRecord.invoiceId) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ No Invoice Found')
                    .setDescription('No payment invoice found. Please run `/payforai` to create one.')
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return true;
            }

            // Check invoice status with PayPal
            const invoiceStatus = await paymentUtils.checkInvoiceStatus(paymentRecord.invoiceId);
            
            if (invoiceStatus.success && invoiceStatus.isPaid) {
                // Payment was completed, update database and assign role
                await db.updatePaymentStatus(userId, guildId, 'completed', paymentRecord.invoiceId);
                
                // Reset demo usage since user now has premium
                await paymentUtils.resetDemoUsageOnPayment(userId, guildId);
                
                    const roleAssigned = await paymentUtils.assignPremiumRole(
                        bot.client,
                    userId,
                    guildId
                    );

                    if (roleAssigned) {
                        const successEmbed = paymentUtils.createPaymentSuccessEmbed(
                        userId, 
                        paymentRecord.invoiceId
                    );
                    
                    // Send DM to user
                    try {
                        const user = await bot.client.users.fetch(userId);
                        await user.send({ embeds: [successEmbed] });
                    } catch (dmError) {
                        console.log('Could not DM user:', dmError.message);
                    }
                    
                        await interaction.editReply({ embeds: [successEmbed] });
                    } else {
                        await interaction.editReply({ 
                        content: '✅ Payment verified! But failed to assign role automatically. Please contact support and mention your invoice number.' 
                        });
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(0xffa500)
                    .setTitle('⏳ Payment Not Detected Yet')
                        .setDescription(
                        `Your payment hasn't been detected yet.\n\n` +
                        `**Invoice Status:** ${invoiceStatus.status || 'Unknown'}\n\n` +
                        `If you just paid, please wait 1-2 minutes and click this button again. The system checks automatically every minute.`
                        )
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error checking payment status:', error);
            const errorEmbed = paymentUtils.createPaymentErrorEmbed(
                'Failed to check payment status. Please try again later or contact support.'
            );
            await interaction.editReply({ embeds: [errorEmbed] });
        }

        return true;
    }
};

// Store active polling intervals to avoid duplicates
const activePolls = new Map();

/**
 * Start polling for invoice payment status
 * Checks every 60 seconds for up to 24 hours
 */
function startInvoicePolling(invoiceId, userId, guildId, paymentUtils, client) {
    const pollKey = `${userId}-${guildId}`;
    
    // Stop existing poll if any
    if (activePolls.has(pollKey)) {
        clearInterval(activePolls.get(pollKey).interval);
        activePolls.delete(pollKey);
    }

    console.log(`Starting invoice polling for user ${userId}, invoice ${invoiceId}`);

    let checkCount = 0;
    const maxChecks = 1440; // 24 hours (60 checks per hour * 24 hours)

    const interval = setInterval(async () => {
        checkCount++;

        try {
            const db = new Database();
            
            // First check if already marked as paid in database
            const payment = await db.getPayment(userId, guildId);
            if (payment && payment.status === 'completed') {
                console.log(`Payment already completed for ${userId}, stopping poll`);
                clearInterval(interval);
                activePolls.delete(pollKey);
                return;
            }

            // Check invoice status with PayPal
            const invoiceStatus = await paymentUtils.checkInvoiceStatus(invoiceId);
            
            if (invoiceStatus.success && invoiceStatus.isPaid) {
                console.log(`Invoice ${invoiceId} is PAID! Granting access to user ${userId}`);
                
                // Update database
                await db.updatePaymentStatus(userId, guildId, 'completed', invoiceId);
                
                // Reset demo usage since user now has premium
                await paymentUtils.resetDemoUsageOnPayment(userId, guildId);
                
                // Assign premium role
                const roleAssigned = await paymentUtils.assignPremiumRole(client, userId, guildId);
                
                if (roleAssigned) {
                    // Send DM to user
                    try {
                        const user = await client.users.fetch(userId);
                        const successEmbed = paymentUtils.createPaymentSuccessEmbed(userId, invoiceId);
                        await user.send({ embeds: [successEmbed] });
                        console.log(`✅ Successfully granted AI access to ${user.tag}`);
                    } catch (dmError) {
                        console.log('Could not DM user:', dmError.message);
                    }
                }
                
                // Stop polling
                clearInterval(interval);
                activePolls.delete(pollKey);
            } else if (checkCount >= maxChecks) {
                // Stop polling after 24 hours
                console.log(`Stopping poll for ${userId} after ${checkCount} checks (24 hours)`);
                clearInterval(interval);
                activePolls.delete(pollKey);
            } else {
                console.log(`Invoice ${invoiceId} check ${checkCount}/${maxChecks}: Status = ${invoiceStatus.status || 'unknown'}`);
            }
            
            } catch (error) {
            console.error('Error in invoice polling:', error);
            
            // Stop polling on persistent errors after 10 failed attempts
            if (checkCount >= 10 && error.message.includes('not found')) {
                console.error('Stopping poll due to persistent errors');
                clearInterval(interval);
                activePolls.delete(pollKey);
            }
        }
    }, 60000); // Check every 60 seconds

    // Store the interval
    activePolls.set(pollKey, { interval, invoiceId, startTime: Date.now() });
}
