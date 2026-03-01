"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import CommandBar from "@/components/CommandBar";
import BottomNav from "@/components/BottomNav";
import Toast from "@/components/Toast";

export default function CommandPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <>
      <h1 className="mb-2 text-xl font-bold text-text">Command Bar</h1>
      <p className="mb-6 text-sm text-text-muted">
        Type natural language commands to manage roles quickly
      </p>

      <CommandBar
        guildId={guildId}
        onSuccess={(msg) => setToast({ message: msg, type: "success" })}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <BottomNav guildId={guildId} />
    </>
  );
}
