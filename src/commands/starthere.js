const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starthere')
        .setDescription('Display the comprehensive Dark MAGA server guide (Founder Only)'),
    permissions: ['founder'],
    async execute(interaction) {
        const guide = `🇺🇸 **Welcome to Dark MAGA!** Here's your guide to our community:\n\n**🎯 Getting Started:**\n• Read the <#1375329872054063124> - it's crucial to avoid warnings, jails, kicks, or bans\n• Grab your roles in <#1375357390689402922> - customize your experience with reaction roles\n• Introduce yourself in <#1385149813699379231> - meet your fellow patriots\n\n**🏆 XP System & Roles:**\n• Chat activity earns you XP automatically\n• 10 XP roles: Patriot I → Patriot II → ... → Patriot X\n• Stay active to level up and show your dedication!\n\n**📰 News & Information:**\n• 📰 News category - Trump Administration updates and political news\n• Stay informed about current events and political discussions with channels like <#1375329903192309861> and <#1375329907231686767> \n\n**🎮 Community Features:**\n• 5 voice channels for live discussions\n• Major Trump events: speeches, announcements, rallies, addresses\n• Movie nights and community events\n• <#1384725674966777907> - Make suggestions to improve the server\n\n**⭐ Special Channels:**\n• <#1375968251422707772> - Starboard (messages with 5 ⭐ reactions)\n• <#1375968749764739082> - Clownboard (messages with 3 🤡 reactions)\n• <#1376356970231238736> - 2A Pride (guns, ammunition, hunting, self-defense)\n• <#1375329898666791034> - Prayer requests and general prayers\n\n**👥 Roles:**\n• **MAGA** - Default role for all members\n• **OG Members** - Original Dark MAGA server members\n• Custom roles available in <#1375357390689402922>\n\n**💬 Need Help?**\nDM the bot to create a modmail ticket for staff assistance!\n\n**🔥 Let's Make America Great Again!** 🇺🇸`;
        await interaction.reply({ content: guide });
    }
}; 