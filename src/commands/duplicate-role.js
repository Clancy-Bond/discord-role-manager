const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duplicate-role')
    .setDescription('Duplicate an existing role with all its permissions, color, and settings')
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

    // Safety: can't duplicate @everyone or roles above the bot's highest role
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

        // Try to position it right below the source role
        try {
          await newRole.setPosition(sourceRole.position - 1);
        } catch {
          // Position setting can fail due to hierarchy - not critical
        }

        // Copy role icon if the guild supports it and the role has one
        if (sourceRole.icon && interaction.guild.premiumTier >= 2) {
          try {
            await newRole.setIcon(sourceRole.iconURL());
          } catch {
            // Icon copy can fail - not critical
          }
        }

        created.push(newRole);
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
          } catch {
            // Some members might not be assignable
          }
        }
      }

      // Build response
      const roleList = created.map(r => `- ${r} (${r.name})`).join('\n');
      const permCount = sourceRole.permissions.toArray().length;
      let response = `**Duplicated** ${sourceRole.name}\n\n`;
      response += `**Created ${created.length} role(s):**\n${roleList}\n\n`;
      response += `**Copied:** color \`#${sourceRole.color.toString(16).padStart(6, '0')}\`, `;
      response += `${permCount} permissions, `;
      response += `hoist: ${sourceRole.hoist ? 'yes' : 'no'}, `;
      response += `mentionable: ${sourceRole.mentionable ? 'yes' : 'no'}`;

      if (copyMembers) {
        response += `\n**Assigned to:** ${memberCount} member(s)`;
      }

      return interaction.editReply(response);
    } catch (error) {
      console.error('Error duplicating role:', error);
      return interaction.editReply(`Failed to duplicate role: ${error.message}`);
    }
  },
};
