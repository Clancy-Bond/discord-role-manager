"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function AdminPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/toggle")
      .then((r) => r.json())
      .then((data) => setEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleDashboard = async () => {
    const newState = !enabled;
    try {
      await fetch("/api/admin/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newState }),
      });
      setEnabled(newState);
    } catch {
      // Toggle failed
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
      <h1 className="mb-2 text-xl font-bold text-text">Admin Settings</h1>
      <p className="mb-6 text-sm text-text-muted">
        Dashboard safety controls
      </p>

      {/* Admin toggle */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text">Dashboard Access</h3>
            <p className="text-sm text-text-muted">
              {enabled
                ? "Dashboard is active and accepting requests"
                : "Dashboard is disabled. All API requests will be blocked."}
            </p>
          </div>
          <button
            onClick={toggleDashboard}
            className={`relative h-8 w-14 rounded-full transition-colors ${
              enabled ? "bg-green" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                enabled ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div
          className={`rounded-lg p-3 text-sm ${
            enabled
              ? "bg-green/10 text-green"
              : "bg-red/10 text-red"
          }`}
        >
          Status: {enabled ? "ENABLED" : "DISABLED"}
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-6">
        <h3 className="mb-2 font-semibold text-text">How it works</h3>
        <ul className="space-y-2 text-sm text-text-muted">
          <li>
            When disabled, all dashboard API routes return a 503 error
          </li>
          <li>
            Your Discord bot slash commands still work independently
          </li>
          <li>
            Toggle back on whenever you need to manage roles
          </li>
          <li>
            For persistent toggle, update the ADMIN_ENABLED environment variable in Vercel
          </li>
        </ul>
      </div>

      <BottomNav guildId={guildId} />
    </>
  );
}
