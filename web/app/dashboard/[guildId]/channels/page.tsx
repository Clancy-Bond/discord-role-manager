"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import type { GroupedChannelsResponse, RoleInfo } from "@/lib/types";
import { PermissionFlagsBits } from "discord-api-types/v10";

function getPermissionNames(bitfield: string): string[] {
  const bits = BigInt(bitfield);
  const names: string[] = [];
  for (const [name, flag] of Object.entries(PermissionFlagsBits)) {
    if ((bits & flag) === flag) {
      names.push(name);
    }
  }
  return names;
}

export default function ChannelsPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const [channels, setChannels] = useState<GroupedChannelsResponse | null>(null);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/channels`).then((r) => r.json()),
      fetch(`/api/guilds/${guildId}/roles`).then((r) => r.json()),
    ])
      .then(([chData, roleData]) => {
        if (chData.categories) setChannels(chData);
        if (Array.isArray(roleData)) setRoles(roleData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const channelTypeIcon = (type: number) => {
    switch (type) {
      case 0: return "#";
      case 2: return "🔊";
      case 5: return "📢";
      case 13: return "🎭";
      case 15: return "💬";
      default: return "#";
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex min-h-[50dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <BottomNav guildId={guildId} />
      </>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-xl font-bold text-text">Channel Permissions</h1>
      <p className="mb-4 text-sm text-text-muted">
        View role permission overrides per channel
      </p>

      {/* Role filter */}
      <select
        value={selectedRoleId}
        onChange={(e) => setSelectedRoleId(e.target.value)}
        className="tap-target mb-4 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-accent"
      >
        <option value="">All roles</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      {/* Channel list */}
      {channels && (
        <div className="space-y-4">
          {channels.categories.map((cat) => (
            <details key={cat.id} className="rounded-xl border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-bold uppercase text-text-muted">
                {cat.name}{" "}
                <span className="font-normal">
                  ({cat.channels.length} channels)
                </span>
              </summary>
              <div className="space-y-1 px-2 pb-2">
                {cat.channels.map((ch) => {
                  const relevantOverwrites = selectedRoleId
                    ? ch.overwrites.filter((ow) => ow.id === selectedRoleId)
                    : ch.overwrites.filter((ow) =>
                        roles.some((r) => r.id === ow.id)
                      );

                  return (
                    <details key={ch.id} className="rounded-lg bg-bg">
                      <summary className="cursor-pointer px-3 py-2 text-sm text-text">
                        <span className="mr-1 text-text-muted">
                          {channelTypeIcon(ch.type)}
                        </span>
                        {ch.name}
                        {relevantOverwrites.length > 0 && (
                          <span className="ml-2 text-xs text-accent">
                            {relevantOverwrites.length} override
                            {relevantOverwrites.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </summary>
                      <div className="space-y-2 px-3 pb-3">
                        {relevantOverwrites.length === 0 ? (
                          <p className="text-xs text-text-muted">
                            No permission overrides
                          </p>
                        ) : (
                          relevantOverwrites.map((ow) => {
                            const role = roles.find((r) => r.id === ow.id);
                            const allowed = getPermissionNames(ow.allow);
                            const denied = getPermissionNames(ow.deny);

                            return (
                              <div key={ow.id} className="rounded-lg border border-border p-2">
                                <div className="mb-1 flex items-center gap-2">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{
                                      backgroundColor: role?.color ?? "#99aab5",
                                    }}
                                  />
                                  <span className="text-xs font-semibold text-text">
                                    {role?.name ?? "Unknown Role"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {allowed.map((p) => (
                                    <span
                                      key={`a-${p}`}
                                      className="perm-allow rounded-md px-1.5 py-0.5 text-[10px]"
                                    >
                                      {p.replace(/([A-Z])/g, " $1").trim()}
                                    </span>
                                  ))}
                                  {denied.map((p) => (
                                    <span
                                      key={`d-${p}`}
                                      className="perm-deny rounded-md px-1.5 py-0.5 text-[10px]"
                                    >
                                      {p.replace(/([A-Z])/g, " $1").trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          ))}

          {channels.uncategorized.length > 0 && (
            <details className="rounded-xl border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-bold uppercase text-text-muted">
                Uncategorized ({channels.uncategorized.length})
              </summary>
              <div className="space-y-1 px-2 pb-2">
                {channels.uncategorized.map((ch) => (
                  <div key={ch.id} className="rounded-lg bg-bg px-3 py-2 text-sm text-text">
                    <span className="mr-1 text-text-muted">
                      {channelTypeIcon(ch.type)}
                    </span>
                    {ch.name}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <BottomNav guildId={guildId} />
    </>
  );
}
