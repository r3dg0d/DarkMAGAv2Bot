const { EmbedBuilder } = require('discord.js');
const Database = require('../database');
const axios = require('axios');

class PaymentUtils {
    constructor() {
        this.db = new Database();
    }

    /**
     * Get PayPal access token
     * @returns {Promise<string>} - PayPal access token
     */
    async getPayPalAccessToken() {
        try {
            const clientId = process.env.PAYPAL_CLIENT_ID;
            const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
            const isProduction = process.env.PAYPAL_MODE === 'production';
            const apiUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

            if (!clientId || !clientSecret) {
                throw new Error('PayPal credentials not configured');
            }

            const tokenResponse = await axios.post(
                `${apiUrl}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Language': 'en_US',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                    }
                }
            );

            return tokenResponse.data.access_token;
        } catch (error) {
            console.error('Error getting PayPal access token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create a PayPal checkout order for AI features payment
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {string} username - Discord username
     * @param {string} userEmail - User email (optional)
     * @returns {Promise<Object>} - Payment creation result
     */
    async createPayPalInvoice(userId, guildId, username, userEmail = null) {
        try {
            const accessToken = await this.getPayPalAccessToken();
            const merchantEmail = process.env.PAYPAL_MERCHANT_EMAIL;
            const isProduction = process.env.PAYPAL_MODE === 'production';
            const apiUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
            const paymentReference = this.generatePaymentReference(userId, guildId);

            console.log('Creating PayPal checkout order for user:', userId);

            // Create a PayPal Checkout order instead of invoice
            const orderData = {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: paymentReference,
                        custom_id: `${userId}-${guildId}`,
                        amount: {
                            currency_code: 'USD',
                            value: '25.00'
                        },
                        description: 'Dark MAGA Bot - AI Features Lifetime Access',
                        payee: {
                            email_address: merchantEmail
                        }
                    }
                ],
                application_context: {
                    brand_name: 'Dark MAGA Bot',
                    landing_page: 'NO_PREFERENCE',
                    user_action: 'PAY_NOW',
                    return_url: 'https://discord.gg/cjvskGEyHK',
                    cancel_url: 'https://discord.gg/cjvskGEyHK'
                }
            };

            const orderResponse = await axios.post(
                `${apiUrl}/v2/checkout/orders`,
                orderData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                        'Prefer': 'return=representation'
                    }
                }
            );

            const orderId = orderResponse.data.id;
            console.log('Checkout order created with ID:', orderId);

            // Find the approval URL from the response links
            const approvalUrl = orderResponse.data.links.find(link => link.rel === 'approve')?.href;
            
            if (!approvalUrl) {
                console.log('No approval URL found in checkout response');
                return {
                    success: false,
                    error: 'Could not generate payment URL'
                };
            }

            console.log('Found PayPal checkout approval URL:', approvalUrl);

            return {
                success: true,
                invoiceId: orderId, // Use order ID for consistency with existing code
                invoiceUrl: approvalUrl,
                invoiceNumber: paymentReference
            };

        } catch (error) {
            console.error('Error creating PayPal invoice:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Check the status of a PayPal checkout order
     * @param {string} invoiceId - PayPal order ID
     * @returns {Promise<Object>} - Order status
     */
    async checkInvoiceStatus(invoiceId) {
        try {
            const accessToken = await this.getPayPalAccessToken();
            const isProduction = process.env.PAYPAL_MODE === 'production';
            const apiUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

            // Use checkout orders API instead of invoicing API
            const response = await axios.get(
                `${apiUrl}/v2/checkout/orders/${invoiceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const order = response.data;
            const status = order.status; // CREATED, SAVED, APPROVED, VOIDED, COMPLETED, PAYER_ACTION_REQUIRED

            console.log(`Order ${invoiceId} status:`, status);

            return {
                success: true,
                status: status,
                isPaid: status === 'COMPLETED' || status === 'APPROVED',
                invoice: order
            };

        } catch (error) {
            console.error('Error checking order status:', error.response?.data || error.message);
            return {
                success: false,
                status: 'unknown',
                error: error.message
            };
        }
    }

    /**
     * Check if a user has paid for AI features or is a server booster
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {Object} member - Discord member object (optional)
     * @returns {Promise<boolean>} - True if user has paid or is a booster
     */
    async hasPaidForAI(userId, guildId, member = null) {
        // Check payment status in database
        const hasPaid = await this.db.hasPaidForAI(userId, guildId);
        
        // If they have paid, return true
        if (hasPaid) {
            return true;
        }
        
        // If member object is provided, check for premium role or server booster
        if (member && member.roles) {
            const config = require('../config');
            const premiumRoleId = '1425285109405192192';
            const serverBoosterRoleId = config.roles.serverBooster;
            
            // Check for premium role or server booster role
            return member.roles.cache.has(premiumRoleId) || member.roles.cache.has(serverBoosterRoleId);
        }
        
        return false;
    }

    /**
     * Check if a user is a server booster
     * @param {Object} member - Discord member object
     * @returns {boolean} - True if user is a server booster
     */
    isServerBooster(member) {
        if (!member || !member.roles) {
            return false;
        }
        
        const config = require('../config');
        const serverBoosterRoleId = config.roles.serverBooster;
        return member.roles.cache.has(serverBoosterRoleId);
    }

    /**
     * Reset demo usage when user pays for premium
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<void>}
     */
    async resetDemoUsageOnPayment(userId, guildId) {
        try {
            await this.db.resetDemoUsage(userId, guildId);
            console.log(`Reset demo usage for user ${userId} after payment`);
        } catch (error) {
            console.error('Error resetting demo usage on payment:', error);
        }
    }

    /**
     * Create a payment verification embed for users who haven't paid
     * @param {string} commandName - Name of the command being blocked
     * @returns {EmbedBuilder} - Discord embed for payment prompt
     */
    createPaymentPrompt(commandName) {
        const embed = new EmbedBuilder()
            .setColor(0xff6b35)
            .setTitle('🔒 AI Features Require Payment')
            .setDescription(
                `**${commandName}** is a premium AI feature that requires a one-time payment of **$25 USD**.\n\n` +
                `This payment gives you unlimited access to ALL AI features including:\n` +
                `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                `• AI image generation (/imagegen, /editimage)\n` +
                `• Uncensored AI responses\n\n` +
                `**Future Features Coming Soon:**\n` +
                `• Uncensored AI Image generation\n` +
                `• Text-to-video generation\n` +
                `• Real-time AI voice chat\n` +
                `• And much more to come!\n\n` +
                `**How to Pay:**\n` +
                `1. Use \`/payforai\` command to get a PayPal invoice\n` +
                `2. Complete payment via PayPal\n` +
                `3. Your access will be activated automatically\n\n` +
                `*This is a one-time payment for lifetime access to all AI features.*`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/ai-lock-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create a payment success embed
     * @param {string} userId - Discord user ID
     * @param {string} transactionId - PayPal transaction ID
     * @returns {EmbedBuilder} - Discord embed for payment success
     */
    createPaymentSuccessEmbed(userId, transactionId) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Payment Successful!')
            .setDescription(
                `**Congratulations!** You now have unlimited access to all AI features!\n\n` +
                `**What you can now use:**\n` +
                `• All AI chat commands (/askelon, /asktrump, etc.)\n` +
                `• All voice generation commands (/elonsay, /trumpsay, etc.)\n` +
                `• AI image generation (/imagegen, /editimage)\n` +
                `• Uncensored AI responses\n\n` +
                `**Future Features Coming Soon:**\n` +
                `• Uncensored AI Image generation\n` +
                `• Text-to-video generation\n` +
                `• Real-time AI voice chat\n` +
                `• And much more to come!\n\n` +
                `**Transaction ID:** \`${transactionId}\`\n` +
                `**Access granted:** ${new Date().toLocaleString()}`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/ai-unlock-icon.png')
            .setFooter({ text: 'Dark MAGA Bot • Premium AI Features' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create a payment status embed
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<EmbedBuilder>} - Discord embed showing payment status
     */
    async createPaymentStatusEmbed(userId, guildId) {
        const payment = await this.db.getPayment(userId, guildId);
        
        if (!payment) {
            return new EmbedBuilder()
                .setColor(0xff6b35)
                .setTitle('💳 Payment Status')
                .setDescription(
                    `**No payment found.**\n\n` +
                    `You haven't made a payment for AI features yet.\n` +
                    `Use \`/payforai\` to get started!`
                )
                .setTimestamp();
        }

        const embed = new EmbedBuilder()
            .setColor(payment.status === 'completed' ? 0x00ff00 : 0xffa500)
            .setTitle('💳 Payment Status')
            .addFields(
                { name: 'Status', value: payment.status === 'completed' ? '✅ Completed' : '⏳ Pending', inline: true },
                { name: 'Amount', value: '$25.00 USD', inline: true },
                { name: 'Created', value: new Date(payment.createdAt).toLocaleDateString(), inline: true }
            )
            .setTimestamp();

        if (payment.transactionId) {
            embed.addFields({ name: 'Transaction ID', value: `\`${payment.transactionId}\``, inline: false });
        }

        if (payment.status === 'completed') {
            embed.setDescription('**✅ You have full access to all AI features!**');
        } else {
            embed.setDescription('**⏳ Payment is pending. Please complete the payment process.**');
        }

        return embed;
    }

    /**
     * Create a payment error embed
     * @param {string} error - Error message
     * @returns {EmbedBuilder} - Discord embed for payment error
     */
    createPaymentErrorEmbed(error) {
        return new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Payment Error')
            .setDescription(`**Error:** ${error}\n\nPlease try again or contact support if the issue persists.`)
            .setTimestamp();
    }

    /**
     * Generate a unique payment reference ID (max 25 chars for PayPal)
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {string} - Unique payment reference
     */
    generatePaymentReference(userId, guildId) {
        // Create a shorter reference: DMG + last 3 of guild + last 3 of user + 6 random chars
        // Format: DMG-ABC-DEF-GHIJKL (total: 18 characters)
        const guildShort = guildId.slice(-3);
        const userShort = userId.slice(-3);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `DMG-${guildShort}-${userShort}-${random}`;
    }

    /**
     * Validate PayPal webhook signature (placeholder for future implementation)
     * @param {Object} headers - Request headers
     * @param {string} body - Request body
     * @returns {boolean} - True if signature is valid
     */
    validatePayPalWebhook(headers, body) {
        // TODO: Implement PayPal webhook signature validation
        // This would verify that the webhook actually came from PayPal
        return true; // Placeholder
    }

    /**
     * Process PayPal webhook notification
     * @param {Object} notification - PayPal webhook notification
     * @param {Object} client - Discord client for role assignment
     * @returns {Promise<Object>} - Processing result
     */
    async processPayPalWebhook(notification, client = null) {
        try {
            // Extract payment information from PayPal notification
            const eventType = notification.event_type;
            const resource = notification.resource;
            
            // Handle PayPal Checkout events
            if (eventType === 'CHECKOUT.ORDER.COMPLETED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
                const transactionId = resource.id;
                const amount = resource.amount?.total || resource.amount?.value || '25.00';
                const customId = resource.custom_id || '';
                
                console.log('Processing PayPal Checkout webhook:', { eventType, transactionId, customId });
                
                // Extract user ID and guild ID from custom field (format: userId-guildId)
                const customParts = customId.split('-');
                if (customParts.length >= 2) {
                    const userId = customParts[0];
                    const guildId = customParts[1];
                    
                    console.log('Extracted IDs:', { userId, guildId });
                    
                    // Update payment status
                    await this.db.updatePaymentStatus(userId, guildId, 'completed', transactionId);
                    
                    // Reset demo usage since user now has premium
                    await this.resetDemoUsageOnPayment(userId, guildId);
                    
                    // Assign premium role if Discord client is available
                    if (client) {
                        console.log('Attempting to assign premium role to user:', userId, 'in guild:', guildId);
                        const roleAssigned = await this.assignPremiumRole(client, userId, guildId);
                        console.log('Premium role assignment result:', roleAssigned);
                    } else {
                        console.log('No Discord client available for role assignment');
                    }
                    
                    return {
                        success: true,
                        userId,
                        guildId,
                        transactionId,
                        amount
                    };
                }
            }
            
            // Handle legacy PayPal Invoicing events
            if (eventType === 'PAYMENT.SALE.COMPLETED') {
                const transactionId = resource.id;
                const amount = resource.amount.total;
                const customId = resource.custom || '';
                
                // Extract user ID and guild ID from custom field
                const customParts = customId.split('-');
                if (customParts.length >= 4) {
                    const guildId = customParts[1] + customParts[2]; // Reconstruct guild ID
                    const userId = customParts[3] + customParts[4]; // Reconstruct user ID
                    
                    // Update payment status
                    await this.db.updatePaymentStatus(userId, guildId, 'completed', transactionId);
                    
                    // Reset demo usage since user now has premium
                    await this.resetDemoUsageOnPayment(userId, guildId);
                    
                    // Assign premium role if Discord client is available
                    if (client) {
                        await this.assignPremiumRole(client, userId, guildId);
                    }
                    
                    return {
                        success: true,
                        userId,
                        guildId,
                        transactionId,
                        amount
                    };
                }
            }
            
            return { success: false, reason: 'Invalid webhook data' };
        } catch (error) {
            console.error('Error processing PayPal webhook:', error);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Assign premium role to user
     * @param {Object} client - Discord client
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<boolean>} - Success status
     */
    async assignPremiumRole(client, userId, guildId) {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                console.error(`Guild ${guildId} not found`);
                return false;
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                console.error(`Member ${userId} not found in guild ${guildId}`);
                return false;
            }

            const premiumRoleId = '1425285109405192192';
            const premiumRole = guild.roles.cache.get(premiumRoleId);
            
            if (!premiumRole) {
                console.error(`Premium role ${premiumRoleId} not found in guild ${guildId}`);
                return false;
            }

            if (member.roles.cache.has(premiumRoleId)) {
                console.log(`User ${userId} already has premium role`);
                return true;
            }

            await member.roles.add(premiumRole);
            console.log(`✅ Assigned premium role to user ${userId}`);
            return true;

        } catch (error) {
            console.error('Error assigning premium role:', error);
            return false;
        }
    }

    /**
     * Remove premium role from user
     * @param {Object} client - Discord client
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<boolean>} - Success status
     */
    async removePremiumRole(client, userId, guildId) {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                console.error(`Guild ${guildId} not found`);
                return false;
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                console.error(`Member ${userId} not found in guild ${guildId}`);
                return false;
            }

            const premiumRoleId = '1425285109405192192';
            const premiumRole = guild.roles.cache.get(premiumRoleId);
            
            if (!premiumRole) {
                console.error(`Premium role ${premiumRoleId} not found in guild ${guildId}`);
                return false;
            }

            if (!member.roles.cache.has(premiumRoleId)) {
                console.log(`User ${userId} doesn't have premium role`);
                return true;
            }

            await member.roles.remove(premiumRole);
            console.log(`❌ Removed premium role from user ${userId}`);
            return true;

        } catch (error) {
            console.error('Error removing premium role:', error);
            return false;
        }
    }
}

module.exports = PaymentUtils;

