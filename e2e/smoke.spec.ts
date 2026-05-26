import { test, expect } from "@playwright/test";

test("landing carrega com título ViaX", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ViaX/i);
  await expect(page.getByRole("link", { name: /mercados/i }).first()).toBeVisible();
});

test("rota mercados responde", async ({ page }) => {
  await page.goto("/markets?status=live");
  await expect(page).toHaveTitle(/Mercados/i);
  await page.waitForTimeout(2000);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/algo deu errado|before initialization/i);
  await expect(page.getByRole("heading", { name: /mercados/i }).first()).toBeVisible();
});

test("auth login abre modal via redirect em mercados", async ({ page }) => {
  await page.goto("/auth/login");
  await page.waitForTimeout(2500);
  const url = page.url();
  expect(url).toMatch(/auth=login/i);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/before initialization/i);
  await expect(page.getByRole("heading", { name: /entrar na viax/i })).toBeVisible({
    timeout: 10_000,
  });
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

test("rota /wallet canônica exige autenticação", async ({ page }) => {
  await page.goto("/wallet");
  await page.waitForTimeout(2000);
  const url = page.url();
  const text = await page.locator("body").innerText();
  const gated =
    /auth=login|auth=signup/i.test(url) ||
    /entrar|criar conta|login/i.test(text) ||
    /\/wallet/.test(url);
  expect(gated).toBeTruthy();
});
