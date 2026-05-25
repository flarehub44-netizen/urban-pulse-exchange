import { test, expect } from "@playwright/test";

test.describe("football admin", () => {
  test("redirects non-admin from admin football", async ({ page }) => {
    await page.goto("/admin/football");
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 });
    const url = page.url();
    expect(url.includes("/admin/football")).toBeFalsy();
  });

  test("seed market visible on public football hub without login", async ({ page }) => {
    await page.goto("/markets?segment=futebol");
    await expect(page.getByText(/São Paulo/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Corinthians/i).first()).toBeVisible();
  });
});
