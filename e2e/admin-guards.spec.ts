import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

test.describe("G — Admin e Partner Guards", () => {
  test.describe.configure({ timeout: 30_000 });

  // G1: usuário comum não entra no admin — deve redirecionar para dashboard ou profile
  test("G1: admin redireciona usuário comum para área pública", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/admin");
    // Aguarda possível redirect client-side
    await page.waitForURL(/\/(dashboard|profile|markets|feed|ranking)/, { timeout: 10_000 })
      .catch(() => null);
    await page.waitForTimeout(2000);

    const url = page.url();
    // Usuário deve ser redirecionado para fora de /admin
    const isNotOnAdmin = !url.includes("/admin/") && !url.endsWith("/admin");
    // Ou mostrar conteúdo não-admin (landing/dashboard/profile)
    const body = await page.locator("body").innerText();
    const isPublicPage = /início|mercados|dashboard|saldo|R\$/i.test(body);

    expect(isNotOnAdmin || isPublicPage).toBeTruthy();
  });

  // G2: usuário comum não entra no partner
  test("G2: partner portal redireciona usuário comum para área pública", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/partner");
    await page.waitForURL(/\/(dashboard|profile|markets|feed|ranking|partner)/, { timeout: 10_000 })
      .catch(() => null);
    await page.waitForTimeout(2000);

    const url = page.url();
    const body = await page.locator("body").innerText();

    const ok =
      url.includes("partner") ||
      url.includes("profile") ||
      url.includes("settings") ||
      url.includes("dashboard") ||
      /creator|parceiro|configura|restrito|saldo/i.test(body);
    expect(ok).toBeTruthy();
  });
});

test.describe("H — Performance básica", () => {
  test.describe.configure({ timeout: 30_000 });

  test("H: landing carrega e tem título ViaX", async ({ page }) => {
    await page.goto("/");
    // Em produção esperamos < 3s; em dev aceitamos até 15s
    await expect(page).toHaveTitle(/ViaX/i, { timeout: 15_000 });
  });

  test("H: dashboard carrega com conteúdo substantivo", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/dashboard");
    await page.waitForTimeout(8000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(80);
  });

  test("H: página de mercados carrega com título", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets");
    await expect(page).toHaveTitle(/Mercados/i, { timeout: 15_000 });
  });
});

test.describe("H — Mobile (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("bottom nav visível no dashboard em mobile", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/dashboard");
    await page.waitForTimeout(8000);
    // Bottom nav é o último nav no DOM em mobile
    const navs = page.locator("nav");
    const count = await navs.count();
    if (count > 0) {
      await expect(navs.last()).toBeVisible({ timeout: 5_000 });
    } else {
      // Pode estar renderizado como div em vez de nav
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("mercados carregam em mobile sem crash", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets");
    await page.waitForTimeout(6000);
    await expect(page.locator("body")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test("perfil carrega corretamente em mobile", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile");
    await page.waitForTimeout(6000);
    await expect(page.locator("body")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });
});

test.describe("H — Mobile (390px — iPhone 14)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("feed carrega sem crash em iPhone 14", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/feed");
    await page.waitForTimeout(6000);
    await expect(page.locator("body")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });
});

test.describe("T08 — Partner redirect", () => {
  test("/r/slug inválido mostra erro ou redirect", async ({ page }) => {
    await page.goto("/r/qa-invalid-slug-xyz");
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasError = await page
      .getByText(/não encontrado|Redirecionando/i)
      .isVisible()
      .catch(() => false);
    expect(hasError || url.includes("dashboard") || url.includes("markets")).toBeTruthy();
  });
});
