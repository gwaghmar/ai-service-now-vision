import { expect, test } from "@playwright/test";
import { setUserRole } from "./helpers/pg";
import { selectOptionContaining } from "./helpers/select-option";

test.describe("Change ticket pipeline", () => {
  test("draft through closed with approver gates", async ({ page }) => {
    test.skip(
      !process.env.DATABASE_URL?.trim(),
      "Set DATABASE_URL (see README / docker-compose.yml)",
    );

    const ts = Date.now();
    const approverEmail = `e2e-chg-approver-${ts}@example.com`;
    const requesterEmail = `e2e-chg-requester-${ts}@example.com`;
    const password = "e2e-secure-pass-123456!";
    const ticketTitle = `E2E change ${ts}`;

    await page.goto("/sign-up");
    await expect(
      page.getByRole("heading", { name: "Create account" }),
    ).toBeVisible();

    await page.getByLabel("Name").fill("E2E Change Approver");
    await page.getByLabel("Email").fill(approverEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
      timeout: 45_000,
    });

    await setUserRole(approverEmail, "approver");

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/sign-in/, { timeout: 15_000 });

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("E2E Change Requester");
    await page.getByLabel("Email").fill(requesterEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("link", { name: "New change" }).click();
    await page.waitForURL(/\/changes\/new/, { timeout: 15_000 });

    await selectOptionContaining(page, "changeTemplateId", "Reporting");

    await page.locator('input[name="title"]').fill(ticketTitle);

    await selectOptionContaining(page, "assignedUserId", requesterEmail);

    await page.locator('input[name="reporting_tool"]').fill("E2E BI");
    await page.locator('input[name="artifact_name"]').fill("E2E AP Report");
    await page
      .locator('textarea[name="change_summary"]')
      .fill("E2E pipeline verification");
    await page.locator('input[name="stakeholders"]').fill("E2E Finance");

    await page.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(/\/changes\/[a-f0-9-]+$/i, { timeout: 30_000 });

    await expect(page.getByText("Draft").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Move to On deck" }).click();
    await expect(page.getByText("On deck").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/changes");
    await page.getByRole("link", { name: "Assigned to me" }).click();
    await expect(page.getByText(ticketTitle).first()).toBeVisible({
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

    await page.goto("/changes");
    await page.getByRole("link", { name: "All" }).click();

    await page.getByRole("link", { name: ticketTitle }).click();

    await page.getByRole("button", { name: "Start Prelim UAT" }).click();
    await expect(page.getByText("Prelim UAT").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Advance to Final UAT" }).click();
    await expect(page.getByText("Final UAT").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Advance to Prod approval" }).click();
    await expect(page.getByText("Prod approval").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Approve release & close" }).click();
    await expect(page.getByText("Closed").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
