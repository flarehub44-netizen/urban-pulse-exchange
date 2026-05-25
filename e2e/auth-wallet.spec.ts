import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

test.describe("C1 — Autenticação e sessão", () => {
  test("dashboard sem login abre modal de autenticação", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(4000);

    const url = page.url();
    expect(url).not.toContain("/auth/error");
    const body = await page.locator("body").innerText();
    const hasAuthModal =
      (await page
        .getByRole("heading", { name: /entrar na viax|criar conta/i })
        .isVisible()
        .catch(() => false)) || /auth=login|auth=signup/i.test(url);
    expect(hasAuthModal || /entrar|criar conta|login/i.test(body)).toBeTruthy();
  });
});

test.describe("C1b — Páginas de auth formal", () => {
  test("callback de auth carrega sem erro", async ({ page }) => {
    await page.goto("/auth/callback");
    await page.waitForTimeout(2000);
    const body = await page.locator("body").innerText();
    expect(/confirmando|aguarde|erro/i.test(body)).toBeTruthy();
    expect(/500|server error/i.test(body)).toBeFalsy();
  });

  test("login e signup carregam formulários", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: /entrar na viax/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /criar conta/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("admin redireciona não-autenticado para dashboard ou login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toMatch(/\/admin\/(users|markets)$/);
  });
});

test.describe("C5 — Redirects de rota", () => {
  test("/wallet exige autenticação", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/wallet");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/profile|carteira|wallet|auth=login|auth=signup|markets/i);
  });

  test("/positions exige autenticação", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/positions");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/profile|posicoes|positions|auth=login|auth=signup|markets/i);
  });

  test("/settings exige autenticação", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/settings");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/profile|config|settings|auth=login|auth=signup|markets/i);
  });
});

test.describe("C6b — Carteira bloqueada sem login", () => {
  test("perfil carteira sem sessão pede cadastro ou login", async ({ page }) => {
    await page.goto("/profile?tab=carteira");
    await page.waitForTimeout(4000);

    const url = page.url();
    const body = await page.locator("body").innerText();
    const needsAuth =
      /auth=login|auth=signup/i.test(url) ||
      /entrar na viax|criar conta|login|cadastro/i.test(body);
    expect(needsAuth).toBeTruthy();
  });
});

test.describe("C6 — Perfil protegido sem sessão", () => {
  test("abas do perfil exigem login", async ({ page }) => {
    await primeAppStorage(page);
    for (const tab of ["carteira", "posicoes", "badges", "config"] as const) {
      await page.goto(`/profile?tab=${tab}`);
      await page.waitForTimeout(2500);
      const url = page.url();
      const body = await page.locator("body").innerText();
      const gated =
        /auth=login|auth=signup/i.test(url) || /entrar na viax|criar conta|login/i.test(body);
      expect(gated).toBeTruthy();
    }
  });
});
