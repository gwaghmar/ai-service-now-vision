"use client";

import { useEffect } from "react";

const LAST_REQUEST_KEY = "governance_last_request_id";

export function RequestVisitTracker({ requestId }: { requestId: string }) {
  useEffect(() => {
    window.localStorage.setItem(LAST_REQUEST_KEY, requestId);
  }, [requestId]);
  return null;
}
