"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getPublicAppName } from "@/lib/env";

const appName = getPublicAppName();

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorId = useId();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {appName} — sign in with email and password.
        </p>
        <form
          method="post"
          action="#"
          className="mt-6 space-y-4"
          aria-describedby={error ? errorId : undefined}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const res = await authClient.signIn.email({
              email,
              password,
            });
            setLoading(false);
            if (res.error) {
              setError(res.error.message ?? "Sign in failed");
              return;
            }
            router.push("/");
            router.refresh();
          }}
        >
          <div>
            <label
              htmlFor="signin-email"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor="signin-password"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          No account?{" "}
          <Link href="/sign-up" className="underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
