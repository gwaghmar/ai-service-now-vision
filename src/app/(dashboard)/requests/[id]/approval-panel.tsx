"use client";

import { useId, useState } from "react";
import { decideApprovalAction } from "@/app/actions/requests";

export function ApprovalPanel({ requestId }: { requestId: string }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorId = useId();

  async function act(decision: "approved" | "denied" | "needs_info") {
    setError(null);
    setPending(true);
    try {
      await decideApprovalAction({ requestId, decision, comment });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPending(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      aria-labelledby={`approval-actions-${requestId}`}
    >
      <h2 id={`approval-actions-${requestId}`} className="text-sm font-semibold">
        Approver actions
      </h2>
      <label htmlFor={`${errorId}-comment`} className="sr-only">
        Optional comment for approver decision
      </label>
      <textarea
        id={`${errorId}-comment`}
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => act("approved")}
          aria-busy={pending}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => act("denied")}
          aria-busy={pending}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
        >
          Deny
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => act("needs_info")}
          aria-busy={pending}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
        >
          Needs info
        </button>
      </div>
    </section>
  );
}
