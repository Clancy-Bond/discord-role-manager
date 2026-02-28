const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-info')
    .setDescription('Show detailed info about a specific role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply();

    const role = interaction.options.getRole('role');
    const permissions = role.permissions.toArray();
    const members = role.members;
    const colorHex = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : 'No color';

    const embed = new EmbedBuilder()
      .setTitle(`Role: ${role.name}`)
      .setColor(role.color || 0x2f3136)
      .addFields(
        { name: 'ID', value: `\`${role.id}\``, inline: true },
        { name: 'Color', value: `\`${colorHex}\``, inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
        { name: 'Members', value: `${members.size}`, inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Managed (bot/integration)', value: role.managed ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
      );

    // Permissions list (truncate if too long)
    if (permissions.length > 0) {
      const permText = permissions
        .map(p => `\`${p.replace(/([A-Z])/g, ' $1').trim()}\``)
        .join(', ');

      // Discord embed field limit is 1024 chars
      embed.addFields({
        name: `Permissions (${permissions.length})`,
        value: permText.length > 1024 ? permText.slice(0, 1020) + '...' : permText,
      });
    } else {
      embed.addFields({ name: 'Permissions', value: 'None' });
    }

    // Show first 15 members with this role
    if (members.size > 0 && members.size <= 15) {
      embed.addFields({
        name: 'Members',
        value: members.map(m => m.toString()).join(', '),
      });
    } else if (members.size > 15) {
      const shown = members.first(15).map(m => m.toString()).join(', ');
      embed.addFields({
        name: `Members (showing 15 of ${members.size})`,
        value: shown,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
