const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Setup reaction roles (Founder Only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title for the reaction role embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description text for the embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('roles')
                .setDescription('Roles to include (mention them separated by spaces)')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('permanent')
                .setDescription('Whether roles are permanent (true) or toggleable (false)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('max_roles')
                .setDescription('Maximum number of roles a user can have (optional)')
                .setRequired(false)),
    
    permissions: ['founder'],
    
    async execute(interaction, bot) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const rolesText = interaction.options.getString('roles');
        const permanent = interaction.options.getBoolean('permanent') || false;
        const maxRoles = interaction.options.getInteger('max_roles');

        // Debug: Check database status
        try {
            await bot.database.ensureDatabase();
            console.log('Database ensured before creating reaction roles');
        } catch (error) {
            console.error('Error ensuring database:', error);
            await interaction.reply({ 
                content: 'Database error occurred. Please check console logs.', 
                ephemeral: true 
            });
            return;
        }

        // Parse roles from mentions
        const roleMatches = rolesText.match(/<@&(\d+)>/g);
        if (!roleMatches) {
            await interaction.reply({ 
                content: 'Please mention the roles you want to include (e.g., @Role1 @Role2 @Role3)', 
                ephemeral: true 
            });
            return;
        }

        const roles = [];
        const rolesData = {};
        const seenRoleIds = new Set(); // Track unique role IDs

        for (const match of roleMatches) {
            const roleId = match.replace(/[<@&>]/g, '');
            
            // Skip if we've already seen this role ID
            if (seenRoleIds.has(roleId)) {
                continue;
            }
            
            const role = interaction.guild.roles.cache.get(roleId);
            
            if (role) {
                roles.push(role);
                rolesData[roleId] = role.name;
                seenRoleIds.add(roleId);
            }
        }

        if (roles.length === 0) {
            await interaction.reply({ 
                content: 'No valid roles found. Please check your role mentions.', 
                ephemeral: true 
            });
            return;
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(title)
            .setDescription(description)
            .addFields(
                {
                    name: 'Available Roles',
                    value: roles.map(role => `• ${role.name}`).join('\n'),
                    inline: false
                }
            );

        if (maxRoles) {
            embed.addFields({
                name: 'Maximum Roles',
                value: `You can select up to ${maxRoles} roles.`,
                inline: true
            });
        }

        if (permanent) {
            embed.addFields({
                name: 'Role Type',
                value: 'Permanent (roles cannot be removed)',
                inline: true
            });
        }

        embed.setFooter({ text: 'Dark MAGA Bot' })
            .setTimestamp();

        // Create buttons with unique custom IDs
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;
        let buttonIndex = 0; // Track button index for unique custom IDs

        for (const role of roles) {
            const button = new ButtonBuilder()
                .setCustomId(`reaction_role_${role.id}_${buttonIndex}`)
                .setLabel(role.name.length > 80 ? role.name.substring(0, 77) + '...' : role.name) // Discord limit is 80 chars
                .setStyle(ButtonStyle.Primary);

            currentRow.addComponents(button);
            buttonCount++;
            buttonIndex++;

            // Discord allows max 5 buttons per row
            if (buttonCount === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
        }

        if (buttonCount > 0) {
            rows.push(currentRow);
        }

        // Ensure we don't exceed Discord's component limits
        if (rows.length > 5) {
            await interaction.reply({ 
                content: 'Too many roles! Discord allows a maximum of 25 buttons (5 rows of 5 buttons each).', 
                ephemeral: true 
            });
            return;
        }

        try {
            // Send message
            const message = await interaction.channel.send({
                embeds: [embed],
                components: rows
            });

            // Save to database
            await bot.database.saveReactionRoleMessage(
                interaction.guild.id,
                interaction.channel.id,
                message.id,
                rolesData,
                permanent,
                maxRoles
            );

            await interaction.reply({ 
                content: `Reaction role message created successfully! Message ID: ${message.id}`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Error creating reaction role message:', error);
            await interaction.reply({ 
                content: 'Failed to create reaction role message. Please check the console for details.', 
                ephemeral: true 
            });
        }
    }
}; 