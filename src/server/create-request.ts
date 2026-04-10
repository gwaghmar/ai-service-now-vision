import { randomUUID } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { request as requestTable, requestType, user } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import { resolveApproverUserIds } from "@/server/approval-routing";
import { evaluatePolicyOrThrow } from "@/server/policy-engine";
import { deliverOrgWebhook } from "@/server/webhooks";
import { getPublicAppUrl } from "@/lib/env";
import { sendRequestCreatedNotifications } from "@/server/notifications/request-created";

/** Insert a request after payload is validated against the request type schema. */
export async function createRequestCore(input: {
  organizationId: string;
  requesterId: string;
  requestTypeId: string;
  payload: Record<string, unknown>;
  typeSlug: string;
  auditAction: string;
  auditActorId: string | null;
  auditMetadata?: Record<string, unknown>;
}) {
  await evaluatePolicyOrThrow({
    organizationId: input.organizationId,
    requestTypeSlug: input.typeSlug,
    payload: input.payload,
  });

  const approverIds = await resolveApproverUserIds({
    organizationId: input.organizationId,
    requestTypeId: input.requestTypeId,
  });
  const primaryApproverId = approverIds[0] ?? null;
  const routingSnapshot =
    approverIds.length > 0 ? approverIds : null;

  const id = randomUUID();
  await db.insert(requestTable).values({
    id,
    organizationId: input.organizationId,
    requestTypeId: input.requestTypeId,
    requesterId: input.requesterId,
    assignedApproverId: primaryApproverId,
    status: "pending_approval",
    payload: input.payload,
    routingApproverIds: routingSnapshot,
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorId: input.auditActorId,
    entityType: "request",
    entityId: id,
    action: input.auditAction,
    metadata: {
      requestTypeSlug: input.typeSlug,
      ...input.auditMetadata,
    },
  });

  const [requester] = await db
    .select({
      email: user.email,
      name: user.name,
      department: user.department,
      managerUserId: user.managerUserId,
    })
    .from(user)
    .where(eq(user.id, input.requesterId))
    .limit(1);

  const reviewUrl = `${getPublicAppUrl().replace(/\/$/, "")}/requests/${id}`;

  void deliverOrgWebhook({
    organizationId: input.organizationId,
    event: "request.submitted",
    data: {
      requestId: id,
      requestTypeSlug: input.typeSlug,
      requesterId: input.requesterId,
      requesterEmail: requester?.email ?? null,
      assignedApproverId: primaryApproverId,
      routingApproverIds: routingSnapshot,
      reviewUrl,
    },
  });

  void sendRequestCreatedNotifications({
    requestId: id,
    organizationId: input.organizationId,
    requestTypeSlug: input.typeSlug,
    requesterId: input.requesterId,
    requesterEmail: requester?.email ?? "",
    requesterName: requester?.name ?? "",
    requesterDepartment: requester?.department ?? null,
    requesterManagerUserId: requester?.managerUserId ?? null,
    approverUserIds: approverIds,
    reviewUrl,
  });

  return { id };
}

export async function findRequestTypeBySlug(
  organizationId: string,
  slug: string,
) {
  const [type] = await db
    .select()
    .from(requestType)
    .where(
      and(
        eq(requestType.organizationId, organizationId),
        eq(requestType.slug, slug),
        isNull(requestType.archivedAt),
      ),
    )
    .limit(1);
  return type ?? null;
}

export async function findUserByEmailInOrg(
  organizationId: string,
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  const [u] = await db
    .select()
    .from(user)
    .where(
      and(
        eq(user.organizationId, organizationId),
        sql`lower(${user.email}) = ${normalized}`,
      ),
    )
    .limit(1);
  return u ?? null;
}
