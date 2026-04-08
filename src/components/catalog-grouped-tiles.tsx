"use client";

import Link from "next/link";
import type { CatalogTileLike } from "@/lib/catalog-categories";
import { groupCatalogTiles } from "@/lib/catalog-categories";

export function CatalogGroupedTiles({ catalog }: { catalog: CatalogTileLike[] }) {
  const groups = groupCatalogTiles(catalog);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No catalog items yet. Ask an admin to add request types.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`catalog-cat-${group.id}`}
          className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <header className="mb-3 border-b border-zinc-200/80 pb-2.5 dark:border-zinc-700/80">
            <h2
              id={`catalog-cat-${group.id}`}
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {group.title}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {group.subtitle}
            </p>
          </header>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/requests/new?typeId=${encodeURIComponent(t.id)}`}
                  className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-950/60 dark:hover:border-zinc-600"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-zinc-700">
                    {t.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t.title}
                  </span>
                  {t.description ? (
                    <span className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {t.description}
                    </span>
                  ) : (
                    <span className="mt-1 text-xs text-zinc-400">Open form</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
