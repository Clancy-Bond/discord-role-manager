import { NextResponse } from "next/server";
import { requireManageRoles, handleAuthError } from "@/lib/permissions";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import { parseCommand } from "@/lib/command-parser";
import type { RoleInfo, ChannelInfo } from "@/lib/types";
import { PermissionFlagsBits } from "discord-api-types/v10";

function getPermissionNames(permBitfield: string): string[] {
  const bits = BigInt(permBitfield);
  const names: string[] = [];
  for (const [name, flag] of Object.entries(PermissionFlagsBits)) {
    if ((bits & flag) === flag) {
      names.push(name);
    }
  }
  return names;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, guildId } = body;

    if (!message || !guildId) {
      return NextResponse.json(
        { error: "Message and guildId are required" },
        { status: 400 }
      );
    }

    await requireManageRoles(guildId);

    // Fetch current state for context
    const [apiRoles, apiChannels] = await Promise.all([
      getGuildRoles(guildId),
      getGuildChannels(guildId),
    ]);

    const roles: RoleInfo[] = apiRoles
      .filter((r) => r.id !== guildId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color
          ? `#${r.color.toString(16).padStart(6, "0")}`
          : null,
        colorInt: r.color,
        hoist: r.hoist,
        position: r.position,
        mentionable: r.mentionable,
        managed: r.managed,
        permissions: r.permissions,
        permissionNames: getPermissionNames(r.permissions),
        createdAt: new Date(
          Number(BigInt(r.id) >> BigInt(22)) + 1420070400000
        ).toISOString(),
      }));

    const channels: ChannelInfo[] = apiChannels
      .filter((c) => c.type !== 4) // Exclude categories
      .map((c) => {
        const ch = c as unknown as Record<string, unknown>;
        return {
          id: c.id,
          name: (ch.name as string) ?? "unknown",
          type: c.type,
          position: (ch.position as number) ?? 0,
          parentId: (ch.parent_id as string | null) ?? null,
          overwrites: ((ch.permission_overwrites as Array<{ id: string; type: number; allow?: string; deny?: string }>) ?? []).map((ow) => ({
            id: ow.id,
            type: ow.type,
            allow: ow.allow ?? "0",
            deny: ow.deny ?? "0",
          })),
        };
      });

    const action = parseCommand(message, roles, channels);

    return NextResponse.json({ action });
  } catch (err) {
    return handleAuthError(err);
  }
}
