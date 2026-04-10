"use client";

import { useState } from "react";

const MAX_RANGE_DAYS = 90;

function toIsoDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function AuditExportClient() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toIsoDateInput(d);
  });
  const [to, setTo] = useState(() => toIsoDateInput(new Date()));

  const days = daysBetween(from, to);
  const rangeError =
    days < 0
      ? "Start date must be before end date."
      : days > MAX_RANGE_DAYS
        ? `Range is ${days} days — maximum is ${MAX_RANGE_DAYS}. Split into smaller exports.`
        : null;

  const csvHref = `/api/admin/audit-export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const pdfHref = `/api/admin/audit-pdf?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          From (UTC date)
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          To (UTC date)
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      {rangeError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {rangeError}
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Exporting {days} day{days === 1 ? "" : "s"} of audit data (max {MAX_RANGE_DAYS} days per export).
          Uses your signed-in session cookie — open links in the same browser.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <a
          href={rangeError ? "#" : csvHref}
          aria-disabled={!!rangeError}
          onClick={rangeError ? (e) => e.preventDefault() : undefined}
          className={`inline-flex rounded-lg px-4 py-2 text-sm font-medium ${rangeError ? "cursor-not-allowed bg-zinc-300 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-500" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"}`}
        >
          Download CSV
        </a>
        <a
          href={rangeError ? "#" : pdfHref}
          aria-disabled={!!rangeError}
          onClick={rangeError ? (e) => e.preventDefault() : undefined}
          className={`inline-flex rounded-lg border px-4 py-2 text-sm font-medium ${rangeError ? "cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700" : "border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:text-zinc-100"}`}
        >
          Download PDF evidence
        </a>
      </div>
    </div>
  );
}
