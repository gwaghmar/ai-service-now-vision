"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteRequestType } from "@/app/actions/admin";
import { useToast } from "@/components/toast";

export function DeleteTypeButton({
  id,
  slug,
  requestCount,
  archived,
}: {
  id: string;
  slug: string;
  requestCount: number;
  archived: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const label = archived
    ? requestCount > 0
      ? "Archived"
      : "Delete permanently"
    : requestCount > 0
      ? "Archive"
      : "Delete";

  if (archived && requestCount > 0) {
    return (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Archived · {requestCount} request{requestCount === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const msg = archived
          ? `Permanently delete request type “${slug}”? This frees the slug.`
          : requestCount > 0
            ? `Archive “${slug}”? It will disappear from the catalog and API, but existing requests stay linked.`
            : `Delete request type “${slug}”? No requests use it yet.`;
        if (!confirm(msg)) return;
        setPending(true);
        try {
          await adminDeleteRequestType({ id });
          toast(`Type "${slug}" ${archived ? "permanently deleted" : requestCount > 0 ? "archived" : "deleted"}`, "success");
          router.refresh();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Action failed", "error");
          setPending(false);
        }
      }}
      className={
        archived
          ? "text-xs text-red-600 underline disabled:opacity-50"
          : requestCount > 0
            ? "text-xs text-amber-700 underline dark:text-amber-400 disabled:opacity-50"
            : "text-xs text-red-600 underline disabled:opacity-50"
      }
    >
      {pending ? "…" : label}
    </button>
  );
}
