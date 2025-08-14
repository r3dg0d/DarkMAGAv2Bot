const fs = require('fs-extra');
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '..', '..', 'database');
        this.levelsPath = path.join(this.dbPath, 'levels.json');
        this.ticketsPath = path.join(this.dbPath, 'tickets.json');
        this.chatRevivePath = path.join(this.dbPath, 'chat_revive.json');
        this.detainedRolesPath = path.join(this.dbPath, 'detained_roles.json');
        this.reactionRolesPath = path.join(this.dbPath, 'reaction_roles.json');
        this.ensureDatabase();
    }

    async ensureDatabase() {
        await fs.ensureDir(this.dbPath);
        
        if (!await fs.pathExists(this.levelsPath)) {
            await fs.writeJson(this.levelsPath, {});
        }
        
        if (!await fs.pathExists(this.ticketsPath)) {
            await fs.writeJson(this.ticketsPath, {});
        }

        if (!await fs.pathExists(this.chatRevivePath)) {
            await fs.writeJson(this.chatRevivePath, {
                enabled: false,
                channels: [],
                lastMessage: {}
            });
        }

        if (!await fs.pathExists(this.detainedRolesPath)) {
            await fs.writeJson(this.detainedRolesPath, {});
        }

        if (!await fs.pathExists(this.reactionRolesPath)) {
            await fs.writeJson(this.reactionRolesPath, {});
        }
    }

    async getUserLevel(userId, guildId) {
        try {
            const data = await fs.readJson(this.levelsPath);
            const userKey = `${guildId}-${userId}`;
            return data[userKey] || { 
                level: 1, 
                xp: 0, 
                totalXp: 0, 
                message_count: 0, 
                first_message_date: new Date().toISOString() 
            };
        } catch (error) {
            console.error('Error reading user level:', error);
            return { 
                level: 1, 
                xp: 0, 
                totalXp: 0, 
                message_count: 0, 
                first_message_date: new Date().toISOString() 
            };
        }
    }

    async saveUserLevel(userId, guildId, level, xp, totalXp, messageCount = null, firstMessageDate = null) {
        try {
            const data = await fs.readJson(this.levelsPath);
            const userKey = `${guildId}-${userId}`;
            
            // Get existing data or create new
            const existingData = data[userKey] || { 
                level: 1, 
                xp: 0, 
                totalXp: 0, 
                message_count: 0, 
                first_message_date: new Date().toISOString() 
            };
            
            // Update with new values
            data[userKey] = { 
                level, 
                xp, 
                totalXp,
                message_count: messageCount !== null ? messageCount : existingData.message_count,
                first_message_date: firstMessageDate !== null ? firstMessageDate : existingData.first_message_date
            };
            
            await fs.writeJson(this.levelsPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error saving user level:', error);
        }
    }

    async saveTicketMapping(channelId, userId) {
        try {
            const data = await fs.readJson(this.ticketsPath);
            data[channelId] = userId;
            await fs.writeJson(this.ticketsPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error saving ticket mapping:', error);
        }
    }

    async getTicketUser(channelId) {
        try {
            const data = await fs.readJson(this.ticketsPath);
            return data[channelId] || null;
        } catch (error) {
            console.error('Error reading ticket mapping:', error);
            return null;
        }
    }

    async removeTicketMapping(channelId) {
        try {
            const data = await fs.readJson(this.ticketsPath);
            delete data[channelId];
            await fs.writeJson(this.ticketsPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error removing ticket mapping:', error);
        }
    }

    async getChatReviveSettings() {
        try {
            return await fs.readJson(this.chatRevivePath);
        } catch (error) {
            console.error('Error reading chat revive settings:', error);
            return { enabled: false, channels: [], lastMessage: {} };
        }
    }

    async saveChatReviveSettings(settings) {
        try {
            await fs.writeJson(this.chatRevivePath, settings, { spaces: 2 });
        } catch (error) {
            console.error('Error saving chat revive settings:', error);
        }
    }

    async saveDetainedUserRoles(userId, guildId, roleIds) {
        try {
            const data = await fs.readJson(this.detainedRolesPath);
            const userKey = `${guildId}-${userId}`;
            data[userKey] = {
                roleIds: roleIds,
                detainedAt: new Date().toISOString()
            };
            await fs.writeJson(this.detainedRolesPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error saving detained user roles:', error);
        }
    }

    async getDetainedUserRoles(userId, guildId) {
        try {
            const data = await fs.readJson(this.detainedRolesPath);
            const userKey = `${guildId}-${userId}`;
            return data[userKey] || null;
        } catch (error) {
            console.error('Error reading detained user roles:', error);
            return null;
        }
    }

    async removeDetainedUserRoles(userId, guildId) {
        try {
            const data = await fs.readJson(this.detainedRolesPath);
            const userKey = `${guildId}-${userId}`;
            delete data[userKey];
            await fs.writeJson(this.detainedRolesPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error removing detained user roles:', error);
        }
    }

    async getTicketMapping(userId) {
        try {
            const data = await fs.readJson(this.ticketsPath);
            for (const [channelId, uid] of Object.entries(data)) {
                if (uid === userId) {
                    return { ticket_channel_id: channelId, user_id: uid };
                }
            }
            return null;
        } catch (error) {
            console.error('Error reading ticket mapping:', error);
            return null;
        }
    }

    async saveReactionRoleMessage(guildId, channelId, messageId, rolesData, permanent, maxRoles) {
        try {
            const data = await fs.readJson(this.reactionRolesPath);
            const messageKey = `${guildId}-${messageId}`;
            data[messageKey] = {
                guildId: guildId,
                channelId: channelId,
                messageId: messageId,
                roles: rolesData,
                permanent: permanent,
                maxRoles: maxRoles,
                createdAt: new Date().toISOString()
            };
            await fs.writeJson(this.reactionRolesPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error saving reaction role message:', error);
        }
    }

    async getReactionRoleMessage(guildId, messageId) {
        try {
            const data = await fs.readJson(this.reactionRolesPath);
            const messageKey = `${guildId}-${messageId}`;
            return data[messageKey] || null;
        } catch (error) {
            console.error('Error reading reaction role message:', error);
            return null;
        }
    }

    async removeReactionRoleMessage(guildId, messageId) {
        try {
            const data = await fs.readJson(this.reactionRolesPath);
            const messageKey = `${guildId}-${messageId}`;
            delete data[messageKey];
            await fs.writeJson(this.reactionRolesPath, data, { spaces: 2 });
        } catch (error) {
            console.error('Error removing reaction role message:', error);
        }
    }
}

module.exports = Database; 