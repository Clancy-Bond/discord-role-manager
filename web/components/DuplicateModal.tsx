"use client";

import { useState, useEffect } from "react";
import type { RoleInfo, GroupedChannelsResponse } from "@/lib/types";

interface DuplicateModalProps {
  role: RoleInfo;
  guildId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function DuplicateModal({
  role,
  guildId,
  onClose,
  onSuccess,
  onError,
}: DuplicateModalProps) {
  const [name, setName] = useState(`Copy of ${role.name}`);
  const [count, setCount] = useState(1);
  const [copyMembers, setCopyMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<GroupedChannelsResponse | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");

  // Fetch channels for selective copying
  useEffect(() => {
    fetch(`/api/guilds/${guildId}/channels`)
      .then((r) => r.json())
      .then((data: GroupedChannelsResponse) => {
        setChannels(data);
        // Select all by default
        const allIds = new Set<string>();
        data.categories.forEach((cat) =>
          cat.channels.forEach((ch) => allIds.add(ch.id))
        );
        data.uncategorized.forEach((ch) => allIds.add(ch.id));
        setSelectedChannels(allIds);
      })
      .catch(() => {});
  }, [guildId]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedChannels(new Set());
    } else {
      const allIds = new Set<string>();
      channels?.categories.forEach((cat) =>
        cat.channels.forEach((ch) => allIds.add(ch.id))
      );
      channels?.uncategorized.forEach((ch) => allIds.add(ch.id));
      setSelectedChannels(allIds);
    }
    setSelectAll(!selectAll);
  };

  const toggleChannel = (channelId: string) => {
    const next = new Set(selectedChannels);
    if (next.has(channelId)) {
      next.delete(channelId);
    } else {
      next.add(channelId);
    }
    setSelectedChannels(next);
    // Update selectAll state
    const totalChannels =
      (channels?.categories.reduce(
        (acc, cat) => acc + cat.channels.length,
        0
      ) ?? 0) + (channels?.uncategorized.length ?? 0);
    setSelectAll(next.size === totalChannels);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        count,
        copyMembers,
      };

      // Only send channelIds if not selecting all
      if (!selectAll && selectedChannels.size > 0) {
        body.channelIds = Array.from(selectedChannels);
      }

      const res = await fetch(
        `/api/guilds/${guildId}/roles/${role.id}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        onError(data.error || "Failed to duplicate role");
        return;
      }

      onSuccess(
        `Created ${data.created.length} role(s), copied ${data.channelsCopied} channel override(s)${data.membersCopied > 0 ? `, assigned to ${data.membersCopied} member(s)` : ""}`
      );
      onClose();
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const channelTypeIcon = (type: number) => {
    switch (type) {
      case 0: return "#"; // Text
      case 2: return "🔊"; // Voice
      case 5: return "📢"; // Announcement
      case 13: return "🎭"; // Stage
      case 15: return "💬"; // Forum
      default: return "#";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="bottom-sheet max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-6 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Duplicate Role</h2>
          <button
            onClick={onClose}
            className="tap-target rounded-lg p-1 text-text-muted hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Source role */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-bg p-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: role.color ?? "#99aab5" }}
          />
          <span className="text-sm text-text-muted">
            Duplicating: <strong className="text-text">{role.name}</strong>
          </span>
        </div>

        {/* Name */}
        <label className="mb-1 block text-sm text-text-muted">New Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tap-target mb-4 w-full rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent"
        />

        {/* Count */}
        <label className="mb-1 block text-sm text-text-muted">
          Copies (1-10)
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={count}
          onChange={(e) => setCount(Math.min(10, Math.max(1, +e.target.value)))}
          className="tap-target mb-4 w-full rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent"
        />

        {/* Copy members */}
        <label className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={copyMembers}
            onChange={(e) => setCopyMembers(e.target.checked)}
            className="h-5 w-5 rounded border-border accent-accent"
          />
          <span className="text-sm text-text">Copy member assignments</span>
        </label>

        {/* Channel selector toggle */}
        <button
          onClick={() => setShowChannelPicker(!showChannelPicker)}
          className="tap-target mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text"
        >
          <span>
            Channel permissions:{" "}
            <strong>
              {selectAll
                ? "All channels"
                : `${selectedChannels.size} selected`}
            </strong>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-4 w-4 transition-transform ${showChannelPicker ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Channel picker */}
        {showChannelPicker && channels && (
          <div className="mb-4 max-h-60 overflow-y-auto rounded-xl border border-border bg-bg p-3">
            {/* Select all / none */}
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="text-xs font-medium text-accent"
              >
                {selectAll ? "Deselect All" : "Select All"}
              </button>
              <input
                type="text"
                placeholder="Search channels..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="w-40 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-accent"
              />
            </div>

            {/* Categories */}
            {channels.categories.map((cat) => {
              const filtered = cat.channels.filter((ch) =>
                ch.name.toLowerCase().includes(channelSearch.toLowerCase())
              );
              if (filtered.length === 0) return null;
              return (
                <div key={cat.id} className="mb-2">
                  <div className="mb-1 text-xs font-bold uppercase text-text-muted">
                    {cat.name}
                  </div>
                  {filtered.map((ch) => (
                    <label
                      key={ch.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(ch.id)}
                        onChange={() => toggleChannel(ch.id)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      <span className="text-xs text-text-muted">
                        {channelTypeIcon(ch.type)}
                      </span>
                      <span className="text-sm text-text">{ch.name}</span>
                    </label>
                  ))}
                </div>
              );
            })}

            {/* Uncategorized */}
            {channels.uncategorized.filter((ch) =>
              ch.name.toLowerCase().includes(channelSearch.toLowerCase())
            ).length > 0 && (
              <div className="mb-2">
                <div className="mb-1 text-xs font-bold uppercase text-text-muted">
                  Uncategorized
                </div>
                {channels.uncategorized
                  .filter((ch) =>
                    ch.name.toLowerCase().includes(channelSearch.toLowerCase())
                  )
                  .map((ch) => (
                    <label
                      key={ch.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(ch.id)}
                        onChange={() => toggleChannel(ch.id)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      <span className="text-xs text-text-muted">
                        {channelTypeIcon(ch.type)}
                      </span>
                      <span className="text-sm text-text">{ch.name}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="tap-target mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Duplicating...
            </span>
          ) : (
            `Duplicate${count > 1 ? ` (${count} copies)` : ""}`
          )}
        </button>
      </div>
    </div>
  );
}
