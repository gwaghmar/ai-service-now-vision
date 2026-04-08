import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Outbound webhook (Slack/custom receiver). POST with HMAC signature when set. */
  webhookUrl: text("webhook_url"),
  /** Optional secret for `X-Governance-Signature` (HMAC-SHA256 of raw body). */
  webhookSigningSecret: text("webhook_signing_secret"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Agent/service credentials: store hash only; plaintext shown once on create. */
export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Public id embedded in key (`gk_<lookupId>_…`) for O(1) lookup. */
    lookupId: text("lookup_id").notNull().unique(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("api_key_org_idx").on(t.organizationId)],
);

export const requestType = pgTable(
  "request_type",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    fieldSchema: jsonb("field_schema").notNull().$type<unknown>(),
    riskDefaults: jsonb("risk_defaults").notNull().$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("request_type_org_slug_unique").on(
      t.organizationId,
      t.slug,
    ),
  ],
);

export const request = pgTable(
  "request",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    requestTypeId: text("request_type_id")
      .notNull()
      .references(() => requestType.id, { onDelete: "restrict" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedApproverId: text("assigned_approver_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    /** Frozen at creation: user ids allowed to approve (from routing rules). */
    routingApproverIds: jsonb("routing_approver_ids").$type<string[] | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("request_org_status_idx").on(t.organizationId, t.status),
    index("request_approver_status_idx").on(
      t.assignedApproverId,
      t.status,
    ),
  ],
);

/**
 * Maps request types (or org default when request_type_id is null) to approvers.
 * Lower sort_order is evaluated first; first match wins for primary assignee.
 */
export const approvalRoutingRule = pgTable(
  "approval_routing_rule",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** When null, rule applies as org-wide fallback for any type. */
    requestTypeId: text("request_type_id").references(() => requestType.id, {
      onDelete: "cascade",
    }),
    approverUserId: text("approver_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("approval_routing_rule_org_idx").on(t.organizationId),
    index("approval_routing_rule_type_idx").on(t.requestTypeId),
  ],
);

/** One-time ids for email approval links (replay protection). */
export const approvalEmailNonce = pgTable(
  "approval_email_nonce",
  {
    jti: text("jti").primaryKey(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("approval_email_nonce_created_idx").on(t.createdAt)],
);

export const approval = pgTable(
  "approval",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    approverId: text("approver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    comment: text("comment"),
    decidedAt: timestamp("decided_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("approval_request_idx").on(t.requestId)],
);

/** Durable async fulfillment work (provision connector). */
export const fulfillmentJob = pgTable(
  "fulfillment_job",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    requestId: text("request_id")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("fulfillment_job_org_status_idx").on(t.organizationId, t.status),
    index("fulfillment_job_request_idx").on(t.requestId),
  ],
);

/** Templates for governed change / release tickets (report, ETL, etc.). */
export const changeTemplate = pgTable(
  "change_template",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    fieldSchema: jsonb("field_schema").notNull().$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("change_template_org_slug_unique").on(
      t.organizationId,
      t.slug,
    ),
  ],
);

/** Linear change-management pipeline: On deck → UAT → prod gate → closed. */
export const changeTicket = pgTable(
  "change_ticket",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    changeTemplateId: text("change_template_id")
      .notNull()
      .references(() => changeTemplate.id, { onDelete: "restrict" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedUserId: text("assigned_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    stage: text("stage").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("change_ticket_org_stage_idx").on(t.organizationId, t.stage),
    index("change_ticket_requester_idx").on(t.requesterId),
    index("change_ticket_assigned_idx").on(t.assignedUserId),
    index("change_ticket_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

/** Append-only audit stream: application code must only INSERT. */
export const auditEvent = pgTable(
  "audit_event",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("audit_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_entity_idx").on(t.entityType, t.entityId),
  ],
);

/** Per-org AI provider (BYOK); optional platform fallback via env when key null. */
export const organizationAiSettings = pgTable("organization_ai_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  /** e.g. openai_compatible */
  provider: text("provider").notNull().default("openai_compatible"),
  baseUrl: text("base_url"),
  defaultModel: text("default_model").notNull().default("gpt-4o-mini"),
  /** Encrypted or plaintext API key (use FIELD_ENCRYPTION_KEY in prod). */
  encryptedApiKey: text("encrypted_api_key"),
  keyLastFour: text("key_last_four"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
});

/** First-run wizard + setup checklist state. */
export const organizationOnboarding = pgTable("organization_onboarding", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  wizardVersion: integer("wizard_version").notNull().default(1),
  wizardCompletedAt: timestamp("wizard_completed_at", { withTimezone: true }),
  steps: jsonb("steps")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
});

/** Email invites: raw token is shown once; only sha256 hash stored. */
export const organizationInvite = pgTable(
  "organization_invite",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("requester"),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => [
    index("organization_invite_org_idx").on(t.organizationId),
    index("organization_invite_email_idx").on(t.organizationId, t.email),
  ],
);

/**
 * Org-level transactional email override (Phase C: Graph/Gmail OAuth).
 * When absent, app uses RESEND_API_KEY from env.
 */
export const organizationEmailSettings = pgTable("organization_email_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("resend_env"),
  /** Non-secret config (e.g. from address display name). */
  fromAddress: text("from_address"),
  /** Encrypted JSON: refresh tokens, SMTP password, etc. */
  encryptedCredentials: text("encrypted_credentials"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const organizationAiSettingsRelations = relations(
  organizationAiSettings,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationAiSettings.organizationId],
      references: [organization.id],
    }),
    updatedBy: one(user, {
      fields: [organizationAiSettings.updatedByUserId],
      references: [user.id],
    }),
  }),
);

export const organizationOnboardingRelations = relations(
  organizationOnboarding,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationOnboarding.organizationId],
      references: [organization.id],
    }),
  }),
);

export const organizationInviteRelations = relations(
  organizationInvite,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationInvite.organizationId],
      references: [organization.id],
    }),
    createdBy: one(user, {
      fields: [organizationInvite.createdByUserId],
      references: [user.id],
    }),
  }),
);

export const organizationEmailSettingsRelations = relations(
  organizationEmailSettings,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationEmailSettings.organizationId],
      references: [organization.id],
    }),
  }),
);

export const approvalRoutingRuleRelations = relations(
  approvalRoutingRule,
  ({ one }) => ({
    organization: one(organization, {
      fields: [approvalRoutingRule.organizationId],
      references: [organization.id],
    }),
    requestType: one(requestType, {
      fields: [approvalRoutingRule.requestTypeId],
      references: [requestType.id],
    }),
    approver: one(user, {
      fields: [approvalRoutingRule.approverUserId],
      references: [user.id],
    }),
  }),
);

export const organizationRelations = relations(organization, ({ many, one }) => ({
  requestTypes: many(requestType),
  requests: many(request),
  changeTemplates: many(changeTemplate),
  changeTickets: many(changeTicket),
  auditEvents: many(auditEvent),
  apiKeys: many(apiKey),
  fulfillmentJobs: many(fulfillmentJob),
  approvalRoutingRules: many(approvalRoutingRule),
  aiSettings: one(organizationAiSettings),
  onboarding: one(organizationOnboarding),
  invites: many(organizationInvite),
  emailSettings: one(organizationEmailSettings),
}));

export const changeTemplateRelations = relations(
  changeTemplate,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [changeTemplate.organizationId],
      references: [organization.id],
    }),
    tickets: many(changeTicket),
  }),
);

export const changeTicketRelations = relations(changeTicket, ({ one }) => ({
  organization: one(organization, {
    fields: [changeTicket.organizationId],
    references: [organization.id],
  }),
  template: one(changeTemplate, {
    fields: [changeTicket.changeTemplateId],
    references: [changeTemplate.id],
  }),
  requester: one(user, {
    fields: [changeTicket.requesterId],
    references: [user.id],
    relationName: "changeTicketRequester",
  }),
  assignee: one(user, {
    fields: [changeTicket.assignedUserId],
    references: [user.id],
    relationName: "changeTicketAssignee",
  }),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  organization: one(organization, {
    fields: [apiKey.organizationId],
    references: [organization.id],
  }),
}));

export const requestTypeRelations = relations(requestType, ({ one, many }) => ({
  organization: one(organization, {
    fields: [requestType.organizationId],
    references: [organization.id],
  }),
  requests: many(request),
  approvalRoutingRules: many(approvalRoutingRule),
}));

export const requestRelations = relations(request, ({ one, many }) => ({
  organization: one(organization, {
    fields: [request.organizationId],
    references: [organization.id],
  }),
  requestType: one(requestType, {
    fields: [request.requestTypeId],
    references: [requestType.id],
  }),
  requester: one(user, {
    fields: [request.requesterId],
    references: [user.id],
  }),
  assignee: one(user, {
    fields: [request.assignedApproverId],
    references: [user.id],
    relationName: "assignedApprover",
  }),
  approvals: many(approval),
  fulfillmentJobs: many(fulfillmentJob),
}));

export const fulfillmentJobRelations = relations(fulfillmentJob, ({ one }) => ({
  organization: one(organization, {
    fields: [fulfillmentJob.organizationId],
    references: [organization.id],
  }),
  request: one(request, {
    fields: [fulfillmentJob.requestId],
    references: [request.id],
  }),
  actor: one(user, {
    fields: [fulfillmentJob.actorId],
    references: [user.id],
  }),
}));

export const approvalRelations = relations(approval, ({ one }) => ({
  request: one(request, {
    fields: [approval.requestId],
    references: [request.id],
  }),
  approver: one(user, {
    fields: [approval.approverId],
    references: [user.id],
  }),
}));

export const auditEventRelations = relations(auditEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [auditEvent.organizationId],
    references: [organization.id],
  }),
  actor: one(user, {
    fields: [auditEvent.actorId],
    references: [user.id],
  }),
}));
