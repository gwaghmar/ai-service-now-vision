"use client";

import { useState } from "react";
import { adminRevokeApiKey } from "@/app/actions/admin";

export function RevokeApiKeyButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Revoke this API key? Agents using it will fail immediately.")) {
          return;
        }
        setPending(true);
        await adminRevokeApiKey({ id });
        setPending(false);
        window.location.reload();
      }}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Revoke
    </button>
  );
}
