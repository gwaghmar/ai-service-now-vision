import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the db module so tests run without a live database.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Also mock the schema so imports don't fail without a DB connection.
vi.mock("@/db/schema", () => ({
  organization: { id: "id", name: "name", slackTeamId: "slack_team_id" },
}));

import { db } from "@/db";
import {
  resolveChatIngestOrgId,
  resolveOrgForSlackTeamId,
} from "@/server/tenant-resolution";

// Build a fluent mock chain: db.select().from().where() => rows
function mockDbReturning(rows: Array<{ id: string; name: string }>) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from });
  return { from, where };
}

describe("resolveOrgForSlackTeamId", () => {
  afterEach(() => { vi.clearAllMocks(); });

  it("fails closed when teamId is empty string", async () => {
    const result = await resolveOrgForSlackTeamId("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("slack_team_id_missing");
      expect(result.httpStatus).toBe(400);
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it("fails closed when teamId is only whitespace", async () => {
    const result = await resolveOrgForSlackTeamId("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("slack_team_id_missing");
    }
  });

  it("fails closed with 404 when no org matches the teamId", async () => {
    mockDbReturning([]);
    const result = await resolveOrgForSlackTeamId("T_UNKNOWN");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("slack_team_unmapped");
      expect(result.httpStatus).toBe(404);
    }
  });

  it("fails closed with 500 when multiple orgs match (integrity violation)", async () => {
    mockDbReturning([
      { id: "org-1", name: "Org One" },
      { id: "org-2", name: "Org Two" },
    ]);
    const result = await resolveOrgForSlackTeamId("T_DUPE");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("slack_team_ambiguous");
      expect(result.httpStatus).toBe(500);
    }
  });

  it("returns organizationId and name on success", async () => {
    mockDbReturning([{ id: "org-abc", name: "Acme Corp" }]);
    const result = await resolveOrgForSlackTeamId("T_ABC123");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organizationId).toBe("org-abc");
      expect(result.name).toBe("Acme Corp");
    }
  });

  it("trims whitespace from teamId before querying", async () => {
    mockDbReturning([{ id: "org-abc", name: "Acme" }]);
    const result = await resolveOrgForSlackTeamId("  T_ABC123  ");
    expect(result.ok).toBe(true);
  });
});

describe("resolveChatIngestOrgId", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("fails closed when CHAT_INGEST_ORG_ID is not set", async () => {
    vi.stubEnv("CHAT_INGEST_ORG_ID", "");
    const result = await resolveChatIngestOrgId();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("chat_ingest_org_not_configured");
      expect(result.httpStatus).toBe(503);
    }
  });

  it("fails closed when org id in env does not exist in db", async () => {
    vi.stubEnv("CHAT_INGEST_ORG_ID", "org-missing");
    mockDbReturning([]);
    const result = await resolveChatIngestOrgId();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("chat_ingest_org_not_found");
      expect(result.httpStatus).toBe(503);
    }
  });

  it("returns organizationId when env and db row are valid", async () => {
    vi.stubEnv("CHAT_INGEST_ORG_ID", "org-valid");
    mockDbReturning([{ id: "org-valid", name: "Valid Org" }]);
    const result = await resolveChatIngestOrgId();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organizationId).toBe("org-valid");
    }
  });
});
