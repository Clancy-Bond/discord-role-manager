"use client";

import { useState } from "react";
import type { RoleInfo } from "@/lib/types";

interface RoleCardProps {
  role: RoleInfo;
  guildId: string;
  onDuplicate: (role: RoleInfo) => void;
  onDelete: (role: RoleInfo) => void;
  onSelect: (role: RoleInfo) => void;
}

export default function RoleCard({
  role,
  guildId,
  onDuplicate,
  onDelete,
  onSelect,
}: RoleCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="group relative rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/30 hover:bg-surface-hover active:scale-[0.98]"
      onClick={() => onSelect(role)}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className="h-4 w-4 flex-shrink-0 rounded-full"
          style={{
            backgroundColor: role.color ?? "#99aab5",
          }}
        />
        <h3 className="flex-1 truncate font-semibold text-text">{role.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="tap-target flex items-center justify-center rounded-lg p-1 text-text-muted hover:bg-border hover:text-text"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
        <span>Pos: {role.position}</span>
        {role.color && (
          <span className="font-mono">{role.color}</span>
        )}
        <span>{role.permissionNames.length} perms</span>
      </div>

      {/* Badges */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {role.hoist && (
          <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
            Hoisted
          </span>
        )}
        {role.mentionable && (
          <span className="rounded-md bg-green/10 px-2 py-0.5 text-xs text-green">
            Mentionable
          </span>
        )}
        {role.managed && (
          <span className="rounded-md bg-yellow/10 px-2 py-0.5 text-xs text-yellow">
            Managed
          </span>
        )}
      </div>

      {/* Action buttons dropdown */}
      {showActions && (
        <div
          className="absolute right-2 top-12 z-10 min-w-[140px] rounded-xl border border-border bg-surface p-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onDuplicate(role);
              setShowActions(false);
            }}
            className="tap-target flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Duplicate
          </button>
          <button
            onClick={() => {
              onSelect(role);
              setShowActions(false);
            }}
            className="tap-target flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Details
          </button>
          {!role.managed && (
            <button
              onClick={() => {
                onDelete(role);
                setShowActions(false);
              }}
              className="tap-target flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red hover:bg-red/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
