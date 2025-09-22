const Database = require('./database');

class CountingSystem {
    constructor(database) {
        this.database = database;
        this.countingChannelId = '1419081560145002636'; // The counting channel ID
        this.currentCount = 0;
        this.lastCounter = null;
        this.lastCountTime = null;
    }

    /**
     * Initialize counting system - load current count from database
     */
    async initialize() {
        try {
            const countingData = await this.database.getCountingData();
            if (countingData) {
                this.currentCount = countingData.currentCount || 0;
                this.lastCounter = countingData.lastCounter || null;
                this.lastCountTime = countingData.lastCountTime || null;
            }
            console.log(`Counting system initialized. Current count: ${this.currentCount}`);
        } catch (error) {
            console.error('Error initializing counting system:', error);
        }
    }

    /**
     * Handle a message in the counting channel
     * @param {Message} message - The Discord message
     * @returns {Object} - Result object with action taken
     */
    async handleCountingMessage(message) {
        // Only handle messages in the counting channel
        if (message.channel.id !== this.countingChannelId) {
            return { action: 'none' };
        }

        const content = message.content.trim();
        const userId = message.author.id;

        // Check if message is a valid number
        const number = parseInt(content);
        const isValidNumber = !isNaN(number) && number.toString() === content;

        if (!isValidNumber) {
            // Delete non-numeric messages
            try {
                await message.delete();
                return { action: 'deleted', reason: 'non-numeric' };
            } catch (error) {
                console.error('Error deleting non-numeric message:', error);
                return { action: 'error', error: error.message };
            }
        }

        // Check if it's the correct next number
        const expectedNumber = this.currentCount + 1;
        
        if (number !== expectedNumber) {
            // Wrong number - reset count and delete message
            try {
                await message.delete();
                await this.resetCount(message.channel, message.author, expectedNumber, number);
                return { action: 'reset', reason: 'wrong-number', expected: expectedNumber, actual: number };
            } catch (error) {
                console.error('Error handling wrong number:', error);
                return { action: 'error', error: error.message };
            }
        }

        // Check if same user is counting twice in a row
        if (this.lastCounter === userId) {
            try {
                await message.delete();
                await this.resetCount(message.channel, message.author, expectedNumber, number, 'same-user');
                return { action: 'reset', reason: 'same-user', expected: expectedNumber, actual: number };
            } catch (error) {
                console.error('Error handling same user counting:', error);
                return { action: 'error', error: error.message };
            }
        }

        // Valid count - update the system
        this.currentCount = number;
        this.lastCounter = userId;
        this.lastCountTime = Date.now();

        // Save to database
        try {
            await this.database.saveCountingData({
                currentCount: this.currentCount,
                lastCounter: this.lastCounter,
                lastCountTime: this.lastCountTime
            });
        } catch (error) {
            console.error('Error saving counting data:', error);
        }

        return { action: 'success', count: number };
    }

    /**
     * Reset the counting system
     * @param {TextChannel} channel - The counting channel
     * @param {User} user - The user who messed up
     * @param {number} expected - The expected number
     * @param {number} actual - The actual number provided
     * @param {string} reason - The reason for reset (optional)
     */
    async resetCount(channel, user, expected, actual, reason = 'wrong-number') {
        // Reset internal state
        this.currentCount = 0;
        this.lastCounter = null;
        this.lastCountTime = null;

        // Save reset to database
        try {
            await this.database.saveCountingData({
                currentCount: 0,
                lastCounter: null,
                lastCountTime: null
            });
        } catch (error) {
            console.error('Error saving reset counting data:', error);
        }

        // Create reset embed
        const resetEmbed = {
            color: 0xff0000,
            title: '🔢 Counting Reset!',
            description: `**${user.tag}** messed up the counting!`,
            fields: [
                {
                    name: '❌ What went wrong',
                    value: reason === 'same-user' 
                        ? 'Same user counted twice in a row!' 
                        : `Expected **${expected}**, but got **${actual}**`,
                    inline: false
                },
                {
                    name: '🔄 Count Reset',
                    value: 'The count has been reset to **0**. Next number is **1**.',
                    inline: false
                },
                {
                    name: '📋 Rules',
                    value: '• Only post the next number in sequence\n• Don\'t count twice in a row\n• Non-numeric messages are auto-deleted',
                    inline: false
                }
            ],
            footer: {
                text: 'Dark MAGA Counting Channel'
            },
            timestamp: new Date()
        };

        try {
            await channel.send({ embeds: [resetEmbed] });
        } catch (error) {
            console.error('Error sending reset message:', error);
        }
    }

    /**
     * Get current counting status
     */
    getStatus() {
        return {
            currentCount: this.currentCount,
            lastCounter: this.lastCounter,
            lastCountTime: this.lastCountTime,
            nextNumber: this.currentCount + 1
        };
    }

    /**
     * Manually reset counting (for admin use)
     * @param {TextChannel} channel - The counting channel
     * @param {User} admin - The admin who reset it
     */
    async manualReset(channel, admin) {
        // Reset internal state
        this.currentCount = 0;
        this.lastCounter = null;
        this.lastCountTime = null;

        // Save reset to database
        try {
            await this.database.saveCountingData({
                currentCount: 0,
                lastCounter: null,
                lastCountTime: null
            });
        } catch (error) {
            console.error('Error saving manual reset counting data:', error);
        }

        // Create manual reset embed
        const resetEmbed = {
            color: 0x00ff00,
            title: '🔢 Counting Manually Reset',
            description: `**${admin.tag}** manually reset the counting!`,
            fields: [
                {
                    name: '🔄 Count Reset',
                    value: 'The count has been reset to **0**. Next number is **1**.',
                    inline: false
                },
                {
                    name: '📋 Rules',
                    value: '• Only post the next number in sequence\n• Don\'t count twice in a row\n• Non-numeric messages are auto-deleted',
                    inline: false
                }
            ],
            footer: {
                text: 'Dark MAGA Counting Channel'
            },
            timestamp: new Date()
        };

        try {
            await channel.send({ embeds: [resetEmbed] });
        } catch (error) {
            console.error('Error sending manual reset message:', error);
        }
    }
}

module.exports = CountingSystem;
