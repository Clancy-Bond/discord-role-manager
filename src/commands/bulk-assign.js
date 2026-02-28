const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bulk-assign')
    .setDescription('Assign or remove a role to/from all members who have another role')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Add or remove the target role')
        .setRequired(true)
        .addChoices(
          { name: 'Add role', value: 'add' },
          { name: 'Remove role', value: 'remove' }
        )
    )
    .addRoleOption(option =>
      option
        .setName('target-role')
        .setDescription('The role to add or remove')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('source-role')
        .setDescription('Apply to all members who have this role (leave empty for ALL members)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply();

    const action = interaction.options.getString('action');
    const targetRole = interaction.options.getRole('target-role');
    const sourceRole = interaction.options.getRole('source-role');

    const botMember = interaction.guild.members.me;
    if (targetRole.position >= botMember.roles.highest.position) {
      return interaction.editReply(
        `I can't manage **${targetRole.name}** because it's at or above my highest role.`
      );
    }

    // Get the members to operate on
    const allMembers = await interaction.guild.members.fetch();
    const members = sourceRole
      ? allMembers.filter(m => m.roles.cache.has(sourceRole.id))
      : allMembers.filter(m => !m.user.bot);

    if (members.size === 0) {
      return interaction.editReply('No members found matching the criteria.');
    }

    let success = 0;
    let failed = 0;

    for (const [, member] of members) {
      try {
        if (action === 'add') {
          if (!member.roles.cache.has(targetRole.id)) {
            await member.roles.add(targetRole);
            success++;
          }
        } else {
          if (member.roles.cache.has(targetRole.id)) {
            await member.roles.remove(targetRole);
            success++;
          }
        }
      } catch {
        failed++;
      }
    }

    const verb = action === 'add' ? 'Added' : 'Removed';
    const prep = action === 'add' ? 'to' : 'from';
    let response = `**${verb}** ${targetRole} ${prep} **${success}** member(s)`;
    if (sourceRole) {
      response += ` (who have ${sourceRole})`;
    }
    if (failed > 0) {
      response += `\nFailed for ${failed} member(s) (likely higher in hierarchy)`;
    }

    return interaction.editReply(response);
  },
};
