import { test, expect } from "@playwright/test";

test("landing carrega com título ViaX", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ViaX/i);
  await expect(page.getByRole("link", { name: /mercados/i }).first()).toBeVisible();
});

test("rota mercados responde", async ({ page }) => {
  await page.goto("/markets");
  await expect(page).toHaveTitle(/Mercados/i);
});
