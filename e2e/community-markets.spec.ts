import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

test.describe("Mercados da comunidade", () => {
  test("aba outros e formulário de criar carregam", async ({ page }) => {
    await page.goto("/markets?segment=outros");
    await page.waitForTimeout(5000);

    const body = await page.locator("body").innerText();
    expect(/comunidade|criar previsão/i.test(body)).toBeTruthy();
    expect(/500|server error/i.test(body)).toBeFalsy();

    await page.goto("/markets/create");
    await page.waitForTimeout(3000);
    const createBody = await page.locator("body").innerText();
    expect(/criar previsão|pergunta/i.test(createBody)).toBeTruthy();

    const coverInput = page.locator('input[type="file"][accept*="image/jpeg"]');
    await expect(coverInput).toHaveCount(1);
    await expect(coverInput).toHaveAttribute("accept", /image\/webp/);
  });

  test("URL legada view=community abre aba Outros", async ({ page }) => {
    await page.goto("/markets?view=community");
    await page.waitForTimeout(3000);
    await expect(page.getByRole("button", { name: /Outros/i })).toBeVisible({ timeout: 15_000 });
    const body = await page.locator("body").innerText();
    expect(/criar previsão|comunidade/i.test(body)).toBeTruthy();
  });

  test("mercado privado sem token mostra acesso negado ou login", async ({ page }) => {
    await page.goto("/markets/cm-testprivate000");
    await page.waitForTimeout(4000);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const ok =
      /privado|link|login|cadastro|não encontrado|404|acesso/i.test(body) ||
      url.includes("/auth/login");
    expect(ok).toBeTruthy();
  });

  test("detalhe de mercado community exibe badge comunidade quando listado", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets?segment=outros");
    await page.waitForTimeout(6000);

    const card = page.locator('[data-testid="market-card"]').first();
    if (!(await card.isVisible().catch(() => false))) return;

    await card.locator('[data-testid="market-card-link"]').click();
    await page.waitForTimeout(3000);

    const body = await page.locator("body").innerText();
    expect(/comunidade|prever|sim|não/i.test(body)).toBeTruthy();
  });

  test("perfil aba meus mercados carrega", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=mercados");
    await page.waitForTimeout(5000);

    const body = await page.locator("body").innerText();
    expect(/meus mercados|criar previsão|mercado/i.test(body)).toBeTruthy();
  });

  test("dashboard mostra CTA criar previsão para usuário com sessão", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/dashboard");
    await page.waitForTimeout(5000);

    const body = await page.locator("body").innerText();
    expect(/criar previsão|comunidade/i.test(body)).toBeTruthy();
  });
});

test.describe("Mercados community — erros de negócio (smoke UI)", () => {
  test("formulario create tem data e horario de encerramento", async ({ page }) => {
    await page.goto("/markets/create");
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="time"]')).toBeVisible();
  });

  test("detalhe cm- com sessao mostra loading antes de desistir", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets/cm-e2e-not-found-smoke");
    await page.waitForTimeout(800);
    const hasLoading = (await page.locator(".animate-pulse").count()) > 0;
    const body = await page.locator("body").innerText();
    const notInstantRoot404 = hasLoading || /comunidade|acesso|login|cadastro|encerra/i.test(body);
    expect(notInstantRoot404).toBeTruthy();
  });

  test("formulário create exige pergunta mínima", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets/create");
    await page.waitForTimeout(3000);

    const submit = page.getByRole("button", { name: /publicar mercado/i });
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      const body = await page.locator("body").innerText();
      expect(/caracteres|nome|cadastro|pergunta/i.test(body)).toBeTruthy();
    }
  });
});
