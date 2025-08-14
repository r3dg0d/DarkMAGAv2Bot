const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverad')
        .setDescription('Display the Dark MAGA v2 server advertisement (Founder Only)'),
    permissions: ['founder'],
    async execute(interaction) {
        const ad = `Join passionate patriots to restore America's greatness with an America First focus! Engage, act, and unite to Make America Strong Again, Make America Wealthy Again, Make America Safe Again, and Make America Great Again! 🦅\n\nLearn more and join the movement: https://www.youtube.com/watch?v=ehNpRnVuTFo`;
        await interaction.reply({ content: ad });
    }
}; 