import { NextResponse } from "next/server";
import { requireManageRoles, handleAuthError } from "@/lib/permissions";
import { PermissionFlagsBits } from "discord-api-types/v10";
import type { RoleInfo } from "@/lib/types";

// Map permission bitfield to human-readable names
const PERMISSION_NAMES: Record<string, string> = {};
for (const [name, bit] of Object.entries(PermissionFlagsBits)) {
  PERMISSION_NAMES[bit.toString()] = name;
}

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const { roles } = await requireManageRoles(guildId);

    const sortedRoles: RoleInfo[] = roles
      .filter((r) => r.id !== guildId) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
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

    return NextResponse.json(sortedRoles);
  } catch (err) {
    return handleAuthError(err);
  }
}
