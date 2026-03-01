"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GuildInfo } from "@/lib/types";

interface ServerPickerProps {
  guilds: GuildInfo[];
}

export default function ServerPicker({ guilds }: ServerPickerProps) {
  const pathname = usePathname();

  if (guilds.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-6 text-center">
        <p className="text-text-muted">
          No shared servers found. Make sure the bot is in your server.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-1 py-2 scrollbar-none">
      {guilds.map((guild) => {
        const isActive = pathname.includes(guild.id);
        return (
          <Link
            key={guild.id}
            href={`/dashboard/${guild.id}`}
            className={`tap-target flex flex-shrink-0 flex-col items-center gap-2 rounded-xl p-3 transition-all ${
              isActive
                ? "bg-accent/10 ring-2 ring-accent"
                : "bg-surface hover:bg-surface-hover"
            }`}
          >
            {guild.icon ? (
              <img
                src={guild.icon}
                alt={guild.name}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                {guild.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <span className="max-w-[80px] truncate text-xs text-text-muted">
              {guild.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
