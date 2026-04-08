import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { decryptFieldIfNeeded } from "@/lib/field-encryption";

export type GovernanceWebhookEvent =
  | "request.submitted"
  | "request.approved"
  | "provision.started"
  | "provision.succeeded"
  | "provision.failed";

/** Deliver org webhook if configured (best-effort; failures logged only). */
export async function deliverOrgWebhook(input: {
  organizationId: string;
  event: GovernanceWebhookEvent;
  data: Record<string, unknown>;
}) {
  const [org] = await db
    .select({
      webhookUrl: organization.webhookUrl,
      webhookSigningSecret: organization.webhookSigningSecret,
    })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);

  if (!org?.webhookUrl?.trim()) return;

  let secret: string | null = null;
  if (org.webhookSigningSecret) {
    try {
      secret = decryptFieldIfNeeded(org.webhookSigningSecret);
    } catch {
      secret = org.webhookSigningSecret;
    }
  }

  const body = JSON.stringify({
    event: input.event,
    organizationId: input.organizationId,
    ...input.data,
    ts: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ai-governance-webhook/1",
  };

  if (secret) {
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Governance-Signature"] = `sha256=${sig}`;
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12_000);
  try {
    await fetch(org.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: ctrl.signal,
    });
  } catch (e) {
    console.warn("[webhook] delivery failed:", input.event, e);
  } finally {
    clearTimeout(timeout);
  }
}
