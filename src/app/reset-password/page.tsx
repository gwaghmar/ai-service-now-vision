"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const errorId = useId();

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold tracking-tight text-red-600">
          Invalid reset link
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          This link is missing a token. Please request a new reset link.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="underline">
            Request new link
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-lg font-semibold tracking-tight">Set new password</h1>
      <p className="mt-1 text-sm text-zinc-500">Enter and confirm your new password.</p>
      <form
        method="post"
        action="#"
        className="mt-6 space-y-4"
        aria-describedby={error ? errorId : undefined}
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (password !== confirm) {
            setError("Passwords do not match");
            return;
          }
          if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
          }
          setLoading(true);
          const res = await authClient.resetPassword({
            newPassword: password,
            token,
          });
          setLoading(false);
          if (res.error) {
            setError(res.error.message ?? "Reset failed. Link may have expired.");
            return;
          }
          setDone(true);
          setTimeout(() => router.push("/sign-in"), 2000);
        }}
      >
        <div>
          <label
            htmlFor="reset-password"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label
            htmlFor="reset-confirm"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Confirm new password
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        {error && (
          <p
            id={errorId}
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense
        fallback={
          <div className="text-sm text-zinc-500">Loading…</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
