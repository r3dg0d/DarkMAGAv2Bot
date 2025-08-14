const fs = require('fs-extra');
const path = require('path');
const { Collection } = require('discord.js');

class CommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.commands = new Collection();
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const command = require(filePath);
                if (command.data && command.execute) {
                    this.commands.set(command.data.name, command);
                } else {
                    console.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`Error loading command ${file}:`, error);
            }
        }
    }

    async handleCommand(interaction) {
        const command = this.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        // Check permissions
        if (command.permissions) {
            const hasPermission = await this.checkPermissions(interaction, command.permissions);
            if (!hasPermission) {
                await interaction.reply({ 
                    content: 'You do not have permission to use this command.', 
                    ephemeral: true 
                });
                return;
            }
        }

        // Check cooldowns
        if (command.cooldown) {
            const cooldownKey = `${interaction.user.id}-${command.data.name}`;
            const lastUsed = this.bot.cooldowns.get(cooldownKey);
            const now = Date.now();

            if (lastUsed && (now - lastUsed) < command.cooldown) {
                const remaining = Math.ceil((command.cooldown - (now - lastUsed)) / 1000);
                await interaction.reply({ 
                    content: `Please wait ${remaining} seconds before using this command again.`, 
                    ephemeral: true 
                });
                return;
            }

            this.bot.cooldowns.set(cooldownKey, now);
        }

        try {
            await command.execute(interaction, this.bot);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    async checkPermissions(interaction, requiredPermissions) {
        const { 
            hasTrialModRole, 
            hasModRole, 
            hasExecutiveModRole, 
            hasStaffRole, 
            hasFounderRole 
        } = require('../utils/permissions');

        const member = interaction.member;

        for (const permission of requiredPermissions) {
            let hasPermission = false;

            switch (permission) {
                case 'trialMod':
                    hasPermission = hasTrialModRole(member);
                    break;
                case 'mod':
                    hasPermission = hasModRole(member);
                    break;
                case 'executiveMod':
                    hasPermission = hasExecutiveModRole(member);
                    break;
                case 'staff':
                    hasPermission = hasStaffRole(member);
                    break;
                case 'founder':
                    hasPermission = hasFounderRole(member);
                    break;
            }

            if (hasPermission) return true;
        }

        return false;
    }

    getCommands() {
        return Array.from(this.commands.values()).map(command => command.data.toJSON());
    }
}

module.exports = CommandHandler; 