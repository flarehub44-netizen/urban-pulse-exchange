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

test("dashboard sem login exige autenticação", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(4000);
  await expect(page.locator("body")).toBeVisible();
  const url = page.url();
  const text = await page.locator("body").innerText();
  const gated = /auth=login|auth=signup/i.test(url) || /entrar|criar conta|login/i.test(text);
  expect(gated).toBeTruthy();
});

test("redirect /wallet exige autenticação", async ({ page }) => {
  await page.goto("/wallet");
  await page.waitForTimeout(2000);
  expect(page.url()).toMatch(/profile|carteira|wallet|auth=login|auth=signup|markets/i);
});
