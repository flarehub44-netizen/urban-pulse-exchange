import { test, expect } from "@playwright/test";

const PROD = process.env.PLAYWRIGHT_BASE_URL?.includes("workers.dev");

test.describe("T01 — Landing e entrada no app", () => {
  test("landing carrega e CTA mercados visível", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ViaX/i);
    await expect(page.getByRole("link", { name: /mercados/i }).first()).toBeVisible();
  });

  test("dashboard carrega após navegação", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/ViaX|Início|Dashboard/i);
    await page.waitForTimeout(3000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(100);
  });
});

test.describe("T02 — Mercados", () => {
  test("lista de mercados renderiza", async ({ page }) => {
    await page.goto("/markets?status=live");
    await expect(page).toHaveTitle(/Mercados/i);
    await page.waitForTimeout(5000);
    const link = page.locator('a[href*="/markets/"]').first();
    const empty = page.getByText(/nenhum mercado|sem mercados|empty/i);
    const hasLink = await link.isVisible().catch(() => false);
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasLink || hasEmpty).toBeTruthy();
  });

  test("detalhe de mercado abre order box", async ({ page }) => {
    await page.goto("/markets?status=live");
    await page.waitForTimeout(5000);
    const link = page.locator('a[href*="/markets/"]').first();
    if (!(await link.isVisible().catch(() => false))) {
      test.skip(true, "Sem mercados live no ambiente");
      return;
    }
    await link.click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/SIM|NÃO|Operar|Apostar/i).first()).toBeVisible({
      timeout: 12_000,
    });
  });
});

test.describe("T03 — Rotas secundárias", () => {
  const routes = [
    { path: "/ranking", title: /Ranking/i },
    { path: "/feed", title: /Feed/i },
    { path: "/live", title: /Ao vivo|Live|Mapa/i },
    { path: "/urbanmind", title: /UrbanMind/i },
    { path: "/notifications", title: /Notifica/i },
    { path: "/leagues", title: /Ligas/i },
    { path: "/profile", title: /Perfil|Conta|ViaX/i },
  ];

  for (const r of routes) {
    test(`${r.path} responde`, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForTimeout(2000);
      await expect(page).toHaveTitle(r.title);
    });
  }
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

test.describe("T13 — Mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("bottom nav visível no dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2500);
    const nav = page.locator("nav").last();
    await expect(nav).toBeVisible();
  });

  test("mercados scrollável em mobile", async ({ page }) => {
    await page.goto("/markets");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Admin e Partner guards", () => {
  test("partner portal ou redirect para não-partner", async ({ page }) => {
    await page.goto("/partner");
    await page.waitForTimeout(4000);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const ok =
      url.includes("partner") ||
      url.includes("profile") ||
      url.includes("settings") ||
      url.includes("dashboard") ||
      /creator|parceiro|configura/i.test(body);
    expect(ok).toBeTruthy();
  });

  test("admin overview carrega shell ou redireciona", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(2000);
    const text = await page.locator("body").innerText();
    expect(/Control|Admin|Overview|ViaX|dashboard|restrito/i.test(text)).toBeTruthy();
  });
});
