"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function RequestsHubSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [value, setValue] = useState(qParam);

  useEffect(() => {
    setValue(qParam);
  }, [qParam]);

  const replaceQuery = useCallback(
    (next: string) => {
      const t = next.trim();
      const url = t ? `/requests?q=${encodeURIComponent(t)}` : "/requests";
      router.replace(url, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (pathname !== "/requests") return;
    const handle = setTimeout(() => {
      if (value.trim() !== qParam.trim()) replaceQuery(value);
    }, 200);
    return () => clearTimeout(handle);
  }, [value, qParam, pathname, replaceQuery]);

  if (pathname !== "/requests") return null;

  return (
    <div className="flex min-w-[14rem] max-w-md flex-1 basis-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 sm:basis-auto dark:border-zinc-700 dark:bg-zinc-950">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Search your requests</span>
        <input
          type="search"
          aria-label="Search requests"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search requests by ID, type, status, approver…"
          autoComplete="off"
          className="w-full border-0 bg-transparent px-1 text-sm placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500"
        />
      </label>
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear request search"
          className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
