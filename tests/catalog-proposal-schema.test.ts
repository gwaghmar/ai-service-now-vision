import { describe, expect, it } from "vitest";
import {
  catalogProposalSchema,
  mockCatalogProposal,
} from "@/server/ai/catalog-proposal-schema";

describe("catalogProposalSchema", () => {
  it("accepts mock fixture", () => {
    const r = catalogProposalSchema.safeParse(mockCatalogProposal);
    expect(r.success).toBe(true);
  });

  it("rejects invalid slug", () => {
    const r = catalogProposalSchema.safeParse({
      requestTypes: [
        {
          slug: "BAD SLUG",
          title: "T",
          fieldSchema: { fields: [{ key: "a", label: "A", type: "text" }] },
          riskDefaults: {},
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});
