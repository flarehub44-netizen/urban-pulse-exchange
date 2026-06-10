import { test, expect } from "@playwright/test";
import { loginWithTestUser, hasPlaywrightCredentials } from "./helpers/auth";

test.describe("Admin prediction markets", () => {
  test.skip(!hasPlaywrightCredentials(), "Needs PLAYWRIGHT_TEST_EMAIL/PASSWORD");

  test("multi-outcome tab shows create form", async ({ page }) => {
    await loginWithTestUser(page);
    await page.goto("/admin/markets?tab=multi");
    await expect(page.getByText(/multi-outcome|N vias/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page
        .getByLabel(/pergunta/i)
        .or(page.getByText(/pergunta/i))
        .first(),
    ).toBeVisible();
  });

  test("create event hub links to multi-outcome", async ({ page }) => {
    await loginWithTestUser(page);
    await page.goto("/admin/create-event");
    await expect(page.getByRole("heading", { name: /criar evento/i })).toBeVisible();
    await page.getByRole("link", { name: /mercado multi-outcome/i }).click();
    await expect(page).toHaveURL(/tab=multi/);
  });
});
