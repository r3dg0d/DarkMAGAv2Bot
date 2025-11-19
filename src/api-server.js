// Bio Site API Server - Integrated with Discord Bot
// This module provides Express API endpoints for the bio site

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

class BioSiteAPI {
    constructor(bot) {
        this.bot = bot;
        this.app = express();
        this.PORT = process.env.API_PORT || process.env.PORT || 5000;
        
        // Spotify API configuration
        this.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
        this.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
        this.SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN || '';
        
        // Discord API configuration (use bot's token and user ID)
        this.DISCORD_USER_ID = process.env.DISCORD_USER_ID || '';
        
        // Spotify access token cache
        this.spotifyAccessToken = null;
        this.spotifyTokenExpiry = 0;
        
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        // Enable CORS for GitHub Pages/is-a.dev
        this.app.use(cors({
            origin: function (origin, callback) {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin) return callback(null, true);
                
                // Allow localhost, is-a.dev, github.io, and r3dg0d.net domains
                if (
                    !origin ||
                    origin.includes('localhost') ||
                    origin.includes('.is-a.dev') ||
                    origin.includes('.github.io') ||
                    origin.includes('r3dg0d.github.io') ||
                    origin.includes('r3dg0d.net')
                ) {
                    return callback(null, true);
                }
                
                callback(new Error('Not allowed by CORS'));
            },
            credentials: true
        }));
        
        // Parse JSON bodies
        this.app.use(express.json());
    }
    
    setupRoutes() {
        // Spotify API Endpoints
        this.app.get('/api/spotify/now-playing', async (req, res) => {
            try {
                const token = await this.getSpotifyAccessToken();
                const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.status === 204 || !response.data) {
                    res.json({ isPlaying: false, item: null });
                    return;
                }

                res.json({
                    isPlaying: response.data.is_playing,
                    item: response.data.item,
                    progress_ms: response.data.progress_ms,
                });
            } catch (error) {
                if (error.response?.status === 401) {
                    this.spotifyAccessToken = null; // Force token refresh
                }
                res.status(error.response?.status || 500).json({
                    error: error.response?.data?.error?.message || 'Failed to fetch currently playing track',
                });
            }
        });

        this.app.get('/api/spotify/recently-played', async (req, res) => {
            try {
                const token = await this.getSpotifyAccessToken();
                const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                res.json(response.data);
            } catch (error) {
                if (error.response?.status === 401) {
                    this.spotifyAccessToken = null; // Force token refresh
                }
                res.status(error.response?.status || 500).json({
                    error: error.response?.data?.error?.message || 'Failed to fetch recently played tracks',
                });
            }
        });

        // Discord API Endpoints - Use bot's client for real-time presence
        this.app.get('/api/discord/status', async (req, res) => {
            try {
                if (!this.DISCORD_USER_ID) {
                    res.json({ error: 'Discord user ID not configured', status: null });
                    return;
                }
                
                // PRIMARY: Use tracked presence from presenceUpdate events (most reliable!)
                if (this.bot && this.bot.userPresence && this.bot.userPresence.status) {
                    const user = await this.bot.client.users.fetch(this.DISCORD_USER_ID).catch(() => null);
                    
                    return res.json({
                        status: this.bot.userPresence.status,
                        activities: this.bot.userPresence.activities || [],
                        lastUpdate: this.bot.userPresence.lastUpdate,
                        username: user?.username || null,
                        discriminator: user?.discriminator || null,
                        source: 'bot-presence-tracker'
                    });
                }
                
                // FALLBACK: Try to get presence from the bot's cache
                if (this.bot && this.bot.client) {
                    const user = await this.bot.client.users.fetch(this.DISCORD_USER_ID).catch(() => null);
                    
                    if (user) {
                        // Check all guilds the bot is in
                        let status = 'offline';
                        let activities = [];
                        
                        for (const [guildId, guild] of this.bot.client.guilds.cache) {
                            const member = guild.members.cache.get(this.DISCORD_USER_ID);
                            if (member && member.presence) {
                                status = member.presence.status || 'offline';
                                activities = member.presence.activities || [];
                                break; // Use first found status
                            }
                        }
                        
                        return res.json({
                            status: status,
                            activities: activities,
                            username: user.username,
                            discriminator: user.discriminator,
                            source: 'bot-cache'
                        });
                    }
                }
                
                // Fallback: return offline if user not found
                res.json({
                    status: 'offline',
                    username: null,
                    source: 'fallback'
                });
            } catch (error) {
                console.error('Discord status API error:', error);
                res.json({
                    error: 'Discord status unavailable',
                    status: null,
                });
            }
        });
        
        // Endpoint to get bot token (for convenience)
        this.app.get('/api/bot/token', (req, res) => {
            // Security: Only allow from localhost or trusted sources
            const clientIp = req.ip || req.connection.remoteAddress;
            const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
            
            if (!isLocalhost && !req.headers.host?.includes('localhost')) {
                return res.status(403).json({ error: 'Access denied. This endpoint is only available locally.' });
            }
            
            const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || (this.bot?.client?.token);
            
            if (botToken) {
                res.json({
                    token: botToken,
                    note: 'Keep this token secret! Never share it publicly.'
                });
            } else {
                res.status(404).json({ error: 'Bot token not found' });
            }
        });

        // Discord Widget API endpoint (alternative method)
        this.app.get('/api/discord/widget/:serverId', async (req, res) => {
            const { serverId } = req.params;
            
            try {
                const response = await axios.get(`https://discord.com/api/guilds/${serverId}/widget.json`);
                const members = response.data.members || [];
                const user = members.find(m => m.id === this.DISCORD_USER_ID);
                
                if (user) {
                    res.json({
                        status: user.status || 'offline',
                        username: user.username,
                    });
                } else {
                    res.json({ status: 'offline', username: null });
                }
            } catch (error) {
                res.status(error.response?.status || 500).json({
                    error: 'Discord widget not available for this server',
                    status: null,
                });
            }
        });
        
        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                bot: this.bot && this.bot.client ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString()
            });
        });
    }
    
    async getSpotifyAccessToken() {
        if (this.spotifyAccessToken && Date.now() < this.spotifyTokenExpiry) {
            return this.spotifyAccessToken;
        }

        if (!this.SPOTIFY_CLIENT_ID || !this.SPOTIFY_CLIENT_SECRET || !this.SPOTIFY_REFRESH_TOKEN) {
            throw new Error('Spotify credentials not configured');
        }

        try {
            const response = await axios.post(
                'https://accounts.spotify.com/api/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.SPOTIFY_REFRESH_TOKEN,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${this.SPOTIFY_CLIENT_ID}:${this.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
                    },
                }
            );

            this.spotifyAccessToken = response.data.access_token;
            this.spotifyTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early
            return this.spotifyAccessToken;
        } catch (error) {
            console.error('Error getting Spotify access token:', error.response?.data || error.message);
            throw error;
        }
    }
    
    start() {
        // Listen on all interfaces (0.0.0.0) to allow external access
        this.app.listen(this.PORT, '0.0.0.0', () => {
            console.log(`🌐 Bio Site API Server running on port ${this.PORT}`);
            console.log(`   API endpoints available at http://0.0.0.0:${this.PORT}/api`);
            console.log(`   External access: http://4r3dg0d34.dedimc.io:${this.PORT}/api`);
            
            if (!this.SPOTIFY_CLIENT_ID || !this.SPOTIFY_CLIENT_SECRET) {
                console.warn('⚠️  Spotify credentials not configured. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN in .env');
            }
            
            if (!this.DISCORD_USER_ID) {
                console.warn('⚠️  Discord user ID not configured. Set DISCORD_USER_ID in .env for Discord status feature');
            }
        });
    }
}

module.exports = BioSiteAPI;

