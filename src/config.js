module.exports = {
    // Bot Configuration
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    
    // Role IDs
    roles: {
        founder: '1375329828177444896',
        coFounder: '1377575771073417257',
        executiveMod: '1375329832413565001',
        mod: '1375522397016559636',
        trialMod: '1375522441308405891',
        minecraftStaff: '1384719232142413855',
        maga: '1375329833361342577',
        ogMembers: '1375759577987026965',
        patriotI: '1384340221461794816',
        patriotII: '1384594019304210512',
        patriotIII: '1384594130872696913',
        patriotIV: '1384594155098865754',
        patriotV: '1384594177202851890',
        patriotVI: '1384594201156653197',
        patriotVII: '1384594227371180155',
        patriotVIII: '1384594254189301830',
        patriotIX: '1384594282882666579',
        patriotX: '1384594303967559730',
        magaLegend: '1396557820576403556',
        detained: '1375329848595058688'
    },
    
    // Channel IDs
    channels: {
        modLog: process.env.MOD_LOG_CHANNEL_ID,
        ticketCategory: process.env.TICKET_CATEGORY_ID,
        welcome: '1375329869558452226', // #👋welcome
        chatReviveChannels: [
            '1385149813699379231', // #patriot-chat
            '1383231090054926467'  // #general
        ],
        jailLog: '1388349311644864622' // #jail-log
    },
    
    // API Configuration
    fluxApiKey: process.env.FLUX_API_KEY,
    fluxApiUrl: 'https://api.bfl.ai/v1',
    
    // Chat Revive Configuration
    chatRevive: {
        enabled: process.env.CHAT_REVIVE_ENABLED === 'true',
        checkInterval: 10800000, // 3 hours
        cooldown: 10800000 // 3 hours
    },
    
    // Database Configuration
    database: {
        path: './database/bot.db'
    },
    
    // File Paths
    files: {
        autoroles: './data/autoroles.json',
        reactionRoles: './data/reaction_roles.json',
        blockedUsers: './data/blocked_users.json'
    },
    
    // Chat Revive Ping Role
    chatRevivePingRole: '1375705667595403335'
}; 