"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateInvite } from "@/app/actions/ai-org";
import { useToast } from "@/components/toast";
import { getPublicAppUrl } from "@/lib/env";

type Role = "requester" | "approver" | "admin";

export function InviteForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("requester");
  const [sendEmail, setSendEmail] = useState(true);
  const [pending, setPending] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formId = useId();
  const errorId = `${formId}-error`;
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        aria-describedby={error ? errorId : undefined}
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLastUrl(null);
          setPending(true);
          try {
            const res = await adminCreateInvite({ email, role, sendEmail });
            setLastUrl(res.signupUrl);
            setEmail("");
            toast(
              sendEmail
                ? `Invite sent to ${email}`
                : `Invite link generated for ${email}`,
              "success",
            );
            router.refresh();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to create invite";
            setError(msg);
            toast(msg, "error");
          } finally {
            setPending(false);
          }
        }}
      >
        <h2 className="text-sm font-semibold">Create invite</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-email`} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email address
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-role`} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Role
            </label>
            <select
              id={`${formId}-role`}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="requester">Requester</option>
              <option value="approver">Approver</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Send email invite automatically
        </label>
        {error && (
          <p id={errorId} className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Create invite"}
        </button>
      </form>

      {lastUrl && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Invite link ready</p>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
            Share this link with the invitee. It expires in 14 days.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-emerald-200 bg-white px-2 py-1 text-xs dark:border-emerald-800 dark:bg-zinc-900">
              {lastUrl}
            </code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(lastUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
