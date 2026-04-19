import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the db module
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(),
  },
}));

// Mock the schema
vi.mock("@/db/app-schema", () => ({
  fulfillmentJob: {
    requestId: "request_id_col",
  },
}));

import { db } from "@/db";
import { runManualProvisionFallback } from "@/server/connectors/manual-ticketing";

// Build a fluent mock chain: db.update().set().where() => void
function mockDbUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set });
  return { set, where };
}

describe("runManualProvisionFallback", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("safely stalls request states to manual_action_required", async () => {
    const { set, where } = mockDbUpdate();
    
    await runManualProvisionFallback({
      requestId: "req_123",
      requestTypeSlug: "github_access",
      organizationId: "org_1",
      requesterId: "usr_1",
      payload: {}
    });

    // Check we updated fulfillmentJob
    expect(db.update).toHaveBeenCalled();
    
    // Check we set the status to manual_action_required
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      status: "manual_action_required",
      lastError: expect.stringContaining("human intervention"),
      updatedAt: expect.any(Date)
    }));

    // Check we scoped it to the correct request ID
    expect(where).toHaveBeenCalled();
  });
});
