import { createHmac, randomUUID } from "crypto";
import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { organization, webhookDelivery } from "@/db/schema";
import { decryptFieldIfNeeded } from "@/lib/field-encryption";
import { assertSafeOutboundHttpUrl } from "@/lib/safe-url";

export type GovernanceWebhookEvent =
  | "request.submitted"
  | "request.approved"
  | "provision.started"
  | "provision.succeeded"
  | "provision.failed";

/** Exponential back-off delays for retry attempts (ms). */
const RETRY_DELAYS_MS = [0, 30_000, 300_000]; // immediate, 30 s, 5 min

function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Enqueue a webhook delivery (durable, retried by cron).
 * Best-effort first attempt happens inline so the caller sees fast success.
 */
export async function deliverOrgWebhook(input: {
  organizationId: string;
  event: GovernanceWebhookEvent;
  data: Record<string, unknown>;
}): Promise<void> {
  const [org] = await db
    .select({
      webhookUrl: organization.webhookUrl,
      webhookSigningSecret: organization.webhookSigningSecret,
    })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);

  if (!org?.webhookUrl?.trim()) return;

  let targetUrl: string;
  try {
    targetUrl = assertSafeOutboundHttpUrl(org.webhookUrl.trim());
  } catch (e) {
    console.warn("[webhook] blocked unsafe destination:", e);
    return;
  }

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

  // Persist delivery record first so it survives server crashes
  const deliveryId = randomUUID();
  await db.insert(webhookDelivery).values({
    id: deliveryId,
    organizationId: input.organizationId,
    event: input.event,
    payload: body,
    targetUrl,
    signingSecret: secret,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    nextRetryAt: new Date(),
  });

  // Attempt immediate inline delivery
  await attemptWebhookDelivery(deliveryId);
}

/** Deliver a single pending webhook delivery row (called inline and by cron). */
export async function attemptWebhookDelivery(deliveryId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(webhookDelivery)
    .where(eq(webhookDelivery.id, deliveryId))
    .limit(1);

  if (!row) return;
  if (row.status === "delivered") return;

  const now = new Date();
  const nextAttempts = row.attempts + 1;

  // Claim the row optimistically
  const claimed = await db
    .update(webhookDelivery)
    .set({ status: "delivering", attempts: nextAttempts, updatedAt: now })
    .where(
      and(
        eq(webhookDelivery.id, deliveryId),
        inArray(webhookDelivery.status, ["pending", "failed"]),
      ),
    )
    .returning({ id: webhookDelivery.id });

  if (claimed.length === 0) return; // already being processed

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ai-governance-webhook/1",
  };
  if (row.signingSecret) {
    headers["X-Governance-Signature"] = signPayload(row.signingSecret, row.payload);
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(row.targetUrl, {
      method: "POST",
      headers,
      body: row.payload,
      signal: ctrl.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    await db
      .update(webhookDelivery)
      .set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() })
      .where(eq(webhookDelivery.id, deliveryId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const exhausted = nextAttempts >= row.maxAttempts;
    const delayMs = RETRY_DELAYS_MS[nextAttempts] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const nextRetryAt = exhausted ? null : new Date(Date.now() + delayMs);

    await db
      .update(webhookDelivery)
      .set({
        status: exhausted ? "failed" : "pending",
        lastError: message.slice(0, 2000),
        nextRetryAt,
        updatedAt: new Date(),
      })
      .where(eq(webhookDelivery.id, deliveryId));

    if (!exhausted) {
      console.warn(`[webhook] delivery ${deliveryId} attempt ${nextAttempts} failed — will retry:`, message);
    } else {
      console.error(`[webhook] delivery ${deliveryId} exhausted after ${nextAttempts} attempts:`, message);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Cron drain: retry all pending/failed deliveries whose next_retry_at is due.
 * Called by the worker route.
 */
export async function drainWebhookRetries(limit: number): Promise<{
  delivered: number;
  failed: number;
  errors: number;
}> {
  const now = new Date();
  const candidates = await db
    .select({ id: webhookDelivery.id })
    .from(webhookDelivery)
    .where(
      and(
        inArray(webhookDelivery.status, ["pending", "failed"]),
        or(isNull(webhookDelivery.nextRetryAt), lte(webhookDelivery.nextRetryAt, now)),
      ),
    )
    .orderBy(asc(webhookDelivery.createdAt))
    .limit(limit);

  let delivered = 0;
  let failed = 0;
  let errors = 0;

  for (const { id } of candidates) {
    try {
      await attemptWebhookDelivery(id);
      // Re-read final status
      const [row] = await db
        .select({ status: webhookDelivery.status })
        .from(webhookDelivery)
        .where(eq(webhookDelivery.id, id))
        .limit(1);
      if (row?.status === "delivered") delivered++;
      else if (row?.status === "failed") failed++;
    } catch {
      errors++;
    }
  }

  return { delivered, failed, errors };
}
