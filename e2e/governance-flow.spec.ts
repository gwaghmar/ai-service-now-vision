import { expect, test } from "@playwright/test";
import { setUserRole } from "./helpers/pg";
import { selectOptionContaining } from "./helpers/select-option";

test.describe("Governance flow (full stack)", () => {
  test("requester submits request and approver approves to fulfilled", async ({
    page,
  }) => {
    test.skip(
      !process.env.DATABASE_URL?.trim(),
      "Set DATABASE_URL (see README / docker-compose.yml)",
    );

    const ts = Date.now();
    const approverEmail = `e2e-approver-${ts}@example.com`;
    const requesterEmail = `e2e-requester-${ts}@example.com`;
    const password = "e2e-secure-pass-123456!";

    await page.goto("/sign-up");
    await expect(
      page.getByRole("heading", { name: "Create account" }),
    ).toBeVisible();

    await page.getByLabel("Name").fill("E2E Approver");
    await page.getByLabel("Email").fill(approverEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
      timeout: 45_000,
    });

    await expect(page.getByRole("button", { name: "Copilot" })).toBeVisible();

    await setUserRole(approverEmail, "approver");

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/sign-in/, { timeout: 15_000 });

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("E2E Requester");
    await page.getByLabel("Email").fill(requesterEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
      timeout: 45_000,
    });

    await page
      .getByRole("link", { name: "New request", exact: true })
      .click();
    await page.waitForURL(/\/requests\/new/, { timeout: 15_000 });

    await selectOptionContaining(page, "requestTypeId", "Human data access");

    await page.locator('input[name="resource"]').fill("e2e-analytics-proj");
    await page
      .locator('textarea[name="reason"]')
      .fill("E2E automated verification");
    await page.locator('input[name="duration_days"]').fill("7");

    await page.getByRole("button", { name: "Submit request" }).click();
    await page.waitForURL(/\/requests\/[a-f0-9-]+$/i, { timeout: 30_000 });

    await expect(
      page.getByText("Waiting for approval").first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/sign-in/, { timeout: 15_000 });

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(approverEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("link", { name: "Approvals" }).click();
    await page.waitForURL(/\/approvals/, { timeout: 15_000 });

    const requestDetailLinks = page.locator('a[href^="/requests/"]');
    const n = await requestDetailLinks.count();
    let clicked = false;
    for (let i = 0; i < n; i++) {
      const href = await requestDetailLinks.nth(i).getAttribute("href");
      if (href && href !== "/requests/new") {
        await requestDetailLinks.nth(i).click();
        clicked = true;
        break;
      }
    }
    expect(clicked).toBe(true);

    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Approve" }).click();

    await expect(page.getByText("Done").first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
