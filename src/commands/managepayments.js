const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../database');
const PaymentUtils = require('../utils/paymentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('managepayments')
        .setDescription('Manage AI feature payments (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all payments'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('grant')
                .setDescription('Manually grant AI access to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to grant access to')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('revoke')
                .setDescription('Revoke AI access from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to revoke access from')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show payment statistics')),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        const db = new Database();
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            switch (subcommand) {
                case 'list':
                    await handleListPayments(interaction, db);
                    break;
                case 'grant':
                    await handleGrantAccess(interaction, db);
                    break;
                case 'revoke':
                    await handleRevokeAccess(interaction, db);
                    break;
                case 'stats':
                    await handlePaymentStats(interaction, db);
                    break;
                default:
                    await interaction.editReply({ content: '❌ Unknown subcommand.' });
            }

        } catch (error) {
            console.error('Error in managepayments command:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while processing your request.' 
            });
        }
    }
};

async function handleListPayments(interaction, db) {
    const allPayments = await db.getAllPayments();
    const payments = Object.values(allPayments);

    if (payments.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(0x6b7280)
            .setTitle('💳 Payment List')
            .setDescription('No payments found.')
            .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
    }

    // Group payments by status
    const completedPayments = payments.filter(p => p.status === 'completed');
    const pendingPayments = payments.filter(p => p.status === 'pending');

    const embed = new EmbedBuilder()
        .setColor(0x1e40af)
        .setTitle('💳 Payment List')
        .addFields(
            { name: 'Total Payments', value: payments.length.toString(), inline: true },
            { name: 'Completed', value: completedPayments.length.toString(), inline: true },
            { name: 'Pending', value: pendingPayments.length.toString(), inline: true }
        )
        .setTimestamp();

    // Show completed payments (limited to first 10)
    if (completedPayments.length > 0) {
        const completedList = completedPayments
            .slice(0, 10)
            .map(p => `<@${p.userId}> - $${p.amount} - ${new Date(p.createdAt).toLocaleDateString()}`)
            .join('\n');
        
        embed.addFields({
            name: `✅ Completed Payments (${completedPayments.length})`,
            value: completedList || 'None',
            inline: false
        });
    }

    // Show pending payments (limited to first 5)
    if (pendingPayments.length > 0) {
        const pendingList = pendingPayments
            .slice(0, 5)
            .map(p => `<@${p.userId}> - $${p.amount} - ${new Date(p.createdAt).toLocaleDateString()}`)
            .join('\n');
        
        embed.addFields({
            name: `⏳ Pending Payments (${pendingPayments.length})`,
            value: pendingList || 'None',
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleGrantAccess(interaction, db) {
    const user = interaction.options.getUser('user');
    
    // Check if user already has access
    const hasPaid = await db.hasPaidForAI(user.id, interaction.guild.id);
    
    if (hasPaid) {
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ User Already Has Access')
            .setDescription(`<@${user.id}> already has access to AI features.`)
            .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
    }

    // Grant access manually
    const paymentData = {
        status: 'completed',
        amount: 25.00,
        currency: 'USD',
        reference: `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        description: 'Dark MAGA Bot - AI Features Access (Manually Granted)',
        grantedBy: interaction.user.id,
        grantedAt: new Date().toISOString()
    };

    await db.savePayment(user.id, interaction.guild.id, paymentData);

    // Assign premium role
    const paymentUtils = new PaymentUtils();
    const roleAssigned = await paymentUtils.assignPremiumRole(interaction.client, user.id, interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Access Granted')
        .setDescription(
            `Successfully granted AI features access to <@${user.id}>.\n\n` +
            `**Granted by:** <@${interaction.user.id}>\n` +
            `**Reference:** \`${paymentData.reference}\`\n` +
            `**Premium Role:** ${roleAssigned ? '✅ Assigned' : '❌ Failed to assign'}`
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Notify the user
    try {
        const userEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎉 AI Features Access Granted!')
            .setDescription(
                `You've been granted access to all AI features!\n\n` +
                `**Available Commands:**\n` +
                `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                `• AI image generation (/imagegen, /editimage)\n` +
                `• Uncensored AI responses\n\n` +
                `**Future Features Coming Soon:**\n` +
                `• Uncensored AI Image generation\n` +
                `• Text-to-video generation\n` +
                `• Real-time AI voice chat\n` +
                `• And much more to come!\n\n` +
                `Enjoy your premium AI features! 🚀`
            )
            .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
            .setTimestamp();

        await user.send({ embeds: [userEmbed] });
    } catch (error) {
        console.error('Failed to notify user:', error);
    }
}

async function handleRevokeAccess(interaction, db) {
    const user = interaction.options.getUser('user');
    
    // Check if user has access
    const hasPaid = await db.hasPaidForAI(user.id, interaction.guild.id);
    
    if (!hasPaid) {
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ User Has No Access')
            .setDescription(`<@${user.id}> doesn't have access to AI features.`)
            .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
    }

    // Revoke access
    await db.updatePaymentStatus(user.id, interaction.guild.id, 'revoked');

    // Remove premium role
    const paymentUtils = new PaymentUtils();
    const roleRemoved = await paymentUtils.removePremiumRole(interaction.client, user.id, interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Access Revoked')
        .setDescription(
            `Successfully revoked AI features access from <@${user.id}>.\n\n` +
            `**Revoked by:** <@${interaction.user.id}>\n` +
            `**Premium Role:** ${roleRemoved ? '❌ Removed' : '⚠️ Failed to remove'}`
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Notify the user
    try {
        const userEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ AI Features Access Revoked')
            .setDescription(
                `Your access to AI features has been revoked.\n\n` +
                `If you believe this is an error, please contact a staff member.\n\n` +
                `You can regain access by using the \`/payforai\` command.`
            )
            .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
            .setTimestamp();

        await user.send({ embeds: [userEmbed] });
    } catch (error) {
        console.error('Failed to notify user:', error);
    }
}

async function handlePaymentStats(interaction, db) {
    const allPayments = await db.getAllPayments();
    const payments = Object.values(allPayments);

    const completedPayments = payments.filter(p => p.status === 'completed');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const embed = new EmbedBuilder()
        .setColor(0x1e40af)
        .setTitle('📊 Payment Statistics')
        .addFields(
            { name: 'Total Users', value: payments.length.toString(), inline: true },
            { name: 'Active Subscribers', value: completedPayments.length.toString(), inline: true },
            { name: 'Pending Payments', value: pendingPayments.length.toString(), inline: true },
            { name: 'Total Revenue', value: `$${totalRevenue.toFixed(2)} USD`, inline: true },
            { name: 'Conversion Rate', value: payments.length > 0 ? `${((completedPayments.length / payments.length) * 100).toFixed(1)}%` : '0%', inline: true },
            { name: 'Average Revenue per User', value: completedPayments.length > 0 ? `$${(totalRevenue / completedPayments.length).toFixed(2)}` : '$0.00', inline: true }
        )
        .setTimestamp();

    // Recent payments
    const recentPayments = completedPayments
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    if (recentPayments.length > 0) {
        const recentList = recentPayments
            .map(p => `<@${p.userId}> - ${new Date(p.createdAt).toLocaleDateString()}`)
            .join('\n');
        
        embed.addFields({
            name: 'Recent Payments',
            value: recentList,
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}
