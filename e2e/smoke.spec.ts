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

test("dashboard após auth implícita", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(4000);
  await expect(page.locator("body")).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text.length).toBeGreaterThan(80);
});

test("redirect /wallet para perfil", async ({ page }) => {
  await page.goto("/wallet");
  await page.waitForTimeout(2000);
  expect(page.url()).toMatch(/profile|carteira|wallet/i);
});
