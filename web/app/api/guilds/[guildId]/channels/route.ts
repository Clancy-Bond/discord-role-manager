import { NextResponse } from "next/server";
import { requireManageRoles, handleAuthError } from "@/lib/permissions";
import { getGuildChannels, groupChannelsByCategory } from "@/lib/discord";
import type { ChannelInfo, GroupedChannelsResponse } from "@/lib/types";
import type { APIChannel } from "discord-api-types/v10";

function toChannelInfo(ch: APIChannel): ChannelInfo {
  const raw = ch as unknown as Record<string, unknown>;
  return {
    id: ch.id,
    name: (raw.name as string) ?? "unknown",
    type: ch.type,
    position: (raw.position as number) ?? 0,
    parentId: (raw.parent_id as string | null) ?? null,
    overwrites: (
      (raw.permission_overwrites as Array<{
        id: string;
        type: number;
        allow?: string;
        deny?: string;
      }>) ?? []
    ).map((ow) => ({
      id: ow.id,
      type: ow.type,
      allow: ow.allow ?? "0",
      deny: ow.deny ?? "0",
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await requireManageRoles(guildId);

    const channels = await getGuildChannels(guildId);
    const grouped = groupChannelsByCategory(channels);

    const response: GroupedChannelsResponse = {
      categories: grouped.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        position: cat.position,
        channels: cat.channels.map(toChannelInfo),
      })),
      uncategorized: grouped.uncategorized.map(toChannelInfo),
    };

    return NextResponse.json(response);
  } catch (err) {
    return handleAuthError(err);
  }
}
