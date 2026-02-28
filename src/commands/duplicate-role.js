const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, REST, Routes } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duplicate-role')
    .setDescription('Duplicate a role with all permissions, channel overrides, color, and settings')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to duplicate')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Name for the new role (defaults to "Copy of [role]")')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of copies to create (default: 1, max: 10)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('copy-members')
        .setDescription('Also assign the new role to all members who have the original role')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply();

    const sourceRole = interaction.options.getRole('role');
    const customName = interaction.options.getString('name');
    const count = interaction.options.getInteger('count') || 1;
    const copyMembers = interaction.options.getBoolean('copy-members') || false;

    if (sourceRole.id === interaction.guild.id) {
      return interaction.editReply('Cannot duplicate the @everyone role.');
    }

    const botMember = interaction.guild.members.me;
    if (sourceRole.position >= botMember.roles.highest.position) {
      return interaction.editReply(
        `I can't duplicate **${sourceRole.name}** because it's positioned above or equal to my highest role. Move my role higher in Server Settings > Roles.`
      );
    }

    const created = [];
    const errors = [];
    try {
      for (let i = 0; i < count; i++) {
        let roleName;
        if (customName) {
          roleName = count > 1 ? `${customName} ${i + 1}` : customName;
        } else {
          roleName = count > 1 ? `Copy of ${sourceRole.name} ${i + 1}` : `Copy of ${sourceRole.name}`;
        }

        const newRole = await interaction.guild.roles.create({
          name: roleName,
          color: sourceRole.color,
          hoist: sourceRole.hoist,
          permissions: sourceRole.permissions,
          mentionable: sourceRole.mentionable,
          reason: `Role duplicated from "${sourceRole.name}" by ${interaction.user.tag}`,
        });

        try {
          await newRole.setPosition(sourceRole.position - 1);
        } catch {}

        if (sourceRole.icon && interaction.guild.premiumTier >= 2) {
          try {
            await newRole.setIcon(sourceRole.iconURL());
          } catch {}
        }

        created.push(newRole);
      }

      // ── Copy channel permission overrides using REST API directly ──
      // This bypasses discord.js caching issues by hitting Discord's API
      const rest = new REST().setToken(process.env.DISCORD_TOKEN);
      let channelsCopied = 0;
      let channelsFailed = 0;

      // Fetch ALL channels fresh from the API (not cache)
      const apiChannels = await rest.get(Routes.guildChannels(interaction.guild.id));
      console.log(`Found ${apiChannels.length} channels in guild via API`);

      for (const apiChannel of apiChannels) {
        // Find overwrite for source role in this channel
        const overwrites = apiChannel.permission_overwrites || [];
        const sourceOverwrite = overwrites.find(ow => ow.id === sourceRole.id);
        if (!sourceOverwrite) continue;

        console.log(`Channel #${apiChannel.name}: found override for source role - allow: ${sourceOverwrite.allow}, deny: ${sourceOverwrite.deny}`);

        for (const newRole of created) {
          try {
            // PUT the permission overwrite directly via REST
            await rest.put(
              `/channels/${apiChannel.id}/permissions/${newRole.id}`,
              {
                body: {
                  type: 0, // 0 = role, 1 = member
                  allow: sourceOverwrite.allow,
                  deny: sourceOverwrite.deny,
                },
              }
            );
            console.log(`  -> Applied to ${newRole.name} on #${apiChannel.name}`);
          } catch (err) {
            console.error(`  -> FAILED for ${newRole.name} on #${apiChannel.name}: ${err.message}`);
            errors.push(`#${apiChannel.name}: ${err.message}`);
            channelsFailed++;
          }
        }
        channelsCopied++;
      }

      // Copy members if requested
      let memberCount = 0;
      if (copyMembers) {
        const members = await interaction.guild.members.fetch();
        const sourceMembers = members.filter(m => m.roles.cache.has(sourceRole.id));

        for (const [, member] of sourceMembers) {
          try {
            for (const role of created) {
              await member.roles.add(role);
            }
            memberCount++;
          } catch {}
        }
      }

      // Build response
      const roleList = created.map(r => `- ${r} (${r.name})`).join('\n');
      const permCount = sourceRole.permissions.toArray().length;
      let response = `**Duplicated** ${sourceRole.name}\n\n`;
      response += `**Created ${created.length} role(s):**\n${roleList}\n\n`;
      response += `**Copied:** color \`#${sourceRole.color.toString(16).padStart(6, '0')}\`, `;
      response += `${permCount} server permissions, `;
      response += `${channelsCopied} channel override(s), `;
      response += `hoist: ${sourceRole.hoist ? 'yes' : 'no'}, `;
      response += `mentionable: ${sourceRole.mentionable ? 'yes' : 'no'}`;

      if (channelsFailed > 0) {
        response += `\n**Failed:** ${channelsFailed} channel(s) - check bot permissions`;
      }

      if (copyMembers) {
        response += `\n**Assigned to:** ${memberCount} member(s)`;
      }

      if (errors.length > 0) {
        response += `\n\n**Errors:**\n${errors.slice(0, 5).map(e => `- ${e}`).join('\n')}`;
        if (errors.length > 5) response += `\n- ...and ${errors.length - 5} more`;
      }

      return interaction.editReply(response);
    } catch (error) {
      console.error('Error duplicating role:', error);
      return interaction.editReply(`Failed to duplicate role: ${error.message}`);
    }
  },
};
