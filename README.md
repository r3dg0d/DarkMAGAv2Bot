# Dark MAGA Bot - Node.js Version

A Discord bot for the Dark MAGA community, converted from Python to Node.js with full feature parity.

## Features

### Dual Bot Architecture
The bot runs two separate bots simultaneously:
1. **Main Bot** - Full-featured Discord bot with commands, modmail, leveling, etc.
2. **Auto-Poster Bot** (Optional) - AI-powered auto-posting bot for specific channels

**About the Auto-Poster:**
- Separate Python script (`selfbot.py`) that runs independently
- Uses a Discord user account token (self-bot)
- **⚠️ WARNING: Self-bots violate Discord's Terms of Service**
- May result in account ban - use at your own risk
- Posts AI-generated messages to configured channels
- Responds to mentions/replies with AI-generated responses
- Main bot runs independently - auto-poster is optional

### General Commands
- `/ping` - Check bot latency
- `/help` - Show available commands (updated with comprehensive command list)
- `/faq` - Answers FAQs about the bot's AI features, payment, pricing, and functionality
- `/userinfo` - Show detailed user information
- `/avatar` - Display user's avatar
- `/banner` - Display user's banner
- `/snipe` - Show last deleted message
- `/revivechat` - Send a chat revival message (2hr cooldown)
- `/imagegen` - Generate an image from a prompt
- `/editimage` - Edit an existing image with a prompt
- `/promo_check` - Check your rank and time to next level
- `/demostatus` - Check your demo usage and premium status

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
- `/chatrevive` - Configure chat revive system
- `/chatrevivestatus` - Check chat revive system status
- `/testchatrevive` - Test the chat revive system

**Mod+:**
- `/kick` - Kick a user
- `/detain` - Detain a user
- `/undetain` - Release a user
- `/panel` - Create a support panel with ticket buttons (NEW)
- `/jailpanel` - Create a jail appeal panel
- `/verifypanel` - Create a verification panel with ticket button

**Trial Mod+:**
- `/timeout` - Timeout a user
- `/warn` - Warn a user
- `/verify` - Verify a user

### Founder Commands
- `/rules` - Display server rules
- `/rolelist` - List server roles
- `/autorolelist` - List autoroles
- `/autorole` - Manage autoroles
- `/serverad` - Display server advertisement
- `/starthere` - Comprehensive server guide
- `/reactionroles` - Setup custom reaction roles
- `/quickroles` - Quick setup role categories
- `/createroles` - Bulk create roles
- `/syncroles` - Sync leveling roles for all users
- `/managepayments` - Manage AI feature payments
- `/ticketlist` - List all current open tickets

### Additional Features
- **Modmail System** - Users with MAGA role can DM the bot to create support tickets
  - Support panel with interactive buttons (`/panel`)
  - Jail appeal panel (`/jailpanel`)
  - Verification panel (`/verifypanel`)
  - Ticket management commands for staff
- **Leveling System** - Users earn ranks based on message activity
  - `/rank` - Check rank and XP progress
  - `/leaderboard` - View server leaderboard
- **Chat Revive** - Automatic chat revival when channels are quiet
  - Configurable channels and settings
  - Status monitoring and testing commands
- **Reaction Roles** - Button-based role assignment system
- **Auto Roles** - Automatic role assignment for new members
- **AI Features**:
  - **Image Generation** - BFL API integration for AI image generation with Flux Kontext Max
  - **AI Chat** - Multiple AI personalities (Elon, Joe Rogan, JD Vance, Sam Altman, RFK Jr, Nick Fuentes, E-Girl, JFK, Trump)
  - **Voice Generation** - Text-to-speech with lip sync video generation
  - **Uncensored AI** - Uncensored AI responses for premium users
- **Premium System** - One-time $25 payment or server boost for premium access
  - Free tier: 3 free AI chat prompts
  - Premium: Unlimited AI features

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/r3dg0d/DarkMAGAv2Bot.git
   cd DarkMAGAv2Bot
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
   XAI_API_KEY=
   FISHAUDIO_API=
   UNCENSORED_API_KEY=your_uncensored_api_key
   
   # Auto-Poster (Optional - user account token for Python selfbot)
   # ⚠️ WARNING: Self-bots violate Discord ToS - use at your own risk
   # Get token from browser DevTools > Application > Local Storage > token
   SELF_BOT_TOKEN=your_discord_user_token
   ```

4. **Deploy slash commands**
   ```bash
   npm run deploy
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

6. **Start the Auto-Poster** (optional, separate Python process)
   ```bash
   python3 selfbot.py
   ```
   
   **Note:** The auto-poster requires:
   - Python 3.8+
   - Install Python dependencies: `pip install discord.py-self requests python-dotenv`
   - Requires a Discord user token (self-bot - violates Discord ToS)
   - ⚠️ Use at your own risk - may result in account ban

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
│   ├── selfBot.js         # Self-bot for auto-posting
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