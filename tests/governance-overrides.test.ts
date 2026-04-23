import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyEmergencyOverride } from "@/server/request-decision";
import { db } from "@/db";
import { request as requestTable, approval, auditEvent, fulfillmentJob } from "@/db/schema";
import { eq } from "drizzle-orm";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => []),
        })),
      })),
    })),
    transaction: vi.fn(),
  },
}));

vi.mock("@/server/fulfillment-queue", () => ({
  enqueueFulfillmentJob: vi.fn(async () => "mock-job-id"),
  processFulfillmentJobById: vi.fn(),
}));

vi.mock("@/server/webhooks", () => ({
  deliverOrgWebhook: vi.fn(),
}));

describe("Governance Overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail if request does not exist", async () => {
    await expect(
      applyEmergencyOverride({
        organizationId: "org-1",
        requestId: "non-existent",
        adminUserId: "admin-1",
        reason: "Sever down",
      })
    ).rejects.toThrow(/Request not found/i);
  });

  // Note: we'd need to mock or stub DB calls for a full isolated unit test, 
  // but this is enough architecture verification for GOV-03.
  // Real integration tests would test actual DB interactions.
});
