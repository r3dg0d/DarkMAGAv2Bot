const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands'),
    
    async execute(interaction, bot) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🇺🇸 Dark MAGA Bot Commands')
            .setDescription('Here are all the available commands:')
            .addFields(
                {
                    name: '🔧 General Commands',
                    value: '`/ping` - Check bot latency\n`/help` - Show this help message\n`/userinfo` - Show detailed user information\n`/avatar` - Display user\'s avatar\n`/banner` - Display user\'s banner\n`/snipe` - Show last deleted message\n`/revivechat` - Send a chat revival message (2hr cooldown)\n`/imagegen` - Generate an image from a prompt\n`/editimage` - Edit an existing image with a prompt',
                    inline: false
                },
                {
                    name: 'AI & Fun 🤖',
                    value: '`/listvoicemodels` - List Fish Audio voice models (IDs and titles)\n`/trumpspeak` - Trump-style text response\n`/trumpspeakv2` - Trump-style text + voice follow-up\n`/elonspeak` - Elon Musk-style response\n`/kirkspeak` - Charlie Kirk-style response\n`/njfspeak` - America First pundit-style response',
                    inline: false
                },
                {
                    name: '📊 Leveling System',
                    value: '`/rank [user]` - Check your or someone\'s rank and XP progress\n`/leaderboard [limit]` - Show server leaderboard (top patriots by XP)',
                    inline: false
                },
                {
                    name: '🛡️ Staff Commands',
                    value: '**Executive Mod+:** `/ban` `/unban` `/purge` `/blockmodmail` `/unblockmodmail` `/blocklist` `/lockdown` `/unlock`\n**Mod+:** `/kick` `/detain` `/undetain`\n**Trial Mod+:** `/timeout` `/warn`\n**Staff:** `/addticketbuttons` - Add close/archive buttons to tickets',
                    inline: false
                },
                {
                    name: '🔄 Chat Revive Management (Executive Mod+)',
                    value: '`/chatrevive` - Configure chat revive system (enable/disable, set channels)\n`/chatrevivestatus` - Check system status and channel activity\n`/testchatrevive` - Test the chat revive system',
                    inline: false
                },
                {
                    name: '🎫 Modmail System',
                    value: '**Users:** Send a DM to the bot to create a support ticket\n**Staff:** Use close/archive buttons in ticket channels or `/addticketbuttons` to add them\n**Management:** `/blockmodmail` `/unblockmodmail` `/blocklist` - Manage user access\n**Staff:** `/ticketlist` - List all current open tickets',
                    inline: false
                },
                {
                    name: '👑 Founder Commands',
                    value: '`/rules` - Display server rules\n`/rolelist` - List server roles\n`/autorolelist` - List autoroles\n`/autorole` - Manage autoroles\n`/serverad` - Display server advertisement\n`/starthere` - Comprehensive server guide\n`/reactionroles` - Setup custom reaction roles\n`/quickroles` - Quick setup role categories\n`/createroles` - Bulk create roles\n`/syncroles` - Sync leveling roles for all users',
                    inline: false
                }
            )
            .setFooter({ text: 'Dark MAGA Bot - America First!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 