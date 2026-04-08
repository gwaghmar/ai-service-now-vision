"use client";

import { useState, useTransition } from "react";
import { adminUpdateOrgWebhooks } from "@/app/actions/admin";

export function IntegrationsForm({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [secret, setSecret] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
          try {
            await adminUpdateOrgWebhooks({
              webhookUrl: url,
              webhookSigningSecret: secret,
              clearSecret,
            });
            setSecret("");
            setClearSecret(false);
            setMsg("Saved.");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Save failed");
          }
        });
      }}
    >
      <div>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Webhook URL
        </label>
        <input
          name="webhookUrl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/…"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Signing secret (optional)
        </label>
        <input
          type="password"
          name="webhookSigningSecret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Leave blank to keep existing"
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={clearSecret}
            onChange={(e) => setClearSecret(e.target.checked)}
          />
          Remove stored signing secret
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        When{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">FIELD_ENCRYPTION_KEY</code>{" "}
        is set, new secrets are encrypted at rest (app-level envelope; swap for
        KMS in production — see <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">src/lib/kms-envelope.ts</code>).
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save webhooks"}
      </button>
      {msg ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{msg}</p> : null}
    </form>
  );
}
