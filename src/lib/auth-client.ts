"use client";

import { createAuthClient } from "better-auth/react";
import { getPublicAppUrl } from "@/lib/env";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined" ? window.location.origin : getPublicAppUrl(),
});
