const fs = require('fs-extra');
const path = require('path');

class FileUtils {
    constructor() {
        this.dataPath = path.join(__dirname, '..', '..', 'data');
        this.autorolesPath = path.join(this.dataPath, 'autoroles.json');
        this.reactionRolesPath = path.join(this.dataPath, 'reaction_roles.json');
        this.blockedUsersPath = path.join(this.dataPath, 'blocked_users.json');
    }

    async ensureDataDirectory() {
        await fs.ensureDir(this.dataPath);
    }

    async copyExistingData() {
        await this.ensureDataDirectory();

        const rootPath = path.join(__dirname, '..', '..', '..');
        
        // Copy autoroles.json
        const rootAutorolesPath = path.join(rootPath, 'autoroles.json');
        if (await fs.pathExists(rootAutorolesPath)) {
            await fs.copy(rootAutorolesPath, this.autorolesPath);
        } else {
            await this.saveAutoroles([]);
        }

        // Copy reaction_roles.json
        const rootReactionRolesPath = path.join(rootPath, 'reaction_roles.json');
        if (await fs.pathExists(rootReactionRolesPath)) {
            await fs.copy(rootReactionRolesPath, this.reactionRolesPath);
        } else {
            await this.saveReactionRoles({});
        }

        // Initialize blocked users if it doesn't exist
        if (!await fs.pathExists(this.blockedUsersPath)) {
            await this.saveBlockedUsers([]);
        }
    }

    async loadAutoroles() {
        try {
            await this.ensureDataDirectory();
            
            if (!await fs.pathExists(this.autorolesPath)) {
                return [];
            }
            
            const data = await fs.readJson(this.autorolesPath);
            
            if (Array.isArray(data)) {
                return data;
            } else if (data && typeof data === 'object' && data.autoroles) {
                return data.autoroles;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error loading autoroles:', error);
            return [];
        }
    }

    async saveAutoroles(autoroles) {
        try {
            await this.ensureDataDirectory();
            await fs.writeJson(this.autorolesPath, autoroles, { spaces: 2 });
        } catch (error) {
            console.error('Error saving autoroles:', error);
        }
    }

    async loadReactionRoles() {
        try {
            await this.ensureDataDirectory();
            
            if (!await fs.pathExists(this.reactionRolesPath)) {
                return {};
            }
            
            return await fs.readJson(this.reactionRolesPath);
        } catch (error) {
            console.error('Error loading reaction roles:', error);
            return {};
        }
    }

    async saveReactionRoles(reactionRoles) {
        try {
            await this.ensureDataDirectory();
            await fs.writeJson(this.reactionRolesPath, reactionRoles, { spaces: 2 });
        } catch (error) {
            console.error('Error saving reaction roles:', error);
        }
    }

    async loadBlockedUsers() {
        try {
            await this.ensureDataDirectory();
            
            if (!await fs.pathExists(this.blockedUsersPath)) {
                return [];
            }
            
            return await fs.readJson(this.blockedUsersPath);
        } catch (error) {
            console.error('Error loading blocked users:', error);
            return [];
        }
    }

    async saveBlockedUsers(blockedUsers) {
        try {
            await this.ensureDataDirectory();
            await fs.writeJson(this.blockedUsersPath, blockedUsers, { spaces: 2 });
        } catch (error) {
            console.error('Error saving blocked users:', error);
        }
    }
}

module.exports = FileUtils; 