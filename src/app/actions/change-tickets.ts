"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { changeTemplate } from "@/db/schema";
import {
  buildPayloadSchema,
  parseFieldSchema,
} from "@/lib/request-schemas";
import { requireSession } from "@/lib/session";
import {
  advanceChangeTicketStage,
  assertAssigneeInOrg,
  createChangeTicketRecord,
  loadChangeTicketForOrg,
  moveChangeTicketToOnDeck,
  updateChangeTicketAssignee,
  updateChangeTicketDraft,
} from "@/server/change-ticket";

function sessionOrgId(session: {
  user: { organizationId?: string | null };
}) {
  const oid = session.user.organizationId;
  if (!oid) throw new Error("User is not assigned to an organization.");
  return oid;
}

function userRole(session: { user: { role?: string | null } }) {
  return (session.user.role ?? "requester") as
    | "requester"
    | "approver"
    | "admin";
}

const userIdOrEmpty = z.union([z.string().min(1), z.literal("")]);

const createSchema = z.object({
  changeTemplateId: z.uuid(),
  title: z.string().min(1).max(500),
  payload: z.record(z.string(), z.unknown()),
  assignedUserId: userIdOrEmpty.optional(),
});

export async function createChangeTicketAction(input: {
  changeTemplateId: string;
  title: string;
  payload: Record<string, unknown>;
  assignedUserId?: string;
}) {
  const boundary = createSchema.safeParse({
    ...input,
    assignedUserId: input.assignedUserId ?? "",
  });
  if (!boundary.success) throw new Error("Invalid change ticket data");

  const session = await requireSession();
  const orgId = sessionOrgId(session);
  const uid = session.user.id;

  const [tpl] = await db
    .select()
    .from(changeTemplate)
    .where(
      and(
        eq(changeTemplate.id, boundary.data.changeTemplateId),
        eq(changeTemplate.organizationId, orgId),
      ),
    )
    .limit(1);
  if (!tpl) throw new Error("Change template not found.");

  const fieldSchema = parseFieldSchema(tpl.fieldSchema);
  const parsed = buildPayloadSchema(fieldSchema.fields).safeParse(
    boundary.data.payload,
  );
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }

  const assignee =
    boundary.data.assignedUserId && boundary.data.assignedUserId !== ""
      ? boundary.data.assignedUserId
      : null;
  await assertAssigneeInOrg(assignee, orgId);

  const id = await createChangeTicketRecord({
    organizationId: orgId,
    requesterId: uid,
    changeTemplateId: tpl.id,
    title: boundary.data.title,
    payload: parsed.data as Record<string, unknown>,
    assignedUserId: assignee,
  });

  revalidatePath("/changes");
  revalidatePath(`/changes/${id}`);
  return { ok: true as const, ticketId: id };
}

const updateDraftSchema = z.object({
  ticketId: z.uuid(),
  title: z.string().min(1).max(500),
  payload: z.record(z.string(), z.unknown()),
  assignedUserId: userIdOrEmpty.optional(),
});

export async function updateChangeTicketDraftAction(input: {
  ticketId: string;
  title: string;
  payload: Record<string, unknown>;
  assignedUserId?: string;
}) {
  const boundary = updateDraftSchema.safeParse({
    ...input,
    assignedUserId: input.assignedUserId ?? "",
  });
  if (!boundary.success) throw new Error("Invalid data");

  const session = await requireSession();
  const orgId = sessionOrgId(session);
  const role = userRole(session);

  const ticket = await loadChangeTicketForOrg(orgId, boundary.data.ticketId);
  if (!ticket) throw new Error("Change ticket not found.");

  const [tpl] = await db
    .select()
    .from(changeTemplate)
    .where(
      and(
        eq(changeTemplate.id, ticket.changeTemplateId),
        eq(changeTemplate.organizationId, orgId),
      ),
    )
    .limit(1);
  if (!tpl) throw new Error("Template not found.");

  const fieldSchema = parseFieldSchema(tpl.fieldSchema);
  const parsed = buildPayloadSchema(fieldSchema.fields).safeParse(
    boundary.data.payload,
  );
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }

  const assignee =
    boundary.data.assignedUserId && boundary.data.assignedUserId !== ""
      ? boundary.data.assignedUserId
      : null;

  await updateChangeTicketDraft({
    organizationId: orgId,
    ticketId: ticket.id,
    actorUserId: session.user.id,
    actorRole: role,
    title: boundary.data.title,
    payload: parsed.data as Record<string, unknown>,
    assignedUserId: assignee,
  });

  revalidatePath("/changes");
  revalidatePath(`/changes/${ticket.id}`);
  return { ok: true as const };
}

const assigneeSchema = z.object({
  ticketId: z.uuid(),
  assignedUserId: userIdOrEmpty,
});

export async function updateChangeTicketAssigneeAction(input: {
  ticketId: string;
  assignedUserId: string;
}) {
  const boundary = assigneeSchema.safeParse(input);
  if (!boundary.success) throw new Error("Invalid data");

  const session = await requireSession();
  const orgId = sessionOrgId(session);
  const role = userRole(session);

  const assignee =
    boundary.data.assignedUserId !== ""
      ? boundary.data.assignedUserId
      : null;

  await updateChangeTicketAssignee({
    organizationId: orgId,
    ticketId: boundary.data.ticketId,
    actorUserId: session.user.id,
    actorRole: role,
    assignedUserId: assignee,
  });

  revalidatePath("/changes");
  revalidatePath(`/changes/${boundary.data.ticketId}`);
  return { ok: true as const };
}

const ticketIdSchema = z.object({ ticketId: z.uuid() });

export async function moveChangeTicketToOnDeckAction(input: {
  ticketId: string;
}) {
  const boundary = ticketIdSchema.safeParse(input);
  if (!boundary.success) throw new Error("Invalid data");

  const session = await requireSession();
  const orgId = sessionOrgId(session);
  const role = userRole(session);

  await moveChangeTicketToOnDeck({
    organizationId: orgId,
    ticketId: boundary.data.ticketId,
    actorUserId: session.user.id,
    actorRole: role,
  });

  revalidatePath("/changes");
  revalidatePath(`/changes/${boundary.data.ticketId}`);
  return { ok: true as const };
}

const advanceSchema = z.object({
  ticketId: z.uuid(),
  comment: z.string().max(8000).optional(),
});

export async function advanceChangeTicketStageAction(input: {
  ticketId: string;
  comment?: string;
}) {
  const boundary = advanceSchema.safeParse(input);
  if (!boundary.success) throw new Error("Invalid data");

  const session = await requireSession();
  const orgId = sessionOrgId(session);
  const role = userRole(session);
  if (role !== "approver" && role !== "admin") {
    throw new Error("Not authorized.");
  }

  await advanceChangeTicketStage({
    organizationId: orgId,
    ticketId: boundary.data.ticketId,
    actorUserId: session.user.id,
    actorRole: role === "admin" ? "admin" : "approver",
    comment: boundary.data.comment,
  });

  revalidatePath("/changes");
  revalidatePath(`/changes/${boundary.data.ticketId}`);
  return { ok: true as const };
}
