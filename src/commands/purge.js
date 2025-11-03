const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Remove messages (Executive Mod+ Only)')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('Number of messages to delete (1-10000)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10000))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user (optional)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('confirm_large')
                .setDescription('Set to True to confirm purges over 500 messages')
                .setRequired(false)),
    
    permissions: ['executiveMod'],
    
    async execute(interaction, bot) {
        const number = interaction.options.getInteger('number');
        const user = interaction.options.getUser('user');
        const confirmLarge = interaction.options.getBoolean('confirm_large') || false;

        // Check for large purges
        if (number > 500 && !confirmLarge) {
            await interaction.reply({ 
                content: `You are about to delete ${number} messages. Set \`confirm_large\` to true to confirm this action.`, 
                ephemeral: true 
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            let deletedCount = 0;
            let lastMessageId = null;

            while (deletedCount < number) {
                const limit = Math.min(100, number - deletedCount);
                const options = { limit };

                if (lastMessageId) {
                    options.before = lastMessageId;
                }

                const messages = await interaction.channel.messages.fetch(options);
                
                if (messages.size === 0) break;

                const messagesToDelete = user 
                    ? messages.filter(msg => msg.author.id === user.id)
                    : messages;

                if (messagesToDelete.size === 0) break;

                const messageArray = Array.from(messagesToDelete.values());
                await interaction.channel.bulkDelete(messageArray, true);
                
                deletedCount += messageArray.length;
                lastMessageId = messageArray[messageArray.length - 1].id;

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🧹 Messages Purged')
                .setDescription(`Successfully deleted **${deletedCount}** messages.`)
                .addFields(
                    {
                        name: 'Channel',
                        value: interaction.channel.name,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: interaction.user.tag,
                        inline: true
                    }
                );

            if (user) {
                embed.addFields({
                    name: 'Filtered User',
                    value: user.tag,
                    inline: true
                });
            }

            embed.setFooter({ text: 'Dark MAGA Bot' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error purging messages:', error);
            await interaction.editReply({ 
                content: 'An error occurred while trying to purge messages. Messages older than 14 days cannot be bulk deleted.', 
                ephemeral: true 
            });
        }
    }
}; 