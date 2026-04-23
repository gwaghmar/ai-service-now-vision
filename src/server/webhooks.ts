import { createHmac, randomUUID } from "crypto";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { organization, webhookDelivery } from "@/db/schema";
import { decryptFieldIfNeeded } from "@/lib/field-encryption";
import { assertSafeOutboundHttpUrl } from "@/lib/safe-url";
import { recordAuditEvent } from "@/server/audit";

export type GovernanceWebhookEvent =
  | "request.submitted"
  | "request.approved"
  | "request.emergency_approved"
  | "provision.started"
  | "provision.succeeded"
  | "provision.failed"
  | "provision.revocation_started"
  | "provision.revocation_failed"
  | "provision.revoked";

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
    .returning();

  if (claimed.length === 0) return; // already being processed

  await executeWebhookDelivery(claimed[0]);
}

/** Execute a claimed webhook row */
async function executeWebhookDelivery(row: typeof webhookDelivery.$inferSelect): Promise<void> {
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
      .where(eq(webhookDelivery.id, row.id));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const exhausted = row.attempts >= row.maxAttempts;
    const delayMs = RETRY_DELAYS_MS[row.attempts] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const nextRetryAt = exhausted ? null : new Date(Date.now() + delayMs);

    await db
      .update(webhookDelivery)
      .set({
        status: exhausted ? "failed" : "pending",
        lastError: message.slice(0, 2000),
        nextRetryAt,
        updatedAt: new Date(),
      })
      .where(eq(webhookDelivery.id, row.id));

    if (!exhausted) {
      console.warn(`[webhook] delivery ${row.id} attempt ${row.attempts} failed — will retry:`, message);
    } else {
      console.error(`[webhook] delivery ${row.id} exhausted after ${row.attempts} attempts:`, message);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Cron drain: retry all pending/failed deliveries whose next_retry_at is due.
 * Uses database locking (SKIP LOCKED) for safe concurrent fetching.
 */
export async function drainWebhookRetries(limit: number): Promise<{
  delivered: number;
  failed: number;
  errors: number;
}> {
  const now = new Date();

  // RLY-04: distributed locks guarantee concurrent workers don't steal same subsets
  const claimed = await db.transaction(async (tx) => {
    const candidates = await tx
      .select({ id: webhookDelivery.id })
      .from(webhookDelivery)
      .where(
        and(
          inArray(webhookDelivery.status, ["pending", "failed"]),
          or(isNull(webhookDelivery.nextRetryAt), lte(webhookDelivery.nextRetryAt, now)),
        ),
      )
      .orderBy(asc(webhookDelivery.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });

    if (candidates.length === 0) return [];

    const ids = candidates.map(c => c.id);

    return tx.update(webhookDelivery)
      .set({
        status: "delivering",
        attempts: sql`${webhookDelivery.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(inArray(webhookDelivery.id, ids))
      .returning();
  });

  let delivered = 0;
  let failed = 0;
  let errors = 0;

  for (const row of claimed) {
    try {
      await executeWebhookDelivery(row);
      
      // Re-read final status
      const [finalRow] = await db
        .select({ status: webhookDelivery.status })
        .from(webhookDelivery)
        .where(eq(webhookDelivery.id, row.id))
        .limit(1);
        
      if (finalRow?.status === "delivered") delivered++;
      else if (finalRow?.status === "failed") failed++;
    } catch {
      errors++;
    }
  }

  return { delivered, failed, errors };
}
