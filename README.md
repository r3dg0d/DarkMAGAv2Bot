# Dark MAGA Bot - Node.js Version

A Discord bot for the Dark MAGA community, converted from Python to Node.js with full feature parity.

## Features

### General Commands
- `/ping` - Check bot latency
- `/help` - Show available commands
- `/userinfo` - Show detailed user information
- `/avatar` - Display user's avatar
- `/banner` - Display user's banner
- `/snipe` - Show last deleted message
- `/revivechat` - Send a chat revival message (2hr cooldown)
- `/imagegen` - Generate an image from a prompt
- `/editimage` - Edit an existing image with a prompt
- `/promo_check` - Check your rank and time to next level

### Staff Commands
**Executive Mod+:**
- `/ban` - Ban a user
- `/unban` - Unban a user
- `/purge` - Remove messages
- `/blockmodmail` - Block user from modmail
- `/unblockmodmail` - Unblock user from modmail
- `/blocklist` - List blocked users
- `/lockdown` - Lock down a channel
- `/unlock` - Unlock a channel
- `/chatrevive` - Configure chat revive
- `/giveroleall` - Give role to all members

**Mod+:**
- `/kick` - Kick a user
- `/detain` - Detain a user
- `/undetain` - Release a user

**Trial Mod+:**
- `/timeout` - Timeout a user
- `/warn` - Warn a user

### Founder Commands
- `/rules` - Display server rules
- `/rolelist` - List server roles
- `/autorolelist` - List autoroles
- `/autorole` - Manage autoroles
- `/welcome` - Display welcome message
- `/starthere` - Comprehensive server guide
- `/reactionroles` - Setup custom reaction roles
- `/quickroles` - Quick setup role categories
- `/createroles` - Bulk create roles

### Additional Features
- **Modmail System** - Users with MAGA role can DM the bot to create support tickets
- **Leveling System** - Users earn ranks based on message activity
- **Chat Revive** - Automatic chat revival when channels are quiet
- **Reaction Roles** - Button-based role assignment system
- **Auto Roles** - Automatic role assignment for new members
- **Image Generation** - BFL API integration for AI image generation with Flux Kontext Max

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodejsversion
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_bot_client_id
   GUILD_ID=your_guild_id
   MOD_LOG_CHANNEL_ID=your_mod_log_channel_id
   TICKET_CATEGORY_ID=your_ticket_category_id
   CHAT_REVIVE_CHANNELS=channel_id1,channel_id2,channel_id3
   CHAT_REVIVE_ENABLED=true
   FLUX_API_KEY=your_bfl_api_key
   ```

4. **Deploy slash commands**
   ```bash
   npm run deploy
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## Development

- **Development mode with auto-restart:**
  ```bash
  npm run dev
  ```

## Project Structure

```
nodejsversion/
├── src/
│   ├── commands/          # Slash command files
│   ├── events/            # Event handler files
│   ├── handlers/          # Command and event handlers
│   ├── utils/             # Utility functions
│   │   ├── database.js    # SQLite database operations
│   │   ├── fileUtils.js   # JSON file operations
│   │   ├── leveling.js    # Leveling system
│   │   └── permissions.js # Permission checks
│   ├── config.js          # Configuration
│   ├── index.js           # Main bot file
│   └── deploy-commands.js # Command deployment
├── data/                  # JSON data files
├── database/              # SQLite database files
├── package.json
└── README.md
```

## Role IDs

The bot uses the following role IDs (configured in `src/config.js`):

- **Founder:** 1375329828177444896
- **Co-Founder:** 1377575771073417257
- **Executive Mod:** 1375329832413565001
- **Mod:** 1375522397016559636
- **Trial Mod:** 1375522441308405891
- **Minecraft Staff:** 1384719232142413855
- **MAGA (Default):** 1375329833361342577
- **OG Members:** 1375759577987026965
- **Patriot I-X:** Various role IDs for the leveling system

## Database

The bot uses SQLite for data persistence:
- User levels and message counts
- Chat revive cooldowns
- Reaction role message mappings
- Ticket mappings

## Configuration

Key configuration options in `src/config.js`:
- Role IDs for permission checks
- Channel IDs for mod logs and tickets
- API keys for external services
- Chat revive settings
- File paths for data storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the Dark MAGA team or create an issue in the repository.

---

**🇺🇸 America First! 🇺🇸** 