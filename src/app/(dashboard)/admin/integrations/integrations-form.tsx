"use client";

import { useState, useTransition } from "react";
import { adminUpdateOrgWebhooks, adminUpdateSlackTeamId } from "@/app/actions/admin";

export function IntegrationsForm({ initialUrl, initialSlackTeamId }: { initialUrl: string; initialSlackTeamId: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [secret, setSecret] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [slackTeamId, setSlackTeamId] = useState(initialSlackTeamId);
  const [slackMsg, setSlackMsg] = useState<string | null>(null);
  const [slackPending, startSlackTransition] = useTransition();

  return (<>
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
      {msg ? (
        <p
          className={`text-sm ${msg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {msg}
        </p>
      ) : null}
    </form>

    <form
      className="mt-8 max-w-lg space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-700"
      onSubmit={(e) => {
        e.preventDefault();
        setSlackMsg(null);
        startSlackTransition(async () => {
          try {
            const result = await adminUpdateSlackTeamId({ slackTeamId });
            if (!result.ok) {
              setSlackMsg(result.error);
            } else {
              setSlackMsg("Saved.");
            }
          } catch (err) {
            setSlackMsg(err instanceof Error ? err.message : "Save failed");
          }
        });
      }}
    >
      <h2 className="text-base font-semibold tracking-tight">Slack Integration</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Map your Slack workspace to this organization so the{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">/request</code>{" "}
        slash command resolves to the correct tenant.
      </p>
      <div>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Slack Team ID
        </label>
        <input
          name="slackTeamId"
          value={slackTeamId}
          onChange={(e) => setSlackTeamId(e.target.value)}
          placeholder="T0123ABCDEF"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Find your Slack Team ID in your workspace URL or via the Slack API.
          Leave blank to remove the mapping.
        </p>
      </div>
      <button
        type="submit"
        disabled={slackPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {slackPending ? "Saving…" : "Save Slack settings"}
      </button>
      {slackMsg ? (
        <p
          className={`text-sm ${slackMsg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {slackMsg}
        </p>
      ) : null}
    </form>
  </>);
}
