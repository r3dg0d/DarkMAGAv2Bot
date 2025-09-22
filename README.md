# Dark MAGA Bot - Node.js Version

A Discord bot for the Dark MAGA community, converted from Python to Node.js with full feature parity and advanced AI capabilities.

## Features

### General Commands
- `/ping` - Check bot latency
- `/help` - Show available commands
- `/userinfo` - Show detailed user information
- `/avatar` - Display user's avatar
- `/banner` - Display user's banner
- `/snipe` - Show last deleted message
- `/revivechat` - Send a chat revival message (2hr cooldown)
- `/promo_check` - Check your rank and time to next level

### AI & Fun Commands 🤖
**Character AI Chat:**
- `/askelon` - Chat with Elon Musk AI (powered by xAI's Grok 4 API)
- `/askjoerogan` - Chat with Joe Rogan AI (powered by xAI's Grok 4 API)
- `/askjdvance` - Chat with JD Vance AI (powered by xAI's Grok 4 API)
- `/asksamaltman` - Chat with Sam Altman AI (powered by xAI's Grok 4 API)
- `/askrfkjr` - Chat with Robert F. Kennedy Jr. AI (powered by xAI's Grok 4 API)
- `/asknjf` - Chat with Nick Fuentes AI (powered by xAI's Grok 4 API)
- `/askegirl` - Chat with E-Girl AI (powered by xAI's Grok 4 API)
- `/trumpspeak` - Chat with Donald Trump AI (powered by xAI's Grok 4 API)
- `/uncensoredlm` - Chat with an uncensored AI language model

**Character Voice Generation:**
- `/elonsay` - Generate Elon Musk's voice saying any text (with AI lipsync video)
- `/joerogansay` - Generate Joe Rogan's voice saying any text (with AI lipsync video)
- `/jdvancesay` - Generate JD Vance's voice saying any text (with AI lipsync video)
- `/samaltmansay` - Generate Sam Altman's voice saying any text (with AI lipsync video)
- `/rfkjrsay` - Generate Robert F. Kennedy Jr.'s voice saying any text (with AI lipsync video)
- `/njfsay` - Generate Nick Fuentes' voice saying any text (with AI lipsync video)
- `/egirlsay` - Generate E-Girl's voice saying any text (with AI lipsync video)
- `/trumpsay` - Generate Donald Trump's voice saying any text (with AI lipsync video)

**AI Image Generation:**
- `/imagegen` - Generate images from text prompts using Flux Kontext Max
- `/editimage` - Edit existing images with AI using Flux Kontext Max

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
- `/massdeport` - Mass remove users from server

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
- `/assignpatriot` - Assign patriot roles to users
- `/syncroles` - Sync roles between channels
- `/setchannelperms` - Set channel permissions

### Additional Features
- **Modmail System** - Users with MAGA role can DM the bot to create support tickets
- **Leveling System** - Users earn ranks based on message activity with leaderboards
- **Chat Revive** - Automatic chat revival when channels are quiet
- **Reaction Roles** - Button-based role assignment system
- **Auto Roles** - Automatic role assignment for new members
- **Counting System** - Community counting game with leaderboards
- **Ticket System** - Support ticket management with buttons
- **Voice Models** - Fish Audio TTS integration for realistic voice generation
- **Lipsync Videos** - AI-generated lipsync videos using fal.ai veed/fabric-1.0 model
- **Image Generation** - BFL API integration for AI image generation with Flux Kontext Max

## API Keys Required

The bot requires several API keys for full functionality:

### Required for AI Features:
- **`XAI_API_KEY`** - xAI API key for Grok 4 AI chat responses (all `/ask*` commands)
  - Get your API key at: [https://console.x.ai/](https://console.x.ai/)
- **`FISHAUDIO_API`** - Fish Audio API key for text-to-speech voice generation (all `/*say` commands)
  - Get your API key at: [https://fish.audio/](https://fish.audio/)
- **`FAL_KEY`** - fal.ai API key for AI lipsync video generation (all `/*say` commands)
  - Get your API key at: [https://fal.ai/](https://fal.ai/)
- **`UNCENSOREDLM_API`** - API key for uncensored language model responses (`/uncensoredlm` command)
  - Get your API key at: [https://uncensored.ai/](https://uncensored.ai/)

### Required for Image Generation:
- **`FLUX_API_KEY`** - BFL API key for AI image generation (`/imagegen` and `/editimage` commands)
  - Get your API key at: [https://www.bfl.ml/](https://www.bfl.ml/)

### Optional (Bot works without these):
- **`CHAT_REVIVE_CHANNELS`** - Comma-separated channel IDs for chat revive system
- **`CHAT_REVIVE_ENABLED`** - Set to `true` to enable automatic chat revival

## Quick Setup Guide

1. **Create Discord Application:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application → Bot → Copy token
   - Enable "Message Content Intent" and "Server Members Intent"

2. **Get API Keys:**
   - **xAI**: [console.x.ai](https://console.x.ai/) → Create API key
   - **Fish Audio**: [fish.audio](https://fish.audio/) → Sign up → Get API key
   - **fal.ai**: [fal.ai](https://fal.ai/) → Sign up → Get API key
   - **Uncensored AI**: [uncensored.ai](https://uncensored.ai/) → Sign up → Get API key
   - **BFL**: [bfl.ml](https://www.bfl.ml/) → Sign up → Get API key

3. **Create `.env` file:**
   - Copy the environment variables template from the Installation section
   - Fill in your actual API keys and Discord bot credentials

4. **Deploy and Run:**
   - Run `npm run deploy` to register slash commands
   - Run `npm start` to start the bot

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
   # ===========================================
   # DISCORD BOT CONFIGURATION
   # ===========================================
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_bot_client_id_here
   GUILD_ID=your_guild_id_here
   
   # ===========================================
   # CHANNEL CONFIGURATION
   # ===========================================
   MOD_LOG_CHANNEL_ID=your_mod_log_channel_id_here
   TICKET_CATEGORY_ID=your_ticket_category_id_here
   
   # ===========================================
   # CHAT REVIVE SYSTEM (Optional)
   # ===========================================
   CHAT_REVIVE_CHANNELS=channel_id1,channel_id2,channel_id3
   CHAT_REVIVE_ENABLED=true
   
   # ===========================================
   # AI & VOICE GENERATION APIs
   # ===========================================
   # xAI API key for Grok 4 AI chat responses (all /ask* commands)
   # Get your API key at: https://console.x.ai/
   XAI_API_KEY=your_xai_api_key_here
   
   # Fish Audio API key for text-to-speech voice generation (all /*say commands)
   # Get your API key at: https://fish.audio/
   FISHAUDIO_API=your_fish_audio_api_key_here
   
   # fal.ai API key for AI lipsync video generation (all /*say commands)
   # Get your API key at: https://fal.ai/
   FAL_KEY=your_fal_ai_api_key_here
   
   # Uncensored AI API key for uncensored language model responses (/uncensoredlm command)
   # Get your API key at: https://uncensored.ai/
   UNCENSOREDLM_API=your_uncensored_lm_api_key_here
   
   # ===========================================
   # IMAGE GENERATION API
   # ===========================================
   # BFL API key for AI image generation (/imagegen and /editimage commands)
   # Get your API key at: https://www.bfl.ml/
   FLUX_API_KEY=your_bfl_api_key_here
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
DarkMAGAv2Bot/
├── src/
│   ├── commands/          # Slash command files
│   │   ├── ask*.js        # AI chat commands (askelon, askjoerogan, etc.)
│   │   ├── *say.js        # Voice generation commands (elonsay, joerogansay, etc.)
│   │   ├── staff/         # Staff-only commands
│   │   └── general/       # General user commands
│   ├── events/            # Event handler files
│   ├── handlers/          # Command and event handlers
│   ├── utils/             # Utility functions
│   │   ├── database.js    # SQLite database operations
│   │   ├── fileUtils.js   # JSON file operations
│   │   ├── leveling.js    # Leveling system
│   │   ├── permissions.js # Permission checks
│   │   └── counting.js    # Counting system utilities
│   ├── config.js          # Configuration
│   ├── index.js           # Main bot file
│   └── deploy-commands.js # Command deployment
├── data/                  # JSON data files
│   ├── autoroles.json
│   ├── blocked_users.json
│   └── reaction_roles.json
├── database/              # SQLite database files
│   ├── bot.db
│   ├── chat_revive.json
│   ├── counting.json
│   ├── detained_roles.json
│   ├── levels.json
│   ├── reaction_roles.json
│   └── tickets.json
├── package.json
├── .env                   # Environment variables (create from .env.example)
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