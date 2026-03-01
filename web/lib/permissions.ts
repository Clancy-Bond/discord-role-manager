import { auth } from "./auth";
import {
  getGuildMember,
  getGuildRoles,
  getGuild,
  computeMemberPermissions,
  hasPermission,
} from "./discord";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { NextResponse } from "next/server";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireManageRoles(guildId: string) {
  const session = await auth();
  if (!session?.user?.discordId) {
    throw new AuthError("Not authenticated", 401);
  }

  // Check admin toggle
  if (process.env.ADMIN_ENABLED === "false") {
    throw new AuthError("Dashboard is currently disabled", 503);
  }

  const userId = session.user.discordId;

  try {
    const [member, roles, guild] = await Promise.all([
      getGuildMember(guildId, userId),
      getGuildRoles(guildId),
      getGuild(guildId),
    ]);

    const memberRoleIds = member.roles;
    // Add @everyone role (guild ID)
    memberRoleIds.push(guildId);

    const permissions = computeMemberPermissions(
      memberRoleIds,
      roles,
      guild.owner_id ?? "",
      userId
    );

    if (!hasPermission(permissions, PermissionFlagsBits.ManageRoles)) {
      throw new AuthError("You need Manage Roles permission", 403);
    }

    return { session, member, roles, guild, permissions };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Could not verify permissions. Are you in this server?", 403);
  }
}

export function handleAuthError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Unexpected error:", err);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
