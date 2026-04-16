import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";

export type OrgResolutionSuccess = {
  ok: true;
  organizationId: string;
  name: string;
};

export type OrgResolutionFailure = {
  ok: false;
  httpStatus: number;
  code: string;
  message: string;
};

export type OrgResolutionResult = OrgResolutionSuccess | OrgResolutionFailure;

/**
 * Resolve the organization that owns a given Slack workspace.
 *
 * Fail-closed: Returns a typed failure (never throws) for every edge case —
 * empty teamId, no match, or multiple matches (integrity violation).
 * Callers must check `.ok` before proceeding.
 */
export async function resolveOrgForSlackTeamId(
  teamId: string,
): Promise<OrgResolutionResult> {
  if (!teamId || !teamId.trim()) {
    return {
      ok: false,
      httpStatus: 400,
      code: "slack_team_id_missing",
      message: "Slack team_id is required for tenant resolution.",
    };
  }

  const rows = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.slackTeamId, teamId.trim()));

  if (rows.length === 0) {
    return {
      ok: false,
      httpStatus: 404,
      code: "slack_team_unmapped",
      message: "No organization is mapped to this Slack workspace.",
    };
  }

  // Integrity guard: unique index should prevent this, but fail-closed anyway.
  if (rows.length > 1) {
    return {
      ok: false,
      httpStatus: 500,
      code: "slack_team_ambiguous",
      message: "Multiple organizations matched the same Slack workspace — data integrity error.",
    };
  }

  return { ok: true, organizationId: rows[0].id, name: rows[0].name };
}

/**
 * Resolve the organization for the chat-ingest channel (CHAT_INGEST_ORG_ID env var).
 *
 * Fail-closed: Returns a typed failure when the env var is absent or points to
 * a non-existent organization row.
 */
export async function resolveChatIngestOrgId(): Promise<OrgResolutionResult> {
  const orgId = process.env.CHAT_INGEST_ORG_ID?.trim();

  if (!orgId) {
    return {
      ok: false,
      httpStatus: 503,
      code: "chat_ingest_org_not_configured",
      message: "CHAT_INGEST_ORG_ID is not set.",
    };
  }

  const rows = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId));

  if (rows.length === 0) {
    return {
      ok: false,
      httpStatus: 503,
      code: "chat_ingest_org_not_found",
      message: "The organization referenced by CHAT_INGEST_ORG_ID does not exist.",
    };
  }

  return { ok: true, organizationId: rows[0].id, name: rows[0].name };
}
