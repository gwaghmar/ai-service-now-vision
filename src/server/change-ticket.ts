import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  changeTicket,
  changeTemplate,
  user,
} from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import {
  nextChangeTicketStage,
  parseChangeTicketStage,
} from "@/lib/change-ticket-stages";

export async function assertAssigneeInOrg(
  assigneeUserId: string | null | undefined,
  organizationId: string,
): Promise<void> {
  if (!assigneeUserId) return;
  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(eq(user.id, assigneeUserId), eq(user.organizationId, organizationId)),
    )
    .limit(1);
  if (!u) {
    throw new Error("Assignee must be a user in your organization.");
  }
}

export async function loadChangeTicketForOrg(
  organizationId: string,
  ticketId: string,
) {
  const [row] = await db
    .select()
    .from(changeTicket)
    .where(
      and(
        eq(changeTicket.id, ticketId),
        eq(changeTicket.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createChangeTicketRecord(input: {
  organizationId: string;
  requesterId: string;
  changeTemplateId: string;
  title: string;
  payload: Record<string, unknown>;
  assignedUserId: string | null;
}): Promise<string> {
  const {
    organizationId,
    requesterId,
    changeTemplateId,
    title,
    payload,
    assignedUserId,
  } = input;

  const [tpl] = await db
    .select()
    .from(changeTemplate)
    .where(
      and(
        eq(changeTemplate.id, changeTemplateId),
        eq(changeTemplate.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!tpl) throw new Error("Change template not found.");

  await assertAssigneeInOrg(assignedUserId, organizationId);

  const id = randomUUID();
  await db.insert(changeTicket).values({
    id,
    organizationId,
    changeTemplateId: tpl.id,
    requesterId,
    assignedUserId,
    title,
    payload,
    stage: "draft",
  });

  await recordAuditEvent({
    organizationId,
    actorId: requesterId,
    entityType: "change_ticket",
    entityId: id,
    action: "change_ticket_created",
    metadata: { title, templateSlug: tpl.slug },
  });

  return id;
}

export async function updateChangeTicketDraft(input: {
  organizationId: string;
  ticketId: string;
  actorUserId: string;
  actorRole: "requester" | "approver" | "admin";
  title: string;
  payload: Record<string, unknown>;
  assignedUserId: string | null;
}): Promise<void> {
  const row = await loadChangeTicketForOrg(
    input.organizationId,
    input.ticketId,
  );
  if (!row) throw new Error("Change ticket not found.");
  if (row.stage !== "draft") {
    throw new Error("Only draft tickets can be edited.");
  }
  const isOwner = row.requesterId === input.actorUserId;
  if (!isOwner && input.actorRole !== "admin") {
    throw new Error("Only the requester or an admin can edit this draft.");
  }

  await assertAssigneeInOrg(input.assignedUserId, input.organizationId);

  await db
    .update(changeTicket)
    .set({
      title: input.title,
      payload: input.payload,
      assignedUserId: input.assignedUserId,
      updatedAt: new Date(),
    })
    .where(eq(changeTicket.id, row.id));

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorUserId,
    entityType: "change_ticket",
    entityId: row.id,
    action: "change_ticket_draft_updated",
    metadata: {},
  });
}

export async function updateChangeTicketAssignee(input: {
  organizationId: string;
  ticketId: string;
  actorUserId: string;
  actorRole: "requester" | "approver" | "admin";
  assignedUserId: string | null;
}): Promise<void> {
  const row = await loadChangeTicketForOrg(
    input.organizationId,
    input.ticketId,
  );
  if (!row) throw new Error("Change ticket not found.");
  if (row.stage === "closed") {
    throw new Error("Cannot change assignee on a closed ticket.");
  }

  const isOwner = row.requesterId === input.actorUserId;
  const can =
    input.actorRole === "admin" ||
    input.actorRole === "approver" ||
    isOwner;
  if (!can) {
    throw new Error("Not authorized to update assignee.");
  }

  await assertAssigneeInOrg(input.assignedUserId, input.organizationId);

  const prev = row.assignedUserId;
  if (prev === input.assignedUserId) return;

  await db
    .update(changeTicket)
    .set({
      assignedUserId: input.assignedUserId,
      updatedAt: new Date(),
    })
    .where(eq(changeTicket.id, row.id));

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorUserId,
    entityType: "change_ticket",
    entityId: row.id,
    action: "change_assignee_updated",
    metadata: { from: prev ?? null, to: input.assignedUserId ?? null },
  });
}

export async function moveChangeTicketToOnDeck(input: {
  organizationId: string;
  ticketId: string;
  actorUserId: string;
  actorRole: "requester" | "approver" | "admin";
}): Promise<void> {
  const row = await loadChangeTicketForOrg(
    input.organizationId,
    input.ticketId,
  );
  if (!row) throw new Error("Change ticket not found.");
  const stage = parseChangeTicketStage(row.stage);
  if (stage !== "draft") {
    throw new Error("Only draft tickets can move to On deck.");
  }
  const isOwner = row.requesterId === input.actorUserId;
  if (!isOwner && input.actorRole !== "admin") {
    throw new Error("Not authorized.");
  }

  await db
    .update(changeTicket)
    .set({ stage: "on_deck", updatedAt: new Date() })
    .where(eq(changeTicket.id, row.id));

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorUserId,
    entityType: "change_ticket",
    entityId: row.id,
    action: "change_stage_advanced",
    metadata: { from: "draft", to: "on_deck" },
  });
}

export async function advanceChangeTicketStage(input: {
  organizationId: string;
  ticketId: string;
  actorUserId: string;
  actorRole: "approver" | "admin";
  comment?: string | null;
}): Promise<void> {
  const row = await loadChangeTicketForOrg(
    input.organizationId,
    input.ticketId,
  );
  if (!row) throw new Error("Change ticket not found.");
  if (input.actorRole !== "approver" && input.actorRole !== "admin") {
    throw new Error("Not authorized.");
  }

  const stage = parseChangeTicketStage(row.stage);
  if (stage === "draft") {
    throw new Error("Use move to On deck from draft.");
  }
  if (stage === "closed") {
    throw new Error("Ticket is already closed.");
  }

  const next = nextChangeTicketStage(stage);
  if (!next) throw new Error("No further stage.");

  await db
    .update(changeTicket)
    .set({ stage: next, updatedAt: new Date() })
    .where(eq(changeTicket.id, row.id));

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorUserId,
    entityType: "change_ticket",
    entityId: row.id,
    action: "change_stage_advanced",
    metadata: {
      from: stage,
      to: next,
      comment: input.comment ?? undefined,
    },
  });
}
