"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { finalizeInviteFromToken } from "@/app/actions/ai-org";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null);
  const [inviteLockedEmail, setInviteLockedEmail] = useState(false);
  const errorId = useId();

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/invite/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        orgName?: string;
        expired?: boolean;
      };
      if (cancelled) return;
      if (data.ok && data.email) {
        setEmail(data.email);
        setInviteLockedEmail(true);
        setInviteOrgName(data.orgName ?? null);
      } else if (data.expired) {
        setError("This invite link has expired. Ask your admin for a new one.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {inviteOrgName ? (
            <>
              You&apos;re joining <strong>{inviteOrgName}</strong>. After sign-up
              we&apos;ll attach your account to that organization.
            </>
          ) : (
            <>
              Your account is assigned to the default organization configured for
              this deployment—unless you used an invite link.
            </>
          )}
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
            const res = await authClient.signUp.email({
              name,
              email,
              password,
            });
            setLoading(false);
            if (res.error) {
              setError(res.error.message ?? "Sign up failed");
              return;
            }
            if (inviteToken) {
              try {
                await finalizeInviteFromToken(inviteToken);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? `Account created, but invite failed: ${err.message}`
                    : "Account created, but invite could not be applied.",
                );
                return;
              }
            }
            router.push("/");
            router.refresh();
          }}
        >
          <div>
            <label
              htmlFor="signup-name"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Name
            </label>
            <input
              id="signup-name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor="signup-email"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={inviteLockedEmail}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 read-only:bg-zinc-50 dark:read-only:bg-zinc-900"
            />
          </div>
          <div>
            <label
              htmlFor="signup-password"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
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
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
