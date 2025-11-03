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
                    value: '`/ping` - Check bot latency\n`/help` - Show this help message\n`/userinfo` - Show detailed user information\n`/avatar` - Display user\'s avatar\n`/banner` - Display user\'s banner\n`/snipe` - Show last deleted message\n`/revivechat` - Send a chat revival message (2hr cooldown)\n`/demostatus` - Check your demo usage and premium status',
                    inline: false
                },
                {
                    name: '🤖 AI Chat Commands',
                    value: '`/askelon` - Chat with Elon Musk AI\n`/askjoerogan` - Chat with Joe Rogan AI\n`/askjdvance` - Chat with JD Vance AI\n`/asksamaltman` - Chat with Sam Altman AI\n`/askrfkjr` - Chat with RFK Jr AI\n`/asknjf` - Chat with Nick Fuentes AI\n`/askegirl` - Chat with E-Girl AI\n`/askjfk` - Chat with JFK AI\n`/trumpspeak` - Chat with Trump AI\n`/uncensoredlm` - Uncensored AI responses',
                    inline: false
                },
                {
                    name: '🎤 Voice Generation Commands',
                    value: '`/elonsay` - Elon\'s voice + lipsync video\n`/joerogansay` - Joe Rogan\'s voice + lipsync\n`/jdvancesay` - JD Vance\'s voice + lipsync\n`/samaltmansay` - Sam Altman\'s voice + lipsync\n`/rfkjrsay` - RFK Jr\'s voice + lipsync\n`/njfsay` - Nick Fuentes\' voice + lipsync\n`/egirlsay` - E-Girl\'s voice + lipsync\n`/jfksay` - JFK\'s voice + lipsync\n`/trumpsay` - Trump\'s voice + lipsync',
                    inline: false
                },
                {
                    name: '🎨 AI Image Commands',
                    value: '`/imagegen` - Generate images from text prompts\n`/editimage` - Edit existing images with AI\n`/listvoicemodels` - List Fish Audio voice models',
                    inline: false
                },
                {
                    name: '💎 Premium Access & Payment',
                    value: '**🎯 Free Tier:** Everyone gets **3 FREE prompts** for AI chat commands!\n**🚀 Premium Access:** Server boost **OR** $25 one-time payment\n**✅ Premium Includes:**\n• Unlimited AI chat commands\n• All voice generation commands\n• AI image generation\n• Uncensored AI responses\n\n**Commands:**\n`/demostatus` - Check your usage and premium status\n`/payforai` - Upgrade to premium ($25 one-time)\n`/paymentstatus` - Check your payment status\n\n**Future Features:** Uncensored AI Images, Text-to-Video, Real-time Voice Chat',
                    inline: false
                },
                {
                    name: '📊 Leveling System',
                    value: '`/rank [user]` - Check your or someone\'s rank and XP progress\n`/leaderboard [limit]` - Show server leaderboard (top patriots by XP)',
                    inline: false
                },
                {
                    name: '🛡️ Staff Commands',
                    value: '**Executive Mod+:** `/ban` `/unban` `/purge` `/blockmodmail` `/unblockmodmail` `/blocklist` `/lockdown` `/unlock`\n**Mod+:** `/kick` `/detain` `/undetain`\n**Trial Mod+:** `/timeout` `/warn` `/verify`\n**Staff:** `/addticketbuttons` - Add close/archive buttons to tickets\n**Founder:** `/managepayments` - Manage AI feature payments',
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