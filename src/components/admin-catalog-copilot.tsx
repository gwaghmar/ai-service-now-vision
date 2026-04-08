"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

function messageText(m: { parts?: Array<{ type: string; text?: string }> }) {
  if (!m.parts?.length) return "";
  return m.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

export function AdminCatalogCopilot() {
  const [open, setOpen] = useState(false);
  const dialogTitleId = useId();
  const dialogId = "admin-catalog-copilot-dialog";
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/admin-chat",
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const t = input.trim();
      if (!t) return;
      void sendMessage({ text: t });
      setInput("");
    },
    [input, sendMessage],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={dialogId}
        className="fixed bottom-4 right-4 z-20 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-950 shadow-md dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-100"
      >
        Catalog help
      </button>
      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed bottom-4 right-4 z-30 flex h-[min(28rem,calc(100vh-5rem))] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border border-violet-200 bg-white shadow-xl dark:border-violet-900/50 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <span id={dialogTitleId} className="text-sm font-medium">
              Catalog copilot
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close catalog copilot panel"
              className="text-xs text-zinc-500"
            >
              Close
            </button>
          </div>
          <p className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
            Ask about slugs, fields, risk defaults, or how to structure a new
            intent. Changes still go through the forms below.
          </p>
          <div
            className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm"
            role="log"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-4 rounded-lg bg-violet-50 px-2 py-1 dark:bg-violet-950/40"
                    : "mr-4 rounded-lg border border-zinc-100 px-2 py-1 dark:border-zinc-800"
                }
              >
                <span className="text-[10px] uppercase text-zinc-400">
                  {m.role}
                </span>
                <p className="whitespace-pre-wrap">{messageText(m)}</p>
              </div>
            ))}
            {status === "streaming" && (
              <p className="text-xs text-zinc-400">Thinking…</p>
            )}
            {error && (
              <p className="text-xs text-red-600">
                {/ai_not_configured|503/i.test(String(error.message))
                  ? "AI not configured — Admin → AI."
                  : error.message}
              </p>
            )}
          </div>
          <form
            onSubmit={onSubmit}
            className="border-t border-zinc-200 p-2 dark:border-zinc-800"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask catalog copilot"
              placeholder="Ask about the catalog…"
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={status === "streaming" || status === "submitted"}
              className="mt-2 w-full rounded-lg bg-violet-700 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-violet-600"
            >
              {status === "streaming" || status === "submitted"
                ? "Sending…"
                : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
