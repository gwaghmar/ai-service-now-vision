"use client";

import { useState } from "react";

function toIsoDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AuditExportClient() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toIsoDateInput(d);
  });
  const [to, setTo] = useState(() => toIsoDateInput(new Date()));

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
      <p className="text-xs text-zinc-500">
        Export uses the signed-in session cookie. Open the link in the same
        browser.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={csvHref}
          className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Download CSV
        </a>
        <a
          href={pdfHref}
          className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-600 dark:text-zinc-100"
        >
          Download PDF evidence
        </a>
      </div>
    </div>
  );
}
