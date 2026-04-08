"use client";

import { useState } from "react";
import { adminDeleteChangeTemplate } from "@/app/actions/admin";

export function DeleteChangeTemplateButton({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (
          !confirm(
            `Delete change template “${slug}”? Only allowed if no tickets use it.`,
          )
        ) {
          return;
        }
        setPending(true);
        try {
          await adminDeleteChangeTemplate({ id });
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
