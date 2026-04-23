import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyRequestDecision } from "@/server/request-decision";
import { RequestDecision } from "@/server/request-decision";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => [
            {
              id: "request-123",
              organizationId: "org-1",
              status: "approved", // already approved!
              routingApproverIds: null,
              assignedApproverId: "approver-1",
            },
          ]),
        })),
      })),
    })),
    transaction: vi.fn(),
  },
}));

vi.mock("@/server/fulfillment-queue", () => ({
  enqueueFulfillmentJob: vi.fn(async () => "mock-job-id"),
}));

vi.mock("@/server/webhooks", () => ({
  deliverOrgWebhook: vi.fn(),
}));

describe("Idempotent Lifecycle Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should silently return if already approved with same decision", async () => {
    // applyRequestDecision for an already approved request.
    // If it wasn't idempotent, this would throw "Request is not awaiting approval."
    await expect(
      applyRequestDecision({
        organizationId: "org-1",
        requestId: "request-123",
        actorUserId: "admin-1",
        actorRole: "admin",
        decision: "approved",
      })
    ).resolves.toBeUndefined(); // Returns safely!
  });

  it("should throw if logic tries to transition an already approved request to denied", async () => {
    // If we pass decision="denied" but it's "approved", it should throw the
    // "Request is not awaiting approval" error because nextStatus != req.status.
    await expect(
      applyRequestDecision({
        organizationId: "org-1",
        requestId: "request-123",
        actorUserId: "admin-1",
        actorRole: "admin",
        decision: "denied", // Target mismatch
      })
    ).rejects.toThrow(/Request is not awaiting approval/i);
  });
});
