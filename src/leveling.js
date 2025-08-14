const moment = require('moment');

class LevelingSystem {
    constructor(database) {
        this.db = database;
        this.cooldowns = new Map(); // Message cooldown to prevent spam
    }

    // Calculate level based on total XP
    calculateLevel(totalXp) {
        // Level formula: level = floor(sqrt(totalXp / 100))
        // This means: Level 1 = 100 XP, Level 2 = 400 XP, Level 3 = 900 XP, etc.
        return Math.floor(Math.sqrt(totalXp / 100)) + 1;
    }

    // Calculate XP needed for a specific level
    xpForLevel(level) {
        return Math.pow(level - 1, 2) * 100;
    }

    // Calculate XP needed for next level
    xpForNextLevel(level) {
        return this.xpForLevel(level + 1);
    }

    // Calculate current level progress
    getLevelProgress(totalXp, level) {
        const currentLevelXp = this.xpForLevel(level);
        const nextLevelXp = this.xpForLevel(level + 1);
        const progressXp = totalXp - currentLevelXp;
        const neededXp = nextLevelXp - currentLevelXp;
        
        return {
            current: progressXp,
            needed: neededXp,
            percentage: Math.round((progressXp / neededXp) * 100)
        };
    }

    getRankName(level) {
        if (level >= 1 && level <= 9) return "Patriot I";
        if (level >= 10 && level <= 19) return "Patriot II";
        if (level >= 20 && level <= 29) return "Patriot III";
        if (level >= 30 && level <= 39) return "Patriot IV";
        if (level >= 40 && level <= 49) return "Patriot V";
        if (level >= 50 && level <= 59) return "Patriot VI";
        if (level >= 60 && level <= 69) return "Patriot VII";
        if (level >= 70 && level <= 79) return "Patriot VIII";
        if (level >= 80 && level <= 89) return "Patriot IX";
        if (level >= 90 && level <= 100) return "Patriot X";
        if (level > 100) return "MAGA Legend";
        return "Patriot I";
    }

    getRankRoleId(level) {
        if (level >= 1 && level <= 9) return "patriotI";
        if (level >= 10 && level <= 19) return "patriotII";
        if (level >= 20 && level <= 29) return "patriotIII";
        if (level >= 30 && level <= 39) return "patriotIV";
        if (level >= 40 && level <= 49) return "patriotV";
        if (level >= 50 && level <= 59) return "patriotVI";
        if (level >= 60 && level <= 69) return "patriotVII";
        if (level >= 70 && level <= 79) return "patriotVIII";
        if (level >= 80 && level <= 89) return "patriotIX";
        if (level >= 90 && level <= 100) return "patriotX";
        if (level > 100) return "magaLegend";
        return null;
    }

    async getUserLevel(userId, guildId) {
        return await this.db.getUserLevel(userId, guildId);
    }

    async updateUserLevel(userId, guildId) {
        // Check cooldown to prevent XP farming
        const cooldownKey = `${guildId}-${userId}`;
        const now = Date.now();
        const cooldownTime = 60000; // 1 minute cooldown
        
        if (this.cooldowns.has(cooldownKey)) {
            const lastMessage = this.cooldowns.get(cooldownKey);
            if (now - lastMessage < cooldownTime) {
                return null; // User is on cooldown
            }
        }
        
        this.cooldowns.set(cooldownKey, now);
        
        // Get current user data
        const userData = await this.db.getUserLevel(userId, guildId);
        
        // Calculate XP gain (random between 15-25)
        const xpGain = Math.floor(Math.random() * 11) + 15;
        
        let newTotalXp = userData.totalXp + xpGain;
        let newLevel = this.calculateLevel(newTotalXp);
        let leveledUp = newLevel > userData.level;
        
        // Update message count and first message date
        const newMessageCount = userData.message_count + 1;
        const firstMessageDate = userData.first_message_date || new Date().toISOString();
        
        // Save updated data
        await this.db.saveUserLevel(userId, guildId, newLevel, xpGain, newTotalXp, newMessageCount, firstMessageDate);
        
        return {
            leveledUp,
            oldLevel: userData.level,
            newLevel,
            xpGain,
            totalXp: newTotalXp,
            rankName: this.getRankName(newLevel)
        };
    }

    // Update user roles based on their level
    async updateUserRoles(userId, guildId, level, guild) {
        try {
            const config = require('../config');
            const member = await guild.members.fetch(userId);
            
            if (!member) {
                return false;
            }

            const expectedRoleId = this.getRankRoleId(level);
            
            // Get all Patriot role IDs
            const patriotRoles = {
                patriotI: config.roles.patriotI,
                patriotII: config.roles.patriotII,
                patriotIII: config.roles.patriotIII,
                patriotIV: config.roles.patriotIV,
                patriotV: config.roles.patriotV,
                patriotVI: config.roles.patriotVI,
                patriotVII: config.roles.patriotVII,
                patriotVIII: config.roles.patriotVIII,
                patriotIX: config.roles.patriotIX,
                patriotX: config.roles.patriotX
            };

            // Get MAGA Legend role ID
            const magaLegendRoleId = config.roles.magaLegend;

            if (!expectedRoleId) {
                // User is level 0 or invalid, remove all patriot and maga legend roles
                const allRoleIds = [...Object.values(patriotRoles), magaLegendRoleId];
                for (const roleId of allRoleIds) {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                    }
                }
                return true;
            }

            // Get the expected role
            let expectedRole;
            let actualRoleId;
            
            if (expectedRoleId === "magaLegend") {
                expectedRole = guild.roles.cache.get(magaLegendRoleId);
                actualRoleId = magaLegendRoleId;
            } else {
                expectedRole = guild.roles.cache.get(patriotRoles[expectedRoleId]);
                actualRoleId = patriotRoles[expectedRoleId];
            }
            
            if (!expectedRole) {
                return false;
            }

            // Remove all other patriot roles and MAGA Legend role
            const allRoleIds = [...Object.values(patriotRoles), magaLegendRoleId];
            for (const roleId of allRoleIds) {
                if (roleId !== actualRoleId && member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId);
                }
            }
            
            // Add expected role if not already present
            if (!member.roles.cache.has(actualRoleId)) {
                await member.roles.add(actualRoleId);
            }

            return true;
        } catch (error) {
            console.error('Error updating user roles:', error);
            return false;
        }
    }

    // Get leaderboard data
    async getLeaderboard(guildId, limit = 10) {
        try {
            const fs = require('fs-extra');
            const path = require('path');
            const levelsPath = path.join(__dirname, '..', '..', 'database', 'levels.json');
            
            if (!await fs.pathExists(levelsPath)) {
                return [];
            }
            
            const userData = await fs.readJson(levelsPath);
            
            // Filter for this guild and sort by totalXp
            const guildUsers = Object.entries(userData)
                .filter(([key]) => key.startsWith(`${guildId}-`))
                .map(([key, data]) => ({
                    userId: key.split('-')[1],
                    ...data
                }))
                .sort((a, b) => b.totalXp - a.totalXp)
                .slice(0, limit);
                
            return guildUsers;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Get all users with level data for a guild
    async getAllUsersWithLevels(guildId) {
        try {
            const fs = require('fs-extra');
            const path = require('path');
            const levelsPath = path.join(__dirname, '..', '..', 'database', 'levels.json');
            
            if (!await fs.pathExists(levelsPath)) {
                return [];
            }
            
            const userData = await fs.readJson(levelsPath);
            
            // Filter for this guild and return all users
            const guildUsers = Object.entries(userData)
                .filter(([key]) => key.startsWith(`${guildId}-`))
                .map(([key, data]) => ({
                    userId: key.split('-')[1],
                    ...data
                }));
                
            return guildUsers;
        } catch (error) {
            console.error('Error getting all users with levels:', error);
            return [];
        }
    }

    // Calculate messages needed for next level
    messagesForLevel(level) {
        // This is a rough estimate based on XP requirements
        // Each level requires more XP, so we estimate messages needed
        const xpNeeded = this.xpForLevel(level);
        const avgXpPerMessage = 20; // Average XP per message
        return Math.ceil(xpNeeded / avgXpPerMessage);
    }

    // Estimate time to next level based on current activity
    estimateTimeToNextLevel(messageCount, level, firstMessageDate) {
        if (!firstMessageDate || messageCount === 0) {
            return null;
        }

        const now = new Date();
        const firstMessage = new Date(firstMessageDate);
        const timeDiff = now - firstMessage;
        const minutesSinceFirst = timeDiff / (1000 * 60);
        
        if (minutesSinceFirst === 0) {
            return null;
        }

        const messagesPerMinute = messageCount / minutesSinceFirst;
        const messagesForNextLevel = this.messagesForLevel(level + 1);
        const messagesNeeded = messagesForNextLevel - messageCount;
        
        if (messagesNeeded <= 0 || messagesPerMinute <= 0) {
            return null;
        }

        return Math.ceil(messagesNeeded / messagesPerMinute);
    }
}

module.exports = LevelingSystem; 