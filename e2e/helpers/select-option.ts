import type { Page } from "@playwright/test";

/** Avoid brittle exact label matches (Unicode dashes, DB drift). */
export async function selectOptionContaining(
  page: Page,
  selectName: string,
  textSubstring: string,
): Promise<void> {
  const sel = page.locator(`select[name="${selectName}"]`);
  const option = sel
    .locator("option")
    .filter({ hasText: textSubstring })
    .first();
  const value = await option.getAttribute("value");
  if (value == null || value === "") {
    throw new Error(
      `No option containing "${textSubstring}" in select[name="${selectName}"]`,
    );
  }
  await sel.selectOption(value);
}
