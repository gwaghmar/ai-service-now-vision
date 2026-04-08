"use client";

import { useState, useTransition } from "react";
import {
  getOrgAiSettingsMasked,
  runOrgAiConnectionTest,
  saveOrgAiSettings,
} from "@/app/actions/ai-org";

type Initial = Awaited<ReturnType<typeof getOrgAiSettingsMasked>>;

export function AiSettingsForm({ initial }: { initial: Initial }) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [defaultModel, setDefaultModel] = useState(initial.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [testPending, startTest] = useTransition();

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Bring your own API key (OpenAI, OpenRouter, Azure OpenAI-compatible).
        Set optional base URL for OpenRouter (
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          https://openrouter.ai/api/v1
        </code>
        ). If no org key is stored, the server can use{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          APP_AI_PLATFORM_API_KEY
        </code>{" "}
        when allowed (dev always; production requires{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          ALLOW_AI_PLATFORM_FALLBACK=true
        </code>
        ).
      </p>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          startTransition(async () => {
            try {
              await saveOrgAiSettings({
                baseUrl: baseUrl || undefined,
                defaultModel,
                apiKey: apiKey.trim() || undefined,
                clearKey,
              });
              setApiKey("");
              setClearKey(false);
              setMsg("Saved.");
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Save failed");
            }
          });
        }}
      >
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Base URL (optional)
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Default: api.openai.com"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Model id
          </label>
          <input
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            API key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              initial.hasStoredKey
                ? "Leave blank to keep existing key"
                : "sk-… or OpenRouter key"
            }
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {initial.keyLastFour ? (
            <p className="mt-1 text-xs text-zinc-500">
              Stored key ends in …{initial.keyLastFour}
            </p>
          ) : null}
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={clearKey}
              onChange={(e) => setClearKey(e.target.checked)}
            />
            Remove stored API key
          </label>
        </div>
        {msg && (
          <p
            className={
              msg === "Saved."
                ? "text-sm text-teal-700 dark:text-teal-300"
                : "text-sm text-red-600 dark:text-red-400"
            }
          >
            {msg}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={testPending}
            onClick={() => {
              setMsg(null);
              startTest(async () => {
                try {
                  const r = await runOrgAiConnectionTest();
                  setMsg(
                    r.ok
                      ? `Test: ${r.message}${r.usedPlatformFallback ? " (platform fallback)" : ""}`
                      : `Test failed: ${r.message}`,
                  );
                } catch (err) {
                  setMsg(
                    err instanceof Error ? err.message : "Connection test failed",
                  );
                }
              });
            }}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            {testPending ? "Testing…" : "Test connection"}
          </button>
        </div>
      </form>
    </div>
  );
}
