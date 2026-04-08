"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      Sign out
    </button>
  );
}
