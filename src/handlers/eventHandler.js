const fs = require('fs-extra');
const path = require('path');

class EventHandler {
    constructor(bot) {
        this.bot = bot;
        this.events = new Map();
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, '..', 'events');
        
        // Check if events directory exists
        if (!await fs.pathExists(eventsPath)) {
            return;
        }

        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            try {
                const event = require(filePath);
                this.events.set(event.name, event);
                
                if (event.once) {
                    this.bot.client.once(event.name, (...args) => event.execute(...args, this.bot));
                } else {
                    this.bot.client.on(event.name, (...args) => event.execute(...args, this.bot));
                }
            } catch (error) {
                console.error(`Error loading event ${file}:`, error);
            }
        }
    }

    getEvents() {
        return this.events;
    }
}

module.exports = EventHandler; 