import { REST } from "@discordjs/rest";
import {
  Routes,
  type APIRole,
  type APIChannel,
  type APIGuildMember,
  type APIGuild,
  type RESTGetAPICurrentUserGuildsResult,
  PermissionFlagsBits,
  ChannelType,
} from "discord-api-types/v10";

// Singleton REST client using the BOT token
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

// ── Guild operations ──

export async function getBotGuilds(): Promise<RESTGetAPICurrentUserGuildsResult> {
  return (await rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
}

export async function getGuild(guildId: string): Promise<APIGuild> {
  return (await rest.get(Routes.guild(guildId), {
    query: new URLSearchParams({ with_counts: "true" }),
  })) as APIGuild;
}

export async function getGuildRoles(guildId: string): Promise<APIRole[]> {
  return (await rest.get(Routes.guildRoles(guildId))) as APIRole[];
}

export async function getGuildChannels(guildId: string): Promise<APIChannel[]> {
  return (await rest.get(Routes.guildChannels(guildId))) as APIChannel[];
}

export async function getGuildMember(
  guildId: string,
  userId: string
): Promise<APIGuildMember> {
  return (await rest.get(
    Routes.guildMember(guildId, userId)
  )) as APIGuildMember;
}

// ── Role operations ──

export async function createRole(
  guildId: string,
  data: {
    name: string;
    color?: number;
    hoist?: boolean;
    permissions?: string;
    mentionable?: boolean;
    reason?: string;
  }
): Promise<APIRole> {
  const { reason, ...body } = data;
  return (await rest.post(Routes.guildRoles(guildId), {
    body,
    reason,
  })) as APIRole;
}

export async function editRole(
  guildId: string,
  roleId: string,
  data: {
    name?: string;
    color?: number;
    hoist?: boolean;
    mentionable?: boolean;
  }
): Promise<APIRole> {
  return (await rest.patch(Routes.guildRole(guildId, roleId), {
    body: data,
    reason: "Edited via Role Manager dashboard",
  })) as APIRole;
}

export async function deleteRole(
  guildId: string,
  roleId: string
): Promise<void> {
  await rest.delete(Routes.guildRole(guildId, roleId), {
    reason: "Deleted via Role Manager dashboard",
  });
}

export async function setRolePosition(
  guildId: string,
  roleId: string,
  position: number
): Promise<void> {
  await rest.patch(Routes.guildRoles(guildId), {
    body: [{ id: roleId, position }],
  });
}

// ── Channel permission operations ──

export async function setChannelPermissionOverwrite(
  channelId: string,
  targetId: string,
  allow: string,
  deny: string
): Promise<void> {
  await rest.put(`/channels/${channelId}/permissions/${targetId}`, {
    body: {
      type: 0, // 0 = role, 1 = member
      allow,
      deny,
    },
  });
}

// ── Permission helpers ──

export function computeMemberPermissions(
  memberRoleIds: string[],
  guildRoles: APIRole[],
  guildOwnerId: string,
  memberId: string
): bigint {
  // Guild owner has all permissions
  if (memberId === guildOwnerId) return BigInt("0x7FFFFFFFFFFFF");

  let permissions = BigInt(0);
  for (const roleId of memberRoleIds) {
    const role = guildRoles.find((r) => r.id === roleId);
    if (role) {
      permissions |= BigInt(role.permissions);
    }
  }
  // Also include @everyone role permissions
  const everyoneRole = guildRoles.find((r) => r.id === guildRoles[0]?.id);
  if (everyoneRole) {
    permissions |= BigInt(everyoneRole.permissions);
  }
  // Administrator grants all permissions
  if (permissions & PermissionFlagsBits.Administrator) {
    return BigInt("0x7FFFFFFFFFFFF");
  }
  return permissions;
}

export function hasPermission(permissions: bigint, flag: bigint): boolean {
  return (permissions & flag) === flag;
}

// ── Channel grouping ──

export interface GroupedChannels {
  categories: {
    id: string;
    name: string;
    position: number;
    channels: APIChannel[];
  }[];
  uncategorized: APIChannel[];
}

export function groupChannelsByCategory(
  channels: APIChannel[]
): GroupedChannels {
  // Cast to generic records to handle Discord's complex union types
  type AnyChannel = Record<string, unknown> & { id: string; type: number };
  const all = channels as unknown as AnyChannel[];

  const categories = all
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0));

  const nonCategoryChannels = all.filter(
    (c) => c.type !== ChannelType.GuildCategory
  );

  const grouped: GroupedChannels = {
    categories: categories.map((cat) => ({
      id: cat.id,
      name: (cat.name as string) ?? "Unknown",
      position: (cat.position as number) ?? 0,
      channels: nonCategoryChannels
        .filter((c) => c.parent_id === cat.id)
        .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0)) as unknown as APIChannel[],
    })),
    uncategorized: nonCategoryChannels
      .filter((c) => !c.parent_id)
      .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0)) as unknown as APIChannel[],
  };

  return grouped;
}

// ── Duplicate role with selective channel copying ──

export async function duplicateRole(
  guildId: string,
  sourceRoleId: string,
  options: {
    name?: string;
    count?: number;
    copyMembers?: boolean;
    channelIds?: string[]; // Selective channel copying
  }
): Promise<{
  created: { id: string; name: string; color: string | null }[];
  channelsCopied: number;
  membersCopied: number;
}> {
  const roles = await getGuildRoles(guildId);
  const sourceRole = roles.find((r) => r.id === sourceRoleId);
  if (!sourceRole) throw new Error("Source role not found");

  const copies = Math.min(Math.max(options.count ?? 1, 1), 10);
  const created: { id: string; name: string; color: string | null }[] = [];

  for (let i = 0; i < copies; i++) {
    let roleName: string;
    if (options.name) {
      roleName = copies > 1 ? `${options.name} ${i + 1}` : options.name;
    } else {
      roleName =
        copies > 1
          ? `Copy of ${sourceRole.name} ${i + 1}`
          : `Copy of ${sourceRole.name}`;
    }

    const newRole = await createRole(guildId, {
      name: roleName,
      color: sourceRole.color,
      hoist: sourceRole.hoist,
      permissions: sourceRole.permissions,
      mentionable: sourceRole.mentionable,
      reason: `Duplicated from "${sourceRole.name}" via Role Manager dashboard`,
    });

    // Try to position it near the source
    try {
      await setRolePosition(guildId, newRole.id, sourceRole.position - 1);
    } catch {
      // Position setting can fail if bot doesn't have high enough role
    }

    created.push({
      id: newRole.id,
      name: newRole.name,
      color: newRole.color
        ? `#${newRole.color.toString(16).padStart(6, "0")}`
        : null,
    });
  }

  // Copy channel permission overrides
  let channelsCopied = 0;
  const allChannels = await getGuildChannels(guildId);

  // If channelIds provided, only copy from those channels
  const channelsToProcess = options.channelIds
    ? allChannels.filter((ch) => options.channelIds!.includes(ch.id))
    : allChannels;

  for (const channel of channelsToProcess) {
    const ch = channel as unknown as Record<string, unknown>;
    const overwrites = (ch.permission_overwrites as Array<{ id: string; allow?: string; deny?: string }>) ?? [];
    const sourceOverwrite = overwrites.find((ow) => ow.id === sourceRoleId);
    if (!sourceOverwrite) continue;

    let success = false;
    for (const newRole of created) {
      try {
        await setChannelPermissionOverwrite(
          channel.id,
          newRole.id,
          sourceOverwrite.allow ?? "0",
          sourceOverwrite.deny ?? "0"
        );
        success = true;
      } catch (err) {
        console.error(
          `Channel override copy failed for ${ch.name}:`,
          err
        );
      }
    }
    if (success) channelsCopied++;
  }

  // Copy members if requested
  let membersCopied = 0;
  if (options.copyMembers) {
    try {
      // Fetch guild members who have the source role
      const members = (await rest.get(Routes.guildMembers(guildId), {
        query: new URLSearchParams({ limit: "1000" }),
      })) as APIGuildMember[];

      const sourceMembers = members.filter((m) =>
        m.roles.includes(sourceRoleId)
      );

      for (const member of sourceMembers) {
        const userId = member.user?.id;
        if (!userId) continue;
        try {
          for (const newRole of created) {
            await rest.put(Routes.guildMemberRole(guildId, userId, newRole.id));
          }
          membersCopied++;
        } catch {
          // Skip members we can't assign to
        }
      }
    } catch (err) {
      console.error("Error copying members:", err);
    }
  }

  return { created, channelsCopied, membersCopied };
}
