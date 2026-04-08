"use server";

import { createHash, randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db";
import {
  organization,
  organizationAiSettings,
  organizationInvite,
  organizationOnboarding,
  user,
} from "@/db/schema";
import { encryptFieldIfConfigured } from "@/lib/field-encryption";
import { requireSession } from "@/lib/session";
import { recordAuditEvent } from "@/server/audit";
import {
  catalogProposalSchema,
  mockCatalogProposal,
  type CatalogProposal,
} from "@/server/ai/catalog-proposal-schema";
import {
  AiNotConfiguredError,
  getOrgLanguageModel,
  isTestAiMock,
  testOrgAiConnection,
} from "@/server/ai/client";
import {
  buildCatalogUserPrompt,
  ONBOARDING_SYSTEM,
} from "@/server/ai/prompts";
import { adminBulkCreateRequestTypes } from "@/app/actions/admin";
import { getPublicAppUrl } from "@/lib/env";
import { getCatalogTemplate } from "@/server/catalog-templates";
import { sendTransactionalEmail } from "@/server/email/send-email";

const roleSchema = z.enum(["requester", "approver", "admin"]);

function requireAdminOrg(session: {
  user: { role?: string | null; organizationId?: string | null };
}) {
  const role = session.user.role ?? "requester";
  if (role !== "admin") throw new Error("Admin only.");
  const orgId = session.user.organizationId;
  if (!orgId) throw new Error("No organization.");
  return orgId;
}

export async function loadCatalogTemplateAction(templateId: string) {
  const session = await requireSession();
  requireAdminOrg(session);
  const proposal = getCatalogTemplate(templateId);
  if (!proposal) throw new Error("Unknown template.");
  return proposal;
}

export async function getOrgAiSettingsMasked() {
  const session = await requireSession();
  const orgId = requireAdminOrg(session);
  const [row] = await db
    .select()
    .from(organizationAiSettings)
    .where(eq(organizationAiSettings.organizationId, orgId))
    .limit(1);
  return {
    provider: row?.provider ?? "openai_compatible",
    baseUrl: row?.baseUrl ?? "",
    defaultModel: row?.defaultModel ?? "gpt-4o-mini",
    keyLastFour: row?.keyLastFour ?? null,
    hasStoredKey: Boolean(row?.encryptedApiKey?.trim()),
  };
}

const saveAiSchema = z.object({
  baseUrl: z.string().max(2000).optional(),
  defaultModel: z.string().min(1).max(120),
  apiKey: z.string().max(500).optional(),
  clearKey: z.boolean().optional(),
});

export async function saveOrgAiSettings(input: z.infer<typeof saveAiSchema>) {
  const parsed = saveAiSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid AI settings");

  const session = await requireSession();
  const orgId = requireAdminOrg(session);

  const baseUrl = parsed.data.baseUrl?.trim() || null;
  const defaultModel = parsed.data.defaultModel.trim();
  let encryptedApiKey: string | null | undefined;
  let keyLastFour: string | null | undefined;

  if (parsed.data.clearKey) {
    encryptedApiKey = null;
    keyLastFour = null;
  } else if (parsed.data.apiKey?.trim()) {
    const plain = parsed.data.apiKey.trim();
    encryptedApiKey = encryptFieldIfConfigured(plain);
    keyLastFour = plain.length >= 4 ? plain.slice(-4) : "****";
  }

  if (encryptedApiKey === undefined) {
    const [prev] = await db
      .select({
        encryptedApiKey: organizationAiSettings.encryptedApiKey,
        keyLastFour: organizationAiSettings.keyLastFour,
      })
      .from(organizationAiSettings)
      .where(eq(organizationAiSettings.organizationId, orgId))
      .limit(1);
    encryptedApiKey = prev?.encryptedApiKey ?? null;
    keyLastFour = prev?.keyLastFour ?? null;
  }

  await db
    .insert(organizationAiSettings)
    .values({
      organizationId: orgId,
      provider: "openai_compatible",
      baseUrl,
      defaultModel,
      encryptedApiKey: encryptedApiKey ?? null,
      keyLastFour: keyLastFour ?? null,
      updatedByUserId: session.user.id,
    })
    .onConflictDoUpdate({
      target: organizationAiSettings.organizationId,
      set: {
        baseUrl,
        defaultModel,
        encryptedApiKey: encryptedApiKey ?? null,
        keyLastFour: keyLastFour ?? null,
        updatedByUserId: session.user.id,
        updatedAt: new Date(),
      },
    });

  await recordAuditEvent({
    organizationId: orgId,
    actorId: session.user.id,
    entityType: "organization",
    entityId: orgId,
    action: "ai_settings_updated",
    metadata: {
      hasStoredKey: Boolean(encryptedApiKey),
      defaultModel,
    },
  });

  revalidatePath("/admin/ai");
  revalidatePath("/onboarding");
  return { ok: true as const };
}

export async function runOrgAiConnectionTest() {
  const session = await requireSession();
  const orgId = requireAdminOrg(session);
  const result = await testOrgAiConnection(orgId);
  return result;
}

export async function ensureOrganizationOnboardingRow(orgId: string) {
  await db
    .insert(organizationOnboarding)
    .values({
      organizationId: orgId,
      wizardVersion: 1,
      steps: {},
    })
    .onConflictDoNothing({ target: organizationOnboarding.organizationId });
}

export async function getOrganizationOnboardingState() {
  const session = await requireSession();
  const orgId = session.user.organizationId;
  if (!orgId) return null;
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "admin") return null;
  await ensureOrganizationOnboardingRow(orgId);
  const [row] = await db
    .select()
    .from(organizationOnboarding)
    .where(eq(organizationOnboarding.organizationId, orgId))
    .limit(1);
  return row;
}

const genCatalogInput = z.object({
  orgName: z.string().max(200).optional(),
  industry: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
  refinement: z.string().max(2000).optional(),
});

export async function onboardingGenerateCatalogProposal(
  input: z.infer<typeof genCatalogInput>,
) {
  const parsed = genCatalogInput.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const session = await requireSession();
  const orgId = requireAdminOrg(session);
  await ensureOrganizationOnboardingRow(orgId);

  if (isTestAiMock()) {
    await recordAuditEvent({
      organizationId: orgId,
      actorId: session.user.id,
      entityType: "organization",
      entityId: orgId,
      action: "ai_catalog_proposed",
      metadata: { mock: true },
    });
    return {
      proposal: mockCatalogProposal,
      usedPlatformFallback: false,
    };
  }

  let usedPlatformFallback = false;
  try {
    const { model, usedPlatformFallback: pf } =
      await getOrgLanguageModel(orgId);
    usedPlatformFallback = pf;
    const { object } = await generateObject({
      model,
      schema: catalogProposalSchema,
      system: ONBOARDING_SYSTEM,
      prompt: buildCatalogUserPrompt(parsed.data),
    });

    await recordAuditEvent({
      organizationId: orgId,
      actorId: session.user.id,
      entityType: "organization",
      entityId: orgId,
      action: "ai_catalog_proposed",
      metadata: {
        count: object.requestTypes.length,
        usedPlatformFallback,
      },
    });

    return { proposal: object, usedPlatformFallback };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) throw e;
    throw e;
  }
}

export async function onboardingApplyCatalogProposal(proposal: CatalogProposal) {
  const session = await requireSession();
  const orgId = requireAdminOrg(session);

  const parsed = catalogProposalSchema.safeParse(proposal);
  if (!parsed.success) throw new Error("Invalid proposal");

  await adminBulkCreateRequestTypes({
    items: parsed.data.requestTypes.map((t) => ({
      slug: t.slug,
      title: t.title,
      description: t.description,
      fieldSchema: t.fieldSchema,
      riskDefaults: t.riskDefaults,
    })),
  });

  await mergeOnboardingSteps({ catalog: true });

  await recordAuditEvent({
    organizationId: orgId,
    actorId: session.user.id,
    entityType: "organization",
    entityId: orgId,
    action: "ai_catalog_applied",
    metadata: { count: parsed.data.requestTypes.length },
  });

  return { ok: true as const };
}

export async function mergeOnboardingSteps(
  partial: Record<string, boolean>,
) {
  const session = await requireSession();
  const orgId = requireAdminOrg(session);
  await ensureOrganizationOnboardingRow(orgId);
  const [row] = await db
    .select({ steps: organizationOnboarding.steps })
    .from(organizationOnboarding)
    .where(eq(organizationOnboarding.organizationId, orgId))
    .limit(1);
  const next = { ...(row?.steps ?? {}), ...partial };
  await db
    .update(organizationOnboarding)
    .set({ steps: next })
    .where(eq(organizationOnboarding.organizationId, orgId));
  revalidatePath("/onboarding");
  revalidatePath("/");
  return { ok: true as const };
}

export async function markOnboardingComplete() {
  const session = await requireSession();
  const orgId = requireAdminOrg(session);
  await ensureOrganizationOnboardingRow(orgId);
  await db
    .update(organizationOnboarding)
    .set({ wizardCompletedAt: new Date() })
    .where(eq(organizationOnboarding.organizationId, orgId));
  revalidatePath("/onboarding");
  revalidatePath("/");
  return { ok: true as const };
}

const orgProfileSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function adminUpdateOrganizationDisplayName(
  input: z.infer<typeof orgProfileSchema>,
) {
  const parsed = orgProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid organization name");

  const session = await requireSession();
  const orgId = requireAdminOrg(session);

  await db
    .update(organization)
    .set({ name: parsed.data.name })
    .where(eq(organization.id, orgId));

  await mergeOnboardingSteps({ orgProfile: true });
  revalidatePath("/onboarding");
  revalidatePath("/admin/setup-status");
  return { ok: true as const };
}

function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function adminCreateInvite(input: {
  email: string;
  role: z.infer<typeof roleSchema>;
  sendEmail?: boolean;
}) {
  const parsed = z
    .object({
      email: z.string().email(),
      role: roleSchema,
      sendEmail: z.boolean().optional(),
    })
    .safeParse(input);
  if (!parsed.success) throw new Error("Invalid invite");

  const session = await requireSession();
  const orgId = requireAdminOrg(session);

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const id = randomUUID();
  const secret = randomBytes(24).toString("hex");
  const raw = `${id}:${secret}`;
  const tokenHash = hashInviteToken(raw);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.insert(organizationInvite).values({
    id,
    organizationId: orgId,
    email: emailNorm,
    role: parsed.data.role,
    tokenHash,
    expiresAt,
    createdByUserId: session.user.id,
  });

  const token = Buffer.from(raw, "utf8").toString("base64url");
  const signupUrl = `${getPublicAppUrl().replace(/\/$/, "")}/sign-up?invite=${encodeURIComponent(token)}`;

  if (parsed.data.sendEmail) {
    const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Governance";
    await sendTransactionalEmail({
      organizationId: orgId,
      to: emailNorm,
      subject: `You're invited to ${appName}`,
      html: `<p>You've been invited to join ${appName}.</p><p><a href="${signupUrl}">Create your account</a></p><p>This link expires in 14 days.</p>`,
    });
  }

  await recordAuditEvent({
    organizationId: orgId,
    actorId: session.user.id,
    entityType: "organization",
    entityId: orgId,
    action: "invite_created",
    metadata: { email: emailNorm, role: parsed.data.role },
  });

  revalidatePath("/onboarding");
  revalidatePath("/admin/users");
  return {
    ok: true as const,
    inviteToken: token,
    inviteId: id,
    signupUrl,
  };
}

export async function adminListPendingInvites() {
  const session = await requireSession();
  const orgId = requireAdminOrg(session);
  return db
    .select({
      id: organizationInvite.id,
      email: organizationInvite.email,
      role: organizationInvite.role,
      expiresAt: organizationInvite.expiresAt,
      createdAt: organizationInvite.createdAt,
    })
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.organizationId, orgId),
        isNull(organizationInvite.acceptedAt),
      ),
    )
    .orderBy(asc(organizationInvite.createdAt));
}

export async function finalizeInviteFromToken(inviteToken: string) {
  const parsed = z.string().min(10).safeParse(inviteToken);
  if (!parsed.success) throw new Error("Invalid invite token");

  const session = await requireSession();
  const raw = Buffer.from(parsed.data, "base64url").toString("utf8");
  const colon = raw.indexOf(":");
  if (colon < 1) throw new Error("Invalid invite token");
  const id = raw.slice(0, colon);
  const tokenHash = hashInviteToken(raw);

  const [inv] = await db
    .select()
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.id, id),
        eq(organizationInvite.tokenHash, tokenHash),
      ),
    )
    .limit(1);

  if (!inv || inv.acceptedAt) throw new Error("Invite not found or already used.");
  if (new Date(inv.expiresAt) < new Date()) throw new Error("Invite expired.");

  const userEmail = session.user.email?.trim().toLowerCase();
  if (!userEmail || userEmail !== inv.email) {
    throw new Error(
      "Signed-in email must match the invite. Sign in with the invited address.",
    );
  }

  await db
    .update(user)
    .set({
      organizationId: inv.organizationId,
      role: inv.role,
    })
    .where(eq(user.id, session.user.id));

  await db
    .update(organizationInvite)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvite.id, inv.id));

  await recordAuditEvent({
    organizationId: inv.organizationId,
    actorId: session.user.id,
    entityType: "organization",
    entityId: inv.organizationId,
    action: "invite_accepted",
    metadata: { email: inv.email, role: inv.role },
  });

  revalidatePath("/");
  return { ok: true as const };
}
