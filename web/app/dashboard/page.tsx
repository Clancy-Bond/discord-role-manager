"use client";

import { useState, useEffect } from "react";
import ServerPicker from "@/components/ServerPicker";
import type { GuildInfo } from "@/lib/types";

export default function DashboardPage() {
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guilds")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGuilds(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-text">Select a Server</h1>
      <p className="mb-6 text-sm text-text-muted">
        Choose a server to manage its roles
      </p>
      <ServerPicker guilds={guilds} />
    </div>
  );
}
