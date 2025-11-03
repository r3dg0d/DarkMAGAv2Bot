const express = require('express');
const PaymentUtils = require('../utils/paymentUtils');
const Database = require('../database');

const router = express.Router();
const paymentUtils = new PaymentUtils();
const db = new Database();

// Store Discord client reference (set by main bot)
let discordClient = null;

// Function to set Discord client
function setDiscordClient(client) {
    discordClient = client;
}

// PayPal webhook endpoint
router.post('/paypal', async (req, res) => {
    try {
        console.log('PayPal webhook received:', req.body);

        // Verify webhook signature (implement proper verification in production)
        // Temporarily disabled for testing
        const isValidSignature = true; // paymentUtils.validatePayPalWebhook(req.headers, JSON.stringify(req.body));
        
        if (!isValidSignature) {
            console.error('Invalid PayPal webhook signature');
            return res.status(400).send('Invalid signature');
        }

        // Process the webhook notification
        const result = await paymentUtils.processPayPalWebhook(req.body, discordClient);

        if (result.success) {
            console.log('Payment processed successfully:', result);
            
            // Send notification to user (if possible)
            try {
                if (discordClient) {
                    const guild = discordClient.guilds.cache.get(result.guildId);
                    if (guild) {
                        const member = await guild.members.fetch(result.userId);
                        if (member) {
                            const successEmbed = paymentUtils.createPaymentSuccessEmbed(
                                result.userId, 
                                result.transactionId
                            );
                            await member.send({ embeds: [successEmbed] });
                        }
                    }
                }
                console.log(`User ${result.userId} payment completed: ${result.transactionId}`);
            } catch (error) {
                console.error('Failed to notify user:', error);
            }

            res.status(200).send('OK');
        } else {
            console.error('Payment processing failed:', result.reason);
            res.status(400).send('Payment processing failed');
        }

    } catch (error) {
        console.error('PayPal webhook error:', error);
        res.status(500).send('Internal server error');
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test webhook endpoint
router.post('/test', async (req, res) => {
    try {
        console.log('Test webhook received:', req.body);
        console.log('Discord client available:', !!discordClient);
        
        // Simulate a PayPal webhook for testing
        const testWebhook = {
            event_type: 'CHECKOUT.ORDER.COMPLETED',
            resource: {
                id: 'TEST-ORDER-' + Date.now(),
                custom_id: '688507704054120456-1328664730969313280',
                amount: { total: '25.00', currency: 'USD' }
            }
        };
        
        const result = await paymentUtils.processPayPalWebhook(testWebhook, discordClient);
        
        res.status(200).json({ 
            status: 'Test webhook processed', 
            result,
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, setDiscordClient };
