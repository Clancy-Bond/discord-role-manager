import { NextResponse } from "next/server";
import { requireManageRoles, handleAuthError } from "@/lib/permissions";
import { duplicateRole } from "@/lib/discord";
import type { DuplicateRequest } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guildId: string; roleId: string }> }
) {
  const { guildId, roleId } = await params;

  try {
    await requireManageRoles(guildId);

    const body: DuplicateRequest = await request.json();

    const result = await duplicateRole(guildId, roleId, {
      name: body.name,
      count: body.count,
      copyMembers: body.copyMembers,
      channelIds: body.channelIds, // Selective channel copying
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleAuthError(err);
  }
}
