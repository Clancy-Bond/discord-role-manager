const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-roles')
    .setDescription('List all roles in the server with member counts and key info')
    .addBooleanOption(option =>
      option
        .setName('detailed')
        .setDescription('Show permission counts and settings for each role')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const roles = guild.roles.cache
      .filter(r => r.id !== guild.id) // exclude @everyone
      .sort((a, b) => b.position - a.position);

    const detailed = interaction.options.getBoolean('detailed') || false;

    if (roles.size === 0) {
      return interaction.editReply('No custom roles found in this server.');
    }

    // Build pages of up to 20 roles each (embed field limits)
    const pages = [];
    const rolesArray = [...roles.values()];
    const perPage = 20;

    for (let i = 0; i < rolesArray.length; i += perPage) {
      const slice = rolesArray.slice(i, i + perPage);
      const embed = new EmbedBuilder()
        .setTitle(`Roles in ${guild.name}`)
        .setColor(0xf0c040)
        .setFooter({
          text: `${roles.size} total roles | Page ${Math.floor(i / perPage) + 1}/${Math.ceil(rolesArray.length / perPage)}`,
        });

      let description = '';
      for (const role of slice) {
        const memberCount = role.members.size;
        const colorHex = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : 'none';

        if (detailed) {
          const permCount = role.permissions.toArray().length;
          description += `**${role.position}.** ${role} - ${memberCount} members\n`;
          description += `   Color: \`${colorHex}\` | Perms: ${permCount} | Hoist: ${role.hoist ? 'Yes' : 'No'} | Mentionable: ${role.mentionable ? 'Yes' : 'No'}\n\n`;
        } else {
          description += `**${role.position}.** ${role} - ${memberCount} members (\`${colorHex}\`)\n`;
        }
      }

      embed.setDescription(description);
      pages.push(embed);
    }

    // Send first page (for now - pagination can be added later)
    await interaction.editReply({ embeds: [pages[0]] });

    // If multiple pages, send the rest as follow-ups
    for (let i = 1; i < pages.length; i++) {
      await interaction.followUp({ embeds: [pages[i]] });
    }
  },
};
