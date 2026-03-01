import { NextResponse } from "next/server";
import { requireManageRoles, handleAuthError } from "@/lib/permissions";
import { editRole, deleteRole } from "@/lib/discord";

type Params = Promise<{ guildId: string; roleId: string }>;

// ── Edit a role ──
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { guildId, roleId } = await params;

  try {
    await requireManageRoles(guildId);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;
    if (body.hoist !== undefined) updates.hoist = body.hoist;
    if (body.mentionable !== undefined) updates.mentionable = body.mentionable;

    const role = await editRole(guildId, roleId, updates as {
      name?: string;
      color?: number;
      hoist?: boolean;
      mentionable?: boolean;
    });

    return NextResponse.json({
      success: true,
      role: { id: role.id, name: role.name },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

// ── Delete a role ──
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  const { guildId, roleId } = await params;

  try {
    const { roles } = await requireManageRoles(guildId);

    const role = roles.find((r) => r.id === roleId);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.managed) {
      return NextResponse.json(
        { error: "Cannot delete managed/bot role" },
        { status: 400 }
      );
    }

    await deleteRole(guildId, roleId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleAuthError(err);
  }
}
