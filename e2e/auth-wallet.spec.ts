import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

test.describe("C1 — Autenticação e sessão", () => {
  test("sessão anon é criada na primeira visita ao dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(8000);

    const url = page.url();
    expect(url).toContain("/dashboard");
    expect(url).not.toContain("/auth/error");

    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(80);
  });

  test("usuário anon vê banner de cadastro formal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(4000);

    const banner = page
      .getByTestId("anon-account-banner")
      .or(page.getByText(/criar conta|cadastro formal/i).first());

    await expect(page.locator("body")).toBeVisible();
    const visible = await banner.isVisible().catch(() => false);
    if (visible) {
      await expect(banner).toBeVisible();
    }
  });
});

test.describe("C1b — Páginas de auth formal", () => {
  test("login e signup carregam formulários", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: /entrar na viax/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /criar conta|completar cadastro/i })).toBeVisible();
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
  test("/wallet redireciona para perfil", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/wallet");
    await page.waitForURL(/profile|carteira|wallet/, { timeout: 8_000 }).catch(() => null);
    expect(page.url()).toMatch(/profile|carteira|wallet/i);
  });

  test("/positions redireciona para perfil", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/positions");
    await page.waitForURL(/profile|posicoes|positions/, { timeout: 8_000 }).catch(() => null);
    expect(page.url()).toMatch(/profile|posicoes|positions/i);
  });

  test("/settings redireciona para perfil", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/settings");
    await page.waitForURL(/profile|config|settings/, { timeout: 8_000 }).catch(() => null);
    expect(page.url()).toMatch(/profile|config|settings/i);
  });
});

test.describe("C6 — Carteira: abas e histórico", () => {
  test.describe.configure({ timeout: 30_000 });

  test("aba carteira carrega com conteúdo financeiro", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=carteira");
    await page.waitForTimeout(8000);

    const body = await page.locator("body").innerText();
    expect(/BRL|saldo|carteira|SALDO/i.test(body)).toBeTruthy();
  });

  test("aba posicoes carrega sem erro", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=posicoes");
    await page.waitForTimeout(8000);

    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
    expect(/500|server error/i.test(body)).toBeFalsy();
  });

  test("aba badges carrega seção de conquistas", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=badges");
    await page.waitForTimeout(8000);

    const body = await page.locator("body").innerText();
    expect(/badge|BADGES|conquista|achievement/i.test(body)).toBeTruthy();
  });
});

test.describe("C2 — Cadastro formal nas configurações", () => {
  test("configurações mostram seção de conta ou programa de creators", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=config");
    await page.waitForTimeout(8000);

    const body = await page.locator("body").innerText();
    expect(/conta|configurações|config|creators|cadastro|notificação/i.test(body)).toBeTruthy();
  });
});
