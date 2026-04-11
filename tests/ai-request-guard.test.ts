import { describe, expect, it } from "vitest";
import { assertAiRequestGuard } from "@/server/ai/request-guard";

describe("assertAiRequestGuard", () => {
  it("rejects oversized request bodies", async () => {
    const req = new Request("http://x", {
      headers: { "content-length": "250000" },
    });
    await expect(() =>
      assertAiRequestGuard({
        req,
        organizationId: "org-1",
        userId: "user-1",
        messages: [],
      }),
    ).rejects.toThrow("Request body too large");
  });

  it("rejects very large message arrays", async () => {
    const req = new Request("http://x");
    const messages = Array.from({ length: 41 }, (_, i) => ({
      id: `m-${i}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: "hello" }],
    }));
    await expect(() =>
      assertAiRequestGuard({
        req,
        organizationId: "org-2",
        userId: "user-2",
        messages,
      }),
    ).rejects.toThrow("Too many messages");
  });
});
