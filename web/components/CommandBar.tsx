"use client";

import { useState } from "react";
import type { CommandAction } from "@/lib/types";

interface CommandBarProps {
  guildId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function CommandBar({
  guildId,
  onSuccess,
  onError,
}: CommandBarProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<CommandAction | null>(null);
  const [executing, setExecuting] = useState(false);

  const parseCommand = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setAction(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, guildId }),
      });
      const data = await res.json();

      if (!res.ok) {
        onError(data.error || "Failed to parse command");
        return;
      }

      setAction(data.action);
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!action) return;
    setExecuting(true);

    try {
      let res: Response;

      switch (action.type) {
        case "duplicate": {
          const body: Record<string, unknown> = {};
          if (action.params.newName) body.name = action.params.newName;
          if (action.params.count) body.count = action.params.count;
          if (action.params.copyMembers) body.copyMembers = true;
          if (action.params.channelIds) body.channelIds = action.params.channelIds;

          res = await fetch(
            `/api/guilds/${guildId}/roles/${action.params.sourceRoleId}/duplicate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );
          const dupData = await res.json();
          if (res.ok) {
            onSuccess(
              `Created ${dupData.created.length} role(s), copied ${dupData.channelsCopied} channel override(s)`
            );
          } else {
            onError(dupData.error || "Failed to duplicate");
          }
          break;
        }

        case "delete": {
          res = await fetch(
            `/api/guilds/${guildId}/roles/${action.params.roleId}`,
            { method: "DELETE" }
          );
          const delData = await res.json();
          if (res.ok) {
            onSuccess(`Deleted role "${action.params.roleName}"`);
          } else {
            onError(delData.error || "Failed to delete");
          }
          break;
        }

        case "edit": {
          const editBody: Record<string, unknown> = {};
          if (action.params.newName) editBody.name = action.params.newName;
          if (action.params.color !== undefined)
            editBody.color = action.params.color;

          res = await fetch(
            `/api/guilds/${guildId}/roles/${action.params.roleId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(editBody),
            }
          );
          const editData = await res.json();
          if (res.ok) {
            onSuccess(`Updated role "${action.params.roleName}"`);
          } else {
            onError(editData.error || "Failed to edit");
          }
          break;
        }

        default:
          onError("This action type is not executable yet");
      }
    } catch {
      onError("Network error");
    } finally {
      setExecuting(false);
      setAction(null);
      setInput("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && parseCommand()}
          placeholder='Try: "duplicate Admin to channels general, trading"'
          className="tap-target flex-1 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <button
          onClick={parseCommand}
          disabled={loading || !input.trim()}
          className="tap-target rounded-xl bg-accent px-4 font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
          ) : (
            "Go"
          )}
        </button>
      </div>

      {/* Action confirmation card */}
      {action && action.type !== "unknown" && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="mb-2 text-sm font-semibold text-accent">
            Confirm Action
          </div>
          <p className="mb-4 text-sm text-text">{action.description}</p>
          <div className="flex gap-2">
            <button
              onClick={executeAction}
              disabled={executing}
              className="tap-target flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {executing ? "Executing..." : "Confirm"}
            </button>
            <button
              onClick={() => setAction(null)}
              className="tap-target rounded-xl border border-border px-4 py-2.5 text-sm text-text-muted hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Unknown command feedback */}
      {action && action.type === "unknown" && (
        <div className="rounded-xl border border-yellow/30 bg-yellow/5 p-4">
          <p className="text-sm text-yellow">{action.description}</p>
        </div>
      )}

      {/* Examples */}
      <div className="space-y-1 text-xs text-text-muted">
        <p className="font-semibold">Examples:</p>
        <p>&quot;duplicate Admin role&quot;</p>
        <p>&quot;copy Moderator to channels general, alerts, trading&quot;</p>
        <p>&quot;delete Test Role&quot;</p>
        <p>&quot;rename VIP to Premium&quot;</p>
        <p>&quot;info about Admin&quot;</p>
      </div>
    </div>
  );
}
