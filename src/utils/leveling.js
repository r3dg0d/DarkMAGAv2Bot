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
        
        // Save updated data
        await this.db.saveUserLevel(userId, guildId, newLevel, xpGain, newTotalXp);
        
        return {
            leveledUp,
            oldLevel: userData.level,
            newLevel,
            xpGain,
            totalXp: newTotalXp,
            rankName: this.getRankName(newLevel)
        };
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
}

module.exports = LevelingSystem; 