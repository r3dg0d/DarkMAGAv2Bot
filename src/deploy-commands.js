const { REST, Routes } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    
    // Ensure commands directory exists
    await fs.ensureDir(commandsPath);
    
    const commandFiles = await fs.readdir(commandsPath);

    for (const file of commandFiles) {
        if (!file.endsWith('.js')) continue;

        try {
            const command = require(path.join(commandsPath, file));
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`Loaded command: ${command.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`Error loading command ${file}:`, error);
        }
    }

    const rest = new REST().setToken(config.token);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}

deployCommands(); 