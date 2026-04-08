"use client";

import { useState } from "react";
import { adminDeleteRequestType } from "@/app/actions/admin";

export function DeleteTypeButton({ id, slug }: { id: string; slug: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (
          !confirm(`Delete request type “${slug}”? Only allowed if no requests use it.`)
        ) {
          return;
        }
        setPending(true);
        try {
          await adminDeleteRequestType({ id });
          window.location.reload();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Delete failed");
          setPending(false);
        }
      }}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
