"use client";

import { useState, useEffect } from "react";
import type { RoleInfo, GroupedChannelsResponse } from "@/lib/types";
import { PermissionFlagsBits } from "discord-api-types/v10";

interface RoleDetailProps {
  role: RoleInfo;
  guildId: string;
  onClose: () => void;
  onDuplicate: (role: RoleInfo) => void;
  onDelete: (role: RoleInfo) => void;
}

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

export default function RoleDetail({
  role,
  guildId,
  onClose,
  onDuplicate,
  onDelete,
}: RoleDetailProps) {
  const [channels, setChannels] = useState<GroupedChannelsResponse | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/channels`)
      .then((r) => r.json())
      .then(setChannels)
      .catch(() => {});
  }, [guildId]);

  const permNames = role.permissionNames.length > 0
    ? role.permissionNames
    : getPermissionNames(role.permissions);

  // Find channels where this role has overrides
  const getOverwritesForRole = (roleId: string) => {
    if (!channels) return [];
    const results: { categoryName: string; channelName: string; channelType: number; allow: string[]; deny: string[] }[] = [];

    const processChannels = (chList: typeof channels.uncategorized, catName: string) => {
      for (const ch of chList) {
        const ow = ch.overwrites.find((o) => o.id === roleId);
        if (ow && (ow.allow !== "0" || ow.deny !== "0")) {
          results.push({
            categoryName: catName,
            channelName: ch.name,
            channelType: ch.type,
            allow: getPermissionNames(ow.allow),
            deny: getPermissionNames(ow.deny),
          });
        }
      }
    };

    channels.categories.forEach((cat) => processChannels(cat.channels, cat.name));
    processChannels(channels.uncategorized, "Uncategorized");
    return results;
  };

  const channelOverwrites = getOverwritesForRole(role.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="bottom-sheet max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-6 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-5 w-5 rounded-full"
              style={{ backgroundColor: role.color ?? "#99aab5" }}
            />
            <h2 className="text-lg font-bold text-text">{role.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="tap-target rounded-lg p-1 text-text-muted hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Role info grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-bg p-3">
            <div className="text-xs text-text-muted">Position</div>
            <div className="font-semibold text-text">{role.position}</div>
          </div>
          <div className="rounded-lg bg-bg p-3">
            <div className="text-xs text-text-muted">Color</div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: role.color ?? "#99aab5" }}
              />
              <span className="font-mono text-sm text-text">
                {role.color ?? "None"}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-bg p-3">
            <div className="text-xs text-text-muted">Hoisted</div>
            <div className="font-semibold text-text">
              {role.hoist ? "Yes" : "No"}
            </div>
          </div>
          <div className="rounded-lg bg-bg p-3">
            <div className="text-xs text-text-muted">Mentionable</div>
            <div className="font-semibold text-text">
              {role.mentionable ? "Yes" : "No"}
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-text-muted">
            Server Permissions ({permNames.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {permNames.map((perm) => (
              <span key={perm} className="perm-allow rounded-md px-2 py-1 text-xs">
                {perm.replace(/([A-Z])/g, " $1").trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Channel overrides */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-text-muted">
            Channel Overrides ({channelOverwrites.length})
          </h3>
          {channelOverwrites.length === 0 ? (
            <p className="text-xs text-text-muted">
              {channels ? "No channel-specific permissions" : "Loading..."}
            </p>
          ) : (
            <div className="space-y-1">
              {channelOverwrites.map((ow, i) => (
                <details key={i} className="rounded-lg bg-bg">
                  <summary className="cursor-pointer px-3 py-2 text-sm text-text hover:bg-surface-hover">
                    <span className="text-text-muted">
                      {ow.channelType === 2 ? "🔊" : "#"}
                    </span>{" "}
                    {ow.channelName}
                    <span className="ml-2 text-xs text-text-muted">
                      {ow.allow.length > 0 && (
                        <span className="text-green">{ow.allow.length} allowed</span>
                      )}
                      {ow.allow.length > 0 && ow.deny.length > 0 && ", "}
                      {ow.deny.length > 0 && (
                        <span className="text-red">{ow.deny.length} denied</span>
                      )}
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {ow.allow.map((p) => (
                      <span key={`a-${p}`} className="perm-allow rounded-md px-2 py-0.5 text-xs">
                        {p.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    ))}
                    {ow.deny.map((p) => (
                      <span key={`d-${p}`} className="perm-deny rounded-md px-2 py-0.5 text-xs">
                        {p.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Created at */}
        <div className="mb-6 text-xs text-text-muted">
          Created: {new Date(role.createdAt).toLocaleDateString()}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onDuplicate(role)}
            className="tap-target flex-1 rounded-xl bg-accent py-3 font-semibold text-white hover:bg-accent-hover"
          >
            Duplicate
          </button>
          {!role.managed && (
            <button
              onClick={() => onDelete(role)}
              className="tap-target rounded-xl border border-red/30 px-6 py-3 font-semibold text-red hover:bg-red/10"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
