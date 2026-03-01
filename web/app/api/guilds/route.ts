import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotGuilds } from "@/lib/discord";
import type { GuildInfo } from "@/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (process.env.ADMIN_ENABLED === "false") {
    return NextResponse.json(
      { error: "Dashboard is currently disabled" },
      { status: 503 }
    );
  }

  try {
    // Get guilds the bot is in
    const botGuilds = await getBotGuilds();

    // Get guilds the user is in (using their OAuth token)
    const userGuildsRes = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }
    );
    const userGuilds = await userGuildsRes.json();

    if (!Array.isArray(userGuilds)) {
      return NextResponse.json(
        { error: "Failed to fetch your servers" },
        { status: 500 }
      );
    }

    // Only show guilds where BOTH the bot and user are present
    const userGuildIds = new Set(userGuilds.map((g: { id: string }) => g.id));
    const sharedGuilds: GuildInfo[] = botGuilds
      .filter((g) => userGuildIds.has(g.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`
          : null,
      }));

    return NextResponse.json(sharedGuilds);
  } catch (err) {
    console.error("Error fetching guilds:", err);
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    );
  }
}
