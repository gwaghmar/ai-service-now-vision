"use client";

import { useState } from "react";
import { adminCreateApiKey } from "@/app/actions/admin";

export function CreateApiKeyForm() {
  const [name, setName] = useState("");
  const [allowedSlugs, setAllowedSlugs] = useState("");
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (shownKey) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
          API key created — copy it now. It will not be shown again.
        </p>
        <code className="mt-2 block break-all rounded bg-white px-2 py-1 text-xs dark:bg-zinc-950">
          {shownKey}
        </code>
        <button
          type="button"
          onClick={() => {
            setShownKey(null);
            setName("");
            setAllowedSlugs("");
          }}
          className="mt-3 text-sm underline"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const res = await adminCreateApiKey({ name, allowedSlugs });
          if (res.ok && res.fullKey) setShownKey(res.fullKey);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        }
        setPending(false);
      }}
    >
      <div>
        <label htmlFor="api-key-name" className="text-xs font-medium">
          Label
        </label>
        <input
          id="api-key-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Staging agent"
          className="mt-1 block w-56 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      <div>
        <label htmlFor="api-key-slugs" className="text-xs font-medium">
          Allowed type slugs (comma-separated, optional)
        </label>
        <input
          id="api-key-slugs"
          value={allowedSlugs}
          onChange={(e) => setAllowedSlugs(e.target.value)}
          placeholder="e.g. github_access, aws_sso"
          className="mt-1 block w-64 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Generate key
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
