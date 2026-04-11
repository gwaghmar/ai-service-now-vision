"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/toast";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const nameId = useId();
  const pwErrorId = useId();

  return (
    <div className="space-y-8">
      {/* Name */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">Your display name and email address.</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setNameLoading(true);
            const res = await authClient.updateUser({ name: name.trim() || undefined });
            setNameLoading(false);
            if (res.error) {
              toast(res.error.message ?? "Update failed", "error");
            } else {
              toast("Name updated", "success");
              router.refresh();
            }
          }}
        >
          <div>
            <label
              htmlFor={`${nameId}-name`}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Display name
            </label>
            <input
              id={`${nameId}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              aria-label="Email address (read-only)"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-400">Contact your admin to change your email.</p>
          </div>
          <button
            type="submit"
            disabled={nameLoading}
            aria-busy={nameLoading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {nameLoading ? "Saving…" : "Save name"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section
        className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-describedby={pwError ? pwErrorId : undefined}
      >
        <h2 className="text-base font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Use a strong password of at least 8 characters.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwError(null);
            if (newPassword !== confirmPassword) {
              setPwError("New passwords do not match");
              return;
            }
            if (newPassword.length < 8) {
              setPwError("Password must be at least 8 characters");
              return;
            }
            setPwLoading(true);
            const res = await authClient.changePassword({
              currentPassword,
              newPassword,
              revokeOtherSessions: false,
            });
            setPwLoading(false);
            if (res.error) {
              setPwError(res.error.message ?? "Password change failed");
              toast(res.error.message ?? "Password change failed", "error");
            } else {
              toast("Password updated", "success");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }
          }}
        >
          <div>
            <label
              htmlFor={`${pwErrorId}-current`}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Current password
            </label>
            <input
              id={`${pwErrorId}-current`}
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              aria-invalid={Boolean(pwError)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor={`${pwErrorId}-new`}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              New password
            </label>
            <input
              id={`${pwErrorId}-new`}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={Boolean(pwError)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor={`${pwErrorId}-confirm`}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Confirm new password
            </label>
            <input
              id={`${pwErrorId}-confirm`}
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(pwError)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          {pwError && (
            <p id={pwErrorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
              {pwError}
            </p>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            aria-busy={pwLoading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pwLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
