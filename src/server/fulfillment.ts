import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  request as requestTable,
  requestType as requestTypeTable,
} from "@/db/schema";
import { getConnector } from "@/server/connectors/registry";
import type { ProvisionContext } from "@/server/connectors/types";
import { recordAuditEvent } from "@/server/audit";
import { deliverOrgWebhook } from "@/server/webhooks";

export type ProvisionInput = {
  requestId: string;
  organizationId: string;
  actorId: string | null;
};

/** Load request + type for connector runs. */
export async function loadProvisionContext(
  input: ProvisionInput,
): Promise<ProvisionContext | null> {
  const [row] = await db
    .select({ req: requestTable, rt: requestTypeTable })
    .from(requestTable)
    .innerJoin(
      requestTypeTable,
      eq(requestTable.requestTypeId, requestTypeTable.id),
    )
    .where(eq(requestTable.id, input.requestId))
    .limit(1);

  if (!row) return null;
  if (row.req.organizationId !== input.organizationId) return null;

  return {
    requestId: row.req.id,
    organizationId: row.req.organizationId,
    actorId: input.actorId,
    requestTypeSlug: row.rt.slug,
    requestTypeTitle: row.rt.title,
    payload: row.req.payload,
    requestStatus: row.req.status,
  };
}

export async function runProvisionWithConnector(input: ProvisionInput) {
  const ctx = await loadProvisionContext(input);
  if (!ctx) {
    throw new Error("Request not found or organization mismatch");
  }
  const connector = getConnector();
  await connector.provision(ctx);
}

/**
 * Shared lifecycle: outbound webhooks + audit + work + mark fulfilled + success audit.
 */
export async function withProvisionLifecycle(
  ctx: ProvisionContext,
  startedMetadata: Record<string, unknown>,
  work: () => Promise<void>,
): Promise<void> {
  const { requestId, organizationId, actorId } = ctx;

  void deliverOrgWebhook({
    organizationId,
    event: "provision.started",
    data: { requestId },
  });

  await recordAuditEvent({
    organizationId,
    actorId,
    entityType: "request",
    entityId: requestId,
    action: "provision_started",
    metadata: startedMetadata,
  });

  await work();

  await db
    .update(requestTable)
    .set({ status: "fulfilled", updatedAt: new Date() })
    .where(eq(requestTable.id, requestId));

  await recordAuditEvent({
    organizationId,
    actorId: null,
    entityType: "request",
    entityId: requestId,
    action: "provision_succeeded",
    metadata: {
      ...startedMetadata,
      message: "Provision completed.",
    },
  });

  void deliverOrgWebhook({
    organizationId,
    event: "provision.succeeded",
    data: { requestId },
  });
}

/** Stub / local connector — no external calls. */
export async function runProvisionStub(ctx: ProvisionContext): Promise<void> {
  await withProvisionLifecycle(ctx, { stub: true }, async () => {
    await new Promise((r) => setTimeout(r, 150));
  });
}
