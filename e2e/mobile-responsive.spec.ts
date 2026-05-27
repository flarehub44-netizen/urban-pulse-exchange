import { test, expect } from "@playwright/test";
import { primeAppStorage, dismissOnboardingIfOpen, waitForMarketCards } from "./helpers/markets";
import { gotoAndAssertMobileLayout, expectNoPageOverflow } from "./helpers/responsive";
import { hasPlaywrightCredentials, loginWithTestUser } from "./helpers/auth";

test.describe("Mobile — rotas públicas", () => {
  test.beforeEach(async ({ page }) => {
    await primeAppStorage(page);
  });

  const publicRoutes: { path: string; title?: RegExp; waitMs?: number }[] = [
    { path: "/", title: /ViaX/i, waitMs: 2000 },
    { path: "/markets?status=live", title: /Mercados/i, waitMs: 2500 },
    { path: "/ranking", title: /Ranking/i, waitMs: 2000 },
    { path: "/live", title: /Ao vivo|Live|Mapa/i, waitMs: 2000 },
    { path: "/football", title: /Futebol/i, waitMs: 2000 },
    { path: "/urbanmind", title: /UrbanMind/i, waitMs: 2000 },
    { path: "/?auth=login", waitMs: 2000 },
  ];

  for (const route of publicRoutes) {
    test(`${route.path} sem overflow horizontal`, async ({ page }) => {
      await gotoAndAssertMobileLayout(page, route.path, {
        title: route.title,
        waitMs: route.waitMs,
      });
    });
  }

  test("detalhe de mercado live sem overflow", async ({ page }) => {
    test.setTimeout(60_000);
    await waitForMarketCards(page, 1, 30_000);
    await dismissOnboardingIfOpen(page);
    const link = page.locator('[data-testid="market-card-link"]').first();
    await link.click();
    await page.waitForURL(/\/markets\//, { timeout: 15_000 });
    await page.waitForTimeout(1500);
    await expectNoPageOverflow(page);
  });
});

test.describe("Mobile — app autenticado", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasPlaywrightCredentials(), "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");
    await loginWithTestUser(page);
  });

  const appRoutes: { path: string; title?: RegExp }[] = [
    { path: "/dashboard", title: /ViaX|Início|Dashboard/i },
    { path: "/wallet", title: /Carteira|ViaX/i },
    { path: "/feed", title: /Feed/i },
    { path: "/positions", title: /previs/i },
    { path: "/settings", title: /Configura/i },
    { path: "/profile", title: /Perfil|Conta|ViaX/i },
  ];

  for (const route of appRoutes) {
    test(`${route.path} sem overflow horizontal`, async ({ page }) => {
      await gotoAndAssertMobileLayout(page, route.path, { title: route.title, waitMs: 2500 });
      await expect(page.getByRole("navigation").first()).toBeVisible();
    });
  }
});

test.describe("Mobile — admin (requer usuário admin)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasPlaywrightCredentials(), "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");
    await loginWithTestUser(page);
  });

  const adminRoutes = [
    "/admin",
    "/admin/risk",
    "/admin/traffic-events",
    "/admin/partners",
    "/admin/users",
    "/admin/markets",
    "/admin/bonuses",
    "/admin/events",
  ];

  for (const path of adminRoutes) {
    test(`${path} carrega sem overflow de página`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const onAdmin = page.url().includes("/admin");
      if (!onAdmin) {
        test.skip(true, "Usuário de teste não é admin — pule ou use conta admin");
      }
      await expectNoPageOverflow(page);
      await expect(page.locator("main, h1").first()).toBeVisible();
    });
  }
});

test.describe("Mobile — partner", () => {
  test("partner portal sem overflow quando acessível", async ({ page }) => {
    test.skip(!hasPlaywrightCredentials(), "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");
    await loginWithTestUser(page);
    await page.goto("/partner", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    if (!page.url().includes("/partner")) {
      test.skip(true, "Usuário de teste não é partner");
    }
    await expectNoPageOverflow(page);
  });
});
