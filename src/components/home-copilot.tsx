"use client";

import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { requestStatusLabel } from "@/lib/status-labels";

const LAST_REQUEST_KEY = "governance_last_request_id";

export type CopilotRecentTicket = {
  kind: "request" | "change";
  id: string;
  title: string;
  status: string;
};

function messageText(m: { parts?: Array<{ type: string; text?: string }> }) {
  if (!m.parts?.length) return "";
  return m.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

export function HomeCopilot({
  recentTickets,
  onboardingIncomplete,
}: {
  recentTickets: CopilotRecentTicket[];
  onboardingIncomplete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lastRequestHref = useSyncExternalStore(
    () => () => {},
    () => {
      const id = window.localStorage.getItem(LAST_REQUEST_KEY);
      return id ? `/requests/${id}` : null;
    },
    () => null,
  );
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  const [input, setInput] = useState("");
  const dialogTitleId = useId();
  const dialogId = "home-copilot-dialog";

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
        className="fixed bottom-4 right-4 z-20 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-md dark:border-zinc-700 dark:bg-zinc-900"
      >
        Copilot
      </button>
      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed bottom-4 right-4 z-30 flex h-[min(32rem,calc(100vh-5rem))] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <span id={dialogTitleId} className="text-sm font-medium">
              Copilot
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close copilot panel"
              className="text-xs text-zinc-500"
            >
              Close
            </button>
          </div>
          <div
            className="border-b border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800"
            role="navigation"
            aria-label="Copilot quick actions"
          >
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Quick actions
            </p>
            <div className="mt-1 flex flex-col gap-1">
              <Link href="/requests/new" className="text-teal-700 underline dark:text-teal-400">
                New request
              </Link>
              {onboardingIncomplete && (
                <Link href="/onboarding" className="text-teal-700 underline dark:text-teal-400">
                  Resume onboarding
                </Link>
              )}
              <Link href="/requests" className="text-teal-700 underline dark:text-teal-400">
                My requests
              </Link>
              {lastRequestHref && (
                <Link href={lastRequestHref} className="text-teal-700 underline dark:text-teal-400">
                  Where you left off
                </Link>
              )}
            </div>
            {recentTickets.length > 0 && (
              <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  Your recent tickets
                </p>
                <ul className="mt-1 space-y-1">
                  {recentTickets.map((t) => (
                    <li key={`${t.kind}-${t.id}`}>
                      <Link
                        href={
                          t.kind === "request"
                            ? `/requests/${t.id}`
                            : `/changes/${t.id}`
                        }
                        className="line-clamp-2 text-teal-700 underline dark:text-teal-400"
                      >
                        {t.kind === "request" ? "Request" : "Change"}: {t.title}{" "}
                        <span className="text-zinc-500">
                          ({requestStatusLabel(t.status)})
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
                    ? "ml-4 rounded-lg bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
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
                  ? "AI not configured — open Admin → AI."
                  : error.message}
              </p>
            )}
          </div>
          <form onSubmit={onSubmit} className="border-t border-zinc-200 p-2 dark:border-zinc-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask Copilot"
              placeholder="Ask anything…"
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={status === "streaming" || status === "submitted"}
              className="mt-2 w-full rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
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
