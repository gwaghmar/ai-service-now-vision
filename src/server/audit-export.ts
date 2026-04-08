import { and, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  auditEvent,
  changeTemplate,
  changeTicket,
  request as requestTable,
  requestType,
  user,
} from "@/db/schema";

const changeAssigneeUser = alias(user, "change_assignee");

/** DB-only audit export query; callers must enforce auth. */
export async function queryAuditExportRows(input: {
  orgId: string;
  from: Date;
  to: Date;
}) {
  const { orgId, from, to } = input;

  return db
    .select({
      auditId: auditEvent.id,
      createdAt: auditEvent.createdAt,
      action: auditEvent.action,
      entityType: auditEvent.entityType,
      entityId: auditEvent.entityId,
      actorId: auditEvent.actorId,
      metadata: auditEvent.metadata,
      requestStatus: requestTable.status,
      requestTypeTitle: requestType.title,
      requesterEmail: user.email,
      changeTicketTitle: changeTicket.title,
      changeTicketStage: changeTicket.stage,
      changeTemplateTitle: changeTemplate.title,
      changeAssigneeEmail: changeAssigneeUser.email,
    })
    .from(auditEvent)
    .leftJoin(
      requestTable,
      and(
        eq(auditEvent.entityType, "request"),
        eq(auditEvent.entityId, requestTable.id),
        eq(requestTable.organizationId, orgId),
      ),
    )
    .leftJoin(requestType, eq(requestTable.requestTypeId, requestType.id))
    .leftJoin(user, eq(requestTable.requesterId, user.id))
    .leftJoin(
      changeTicket,
      and(
        eq(auditEvent.entityType, "change_ticket"),
        eq(auditEvent.entityId, changeTicket.id),
        eq(changeTicket.organizationId, orgId),
      ),
    )
    .leftJoin(
      changeTemplate,
      eq(changeTicket.changeTemplateId, changeTemplate.id),
    )
    .leftJoin(
      changeAssigneeUser,
      eq(changeTicket.assignedUserId, changeAssigneeUser.id),
    )
    .where(
      and(
        eq(auditEvent.organizationId, orgId),
        gte(auditEvent.createdAt, from),
        lte(auditEvent.createdAt, to),
      ),
    )
    .orderBy(desc(auditEvent.createdAt));
}
