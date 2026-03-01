"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import RoleCard from "@/components/RoleCard";
import DuplicateModal from "@/components/DuplicateModal";
import RoleDetail from "@/components/RoleDetail";
import BottomNav from "@/components/BottomNav";
import Toast from "@/components/Toast";
import type { RoleInfo } from "@/lib/types";

export default function GuildRolesPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [duplicateRole, setDuplicateRole] = useState<RoleInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleInfo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RoleInfo | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadRoles = useCallback(() => {
    setLoading(true);
    fetch(`/api/guilds/${guildId}/roles`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRoles(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (role: RoleInfo) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles/${role.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Deleted "${role.name}"`, type: "success" });
        loadRoles();
      } else {
        setToast({ message: data.error || "Failed to delete", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
    setDeleteConfirm(null);
  };

  // Stats
  const hoisted = roles.filter((r) => r.hoist).length;
  const managed = roles.filter((r) => r.managed).length;

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
      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface p-3 text-center">
          <div className="text-xl font-bold text-accent">{roles.length}</div>
          <div className="text-xs text-text-muted">Roles</div>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center">
          <div className="text-xl font-bold text-text">{hoisted}</div>
          <div className="text-xs text-text-muted">Hoisted</div>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center">
          <div className="text-xl font-bold text-text">{managed}</div>
          <div className="text-xs text-text-muted">Managed</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tap-target w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      {/* Role grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRoles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            guildId={guildId}
            onDuplicate={setDuplicateRole}
            onDelete={setDeleteConfirm}
            onSelect={setSelectedRole}
          />
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="py-12 text-center text-text-muted">
          {search ? "No roles match your search" : "No roles found"}
        </div>
      )}

      {/* Modals */}
      {duplicateRole && (
        <DuplicateModal
          role={duplicateRole}
          guildId={guildId}
          onClose={() => setDuplicateRole(null)}
          onSuccess={(msg) => {
            setToast({ message: msg, type: "success" });
            loadRoles();
          }}
          onError={(msg) => setToast({ message: msg, type: "error" })}
        />
      )}

      {selectedRole && (
        <RoleDetail
          role={selectedRole}
          guildId={guildId}
          onClose={() => setSelectedRole(null)}
          onDuplicate={(role) => {
            setSelectedRole(null);
            setDuplicateRole(role);
          }}
          onDelete={(role) => {
            setSelectedRole(null);
            setDeleteConfirm(role);
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-surface p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-text">Delete Role?</h3>
            <p className="mb-6 text-sm text-text-muted">
              This will permanently delete{" "}
              <strong className="text-text">{deleteConfirm.name}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="tap-target flex-1 rounded-xl border border-border py-2.5 text-sm text-text-muted hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="tap-target flex-1 rounded-xl bg-red py-2.5 text-sm font-semibold text-white hover:bg-red/80"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
