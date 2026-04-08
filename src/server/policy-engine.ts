import { PolicyDeniedError } from "@/lib/errors";

type PolicyInput = {
  organizationId: string;
  requestTypeSlug: string;
  payload: Record<string, unknown>;
};

/**
 * Optional HTTP policy adapter (OPA / OpenFGA-style sidecar, custom service).
 * POST JSON body; expect 200 + `{ "decision": "allow" | "deny", "reason"?: string }`.
 * On network errors or invalid response, **fails open** (allow) so local dev works.
 */
export async function evaluatePolicyOrThrow(input: PolicyInput) {
  const url = process.env.POLICY_ENGINE_URL?.trim();
  if (!url) return;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        organizationId: input.organizationId,
        requestTypeSlug: input.requestTypeSlug,
        payload: input.payload,
      }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      decision?: string;
      reason?: string;
    };
    if (json.decision === "deny") {
      throw new PolicyDeniedError(json.reason);
    }
  } catch (e) {
    if (e instanceof PolicyDeniedError) throw e;
    console.warn("[policy-engine] evaluation skipped or failed:", e);
  } finally {
    clearTimeout(t);
  }
}
