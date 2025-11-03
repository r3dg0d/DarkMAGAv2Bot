const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const categories = {
    gender: {
        title: '🚻 Gender Identity',
        description: 'Select your gender identity',
        roles: ['Male', 'Female'],
        max_roles: 1
    },
    military: {
        title: '🎖️ Military Service',
        description: 'Show your military branch or service',
        roles: ['US Army', 'US Navy', 'US Marine Corps', 'US Air Force', 'US Space Force', 'US Coast Guard', 'Veteran', 'Active Duty', 'Reserves', 'Military Family'],
        max_roles: 3
    },
    firstresponder: {
        title: '🚨 First Responders',
        description: 'Honor your service to the community',
        roles: ['First Responder', 'Police Officer', 'Firefighter', 'Paramedic/EMT'],
        max_roles: 2
    },
    geographic: {
        title: '🇺🇸 Geographic & Political Location',
        description: 'Represent your region and state type',
        roles: ['Red State', 'Blue State', 'Swing State', 'Rural', 'Urban', 'Suburban', 'Southern', 'Northern', 'Western', 'Eastern'],
        max_roles: 3
    },
    political: {
        title: '🏛️ Political Alignment',
        description: 'Show your political stance and support',
        roles: ['America First', 'Conservative', 'Libertarian', 'Independent', 'Trump Supporter', 'JD Vance Supporter', 'Vivek Supporter', 'Tea Party', 'Constitutionalist'],
        max_roles: null
    },
    occupation: {
        title: '💼 Occupation & Industry',
        description: 'Share your profession or industry',
        roles: ['Small Business Owner', 'Entrepreneur', 'Farmer/Rancher', 'Trucker', 'Oil & Gas', 'Manufacturing', 'Tech Worker', 'Healthcare Worker'],
        max_roles: 2
    },
    rights: {
        title: '🔫 2nd Amendment & Gun Rights',
        description: 'Show your support for constitutional rights',
        roles: ['Gun Owner', '2A Supporter'],
        max_roles: null
    },
    age: {
        title: '🎂 Age Group',
        description: 'Select your generation',
        roles: ['Gen Z', 'Millennial', 'Gen X', 'Boomer', 'Silent Generation'],
        max_roles: 1
    },
    platforms: {
        title: '📱 Social Media Platforms',
        description: 'Show which platforms you use',
        roles: ['Truth Social User', 'X/Twitter User', 'Gab User', 'Rumble User', 'Telegram User', 'Facebook User'],
        max_roles: null
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quickroles')
        .setDescription('Quick setup for common role categories (Founder Only)')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Role category to preview')
                .setRequired(true)
                .addChoices(...Object.keys(categories).map(key => ({ name: categories[key].title, value: key })))),
    permissions: ['founder'],
    async execute(interaction, bot) {
        const key = interaction.options.getString('category');
        const cat = categories[key];
        const guildRoles = interaction.guild.roles.cache;
        const missing = cat.roles.filter(r => !guildRoles.some(gr => gr.name === r));
        const present = cat.roles.filter(r => guildRoles.some(gr => gr.name === r));
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(cat.title)
            .setDescription(cat.description)
            .addFields({ name: 'Roles', value: cat.roles.map(r => present.includes(r) ? `✅ ${r}` : `❌ ${r}`).join('\n'), inline: false });
        if (missing.length) {
            embed.addFields({ name: 'Missing Roles', value: missing.map(r => `• ${r}`).join('\n'), inline: false });
            embed.addFields({ name: 'Setup Tip', value: 'Create missing roles in your server before using this category for reaction roles.', inline: false });
            if (cat.max_roles) {
                embed.addFields({ name: 'Max Selectable Roles', value: String(cat.max_roles), inline: true });
            }
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        // All roles exist, send public message with buttons
        const roles = cat.roles.map(roleName => guildRoles.find(gr => gr.name === roleName)).filter(Boolean);
        const rolesData = {};
        for (const role of roles) {
            rolesData[role.id] = role.name;
        }
        if (roles.length === 0) {
            await interaction.reply({ content: 'No valid roles found for this category.', ephemeral: true });
            return;
        }
        if (cat.max_roles) {
            embed.addFields({ name: 'Max Selectable Roles', value: String(cat.max_roles), inline: true });
        }
        embed.setFooter({ text: 'Dark MAGA Bot' }).setTimestamp();
        // Create buttons
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;
        let buttonIndex = 0;
        for (const role of roles) {
            const button = new ButtonBuilder()
                .setCustomId(`reaction_role_${role.id}_${buttonIndex}`)
                .setLabel(role.name.length > 80 ? role.name.substring(0, 77) + '...' : role.name)
                .setStyle(ButtonStyle.Primary);
            currentRow.addComponents(button);
            buttonCount++;
            buttonIndex++;
            if (buttonCount === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
        }
        if (buttonCount > 0) {
            rows.push(currentRow);
        }
        if (rows.length > 5) {
            await interaction.reply({ content: 'Too many roles! Discord allows a maximum of 25 buttons (5 rows of 5 buttons each).', ephemeral: true });
            return;
        }
        try {
            const message = await interaction.channel.send({
                embeds: [embed],
                components: rows
            });
            await bot.database.saveReactionRoleMessage(
                interaction.guild.id,
                interaction.channel.id,
                message.id,
                rolesData,
                false, // permanent is always false for quickroles
                cat.max_roles || null
            );
            await interaction.reply({ content: `Reaction role message created successfully! Message ID: ${message.id}`, ephemeral: true });
        } catch (error) {
            console.error('Error creating quickroles reaction role message:', error);
            await interaction.reply({ content: 'Failed to create reaction role message. Please check the console for details.', ephemeral: true });
        }
    }
}; 