"use client";

import { useState, useTransition } from "react";
import { generateApproverSummaryAction } from "@/app/actions/ai-approver-summary";

export function ApproverSummaryPanel({ requestId }: { requestId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-xl border border-cyan-200/80 bg-cyan-50/50 p-5 dark:border-cyan-900/40 dark:bg-cyan-950/20">
      <h2 className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">
        AI review summary
      </h2>
      <p className="mt-1 text-xs text-cyan-900/80 dark:text-cyan-200/80">
        Short bullets to speed up review—not a decision. You still approve or
        deny based on policy.
      </p>
      {summary ? (
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-cyan-200/60 bg-white/80 px-3 py-2 text-sm text-zinc-800 dark:border-cyan-900/50 dark:bg-zinc-950/60 dark:text-zinc-200">
          {summary}
        </div>
      ) : null}
      {msg && (
        <p
          className={
            summary
              ? "mt-2 text-xs text-zinc-500 dark:text-zinc-400"
              : "mt-2 text-sm text-red-600 dark:text-red-400"
          }
        >
          {msg}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setSummary(null);
          startTransition(async () => {
            const r = await generateApproverSummaryAction({ requestId });
            if (r.ok) {
              setSummary(r.summary);
              setMsg(
                r.usedPlatformFallback
                  ? "This used the platform fallback API key (see audit export)."
                  : null,
              );
            } else {
              setMsg(r.error);
            }
          });
        }}
        className="mt-3 rounded-lg bg-cyan-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-cyan-700"
      >
        {pending ? "Generating…" : summary ? "Regenerate" : "Generate summary"}
      </button>
    </section>
  );
}
