import { randomUUID } from "crypto";
import { db } from "@/db";
import { auditEvent } from "@/db/schema";

export async function recordAuditEvent(input: {
  organizationId: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEvent).values({
    id: randomUUID(),
    organizationId: input.organizationId,
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    metadata: input.metadata ?? null,
  });
}
