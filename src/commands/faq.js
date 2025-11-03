// FAQ command for DarkMAGABot
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Answers FAQs about the bot\'s AI features, payment, pricing, and functionality.')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The FAQ question to ask')
        .setRequired(false)
        .addChoices(
          { name: 'AI Features', value: 'ai' },
          { name: 'Payment', value: 'payment' },
          { name: 'Pricing', value: 'pricing' },
          { name: 'How Made', value: 'howmade' },
          { name: 'Functionality', value: 'functionality' }
        )),
  
  async execute(interaction) {
    const questions = {
      'ai': 'The bot uses advanced AI for natural language processing and decision-making.',
      'payment': 'The bot is free to use with optional premium features available via one-time payment.',
      'pricing': 'Premium subscription costs a $25/one-time fee for additional AI features.',
      'howmade': 'The bot was developed using NodeJS and integrated with Discord API via discord.js library.',
      'functionality': 'The bot works by analyzing commands and context to provide automated responses and actions.'
    };

    const query = interaction.options.getString('question') || 'general';
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('❓ FAQ - DarkMAGABot')
      .setTimestamp();
    
    if (query !== 'general' && questions[query.toLowerCase()]) {
      embed.setDescription(questions[query.toLowerCase()]);
    } else {
      embed.setDescription('**Available FAQ Topics:**')
        .addFields(
          { name: '🤖 AI Features', value: questions['ai'], inline: false },
          { name: '💳 Payment', value: questions['payment'], inline: false },
          { name: '💰 Pricing', value: questions['pricing'], inline: false },
          { name: '🔧 How Made', value: questions['howmade'], inline: false },
          { name: '⚙️ Functionality', value: questions['functionality'], inline: false }
        )
        .setFooter({ text: 'Use /faq question:<topic> to get a specific answer' });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
};
