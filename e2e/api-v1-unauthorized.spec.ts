import { expect, test } from "@playwright/test";

test.describe("Agent API v1", () => {
  test("POST without bearer returns 401", async ({ request }) => {
    test.skip(!process.env.DATABASE_URL?.trim(), "DATABASE_URL");

    const res = await request.post("/api/v1/requests", {
      data: {
        requestTypeSlug: "human_data_access",
        requesterEmail: "nobody@example.com",
        payload: {},
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("unauthorized");
  });
});
