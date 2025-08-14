const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency'),
    
    async execute(interaction, bot) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(bot.client.ws.ping);
        
        await interaction.editReply(`🏓 Pong!\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`);
    }
}; 