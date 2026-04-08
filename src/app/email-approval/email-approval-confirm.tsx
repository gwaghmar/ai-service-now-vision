"use client";

import { useId, useState } from "react";

export function EmailApprovalConfirm({
  token,
  isApprove,
  typeTitle,
  requesterLine,
  extraLines,
}: {
  token: string;
  isApprove: boolean;
  typeTitle: string;
  requesterLine: string;
  extraLines: string[];
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "err">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");
  const errorId = useId();

  async function submit() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/approvals/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatus("err");
        setMessage(data.error ?? "Request failed");
        return;
      }
      setStatus("done");
      setMessage("Your decision was recorded. You can close this tab.");
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm text-emerald-800 dark:text-emerald-200">{message}</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <strong className="text-zinc-900 dark:text-zinc-100">{typeTitle}</strong>
      </p>
      <p className="text-sm">{requesterLine}</p>
      {extraLines.map((line) => (
        <p key={line} className="text-sm text-zinc-600 dark:text-zinc-400">
          {line}
        </p>
      ))}
      {status === "err" ? (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        aria-describedby={status === "err" ? errorId : undefined}
        onClick={() => void submit()}
        className={
          !isApprove
            ? "rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-red-950/40"
            : "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        }
      >
        {status === "loading"
          ? "Working…"
          : isApprove
            ? "Confirm approval"
            : "Confirm decline"}
      </button>
    </div>
  );
}
