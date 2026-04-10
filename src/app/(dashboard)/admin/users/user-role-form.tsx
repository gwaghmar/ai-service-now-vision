"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminSetUserRole } from "@/app/actions/admin";

const ROLES = ["requester", "approver", "admin"] as const;

export function UserRoleForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        setPending(true);
        try {
          await adminSetUserRole({ userId, role });
          setMsg("Saved.");
          router.refresh();
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Failed");
        }
        setPending(false);
      }}
    >
      <label htmlFor={`role-${userId}`} className="sr-only">
        Role
      </label>
      <select
        id={`role-${userId}`}
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || role === currentRole}
        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-600"
      >
        Update
      </button>
      {msg && (
        <span
          className={`text-xs ${msg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {msg}
        </span>
      )}
    </form>
  );
}
