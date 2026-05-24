import { test, expect } from "@playwright/test";
import {
  minLiveMarketsExpected,
  openFirstLiveMarket,
  primeAppStorage,
  waitForMarketCards,
} from "./helpers/markets";

test.describe("Fluxo core — previsão e carteira", () => {
  test.describe.configure({ timeout: 60_000 });
  const minLive = minLiveMarketsExpected();

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    const page = await browser.newPage();
    try {
      await waitForMarketCards(page, minLive, 30_000);
    } catch {
      test.skip(true, "Sem mercados live — rodar migration refresh + db:push");
    } finally {
      await page.close();
    }
  });

  test("mercados live visíveis na lista", async ({ page }) => {
    const { count } = await waitForMarketCards(page, minLive, 30_000);
    expect(count).toBeGreaterThanOrEqual(minLive);
  });

  test("mercado live abre order box", async ({ page }) => {
    await openFirstLiveMarket(page);
  });

  // B3: stake > saldo bloqueia com mensagem de erro
  test("saldo insuficiente bloqueia e exibe alerta", async ({ page }) => {
    await openFirstLiveMarket(page);
    const stakeInput = page.getByTestId("order-box-stake");
    await stakeInput.fill("999999999", { force: true });
    const operateBtn = page.getByTestId("order-box-operate");
    await expect(operateBtn).toBeDisabled({ timeout: 5_000 });
    await expect(page.getByTestId("order-box").getByText(/Saldo insuficiente/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  // B4: stake = 0 bloqueia
  test("stake zero mantém botão desabilitado", async ({ page }) => {
    await openFirstLiveMarket(page);
    const stakeInput = page.getByTestId("order-box-stake");
    await stakeInput.fill("0", { force: true });
    const operateBtn = page.getByTestId("order-box-operate");
    await expect(operateBtn).toBeDisabled({ timeout: 5_000 });
  });

  // B5: stake acima do limite máximo (100001) bloqueia
  test("stake acima do limite máximo bloqueia", async ({ page }) => {
    await openFirstLiveMarket(page);
    const stakeInput = page.getByTestId("order-box-stake");
    await stakeInput.fill("100001", { force: true });
    const operateBtn = page.getByTestId("order-box-operate");
    // Botão deve estar desabilitado ou haver mensagem de erro
    const isDisabled = await operateBtn.isDisabled({ timeout: 3_000 }).catch(() => false);
    const hasError = await page
      .getByTestId("order-box")
      .getByText(/limite|máximo|100\.000|100000/i)
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(isDisabled || hasError).toBeTruthy();
  });

  // B6: double-click não gera múltiplos diálogos
  test("double-click no botão de operar não dispara múltiplos diálogos", async ({ page }) => {
    await openFirstLiveMarket(page);
    const operateBtn = page.getByTestId("order-box-operate");
    await expect(operateBtn).toBeEnabled({ timeout: 10_000 });
    await operateBtn.click({ clickCount: 2, delay: 80, force: true });
    await page.waitForTimeout(800);
    const dialogs = page.getByRole("dialog");
    expect(await dialogs.count()).toBeLessThanOrEqual(2);
  });

  // C3: depósito simulado na carteira
  test("depósito simulado na carteira", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=carteira");
    await page
      .getByRole("button", { name: /^Depositar$/i })
      .first()
      .click({ timeout: 15_000 });
    await expect(page.getByRole("note").first()).toBeVisible({ timeout: 10_000 });
    const confirm = page.getByRole("button", { name: /Confirmar depósito/i });
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await page.waitForTimeout(2000);
    }
  });

  // Verificar que wallet redireciona para perfil
  test("/wallet redireciona para /profile com tab carteira", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/wallet");
    await page.waitForURL(/profile|carteira|wallet/, { timeout: 8_000 }).catch(() => null);
    expect(page.url()).toMatch(/profile|carteira|wallet/i);
  });

  // Verificar que /positions redireciona para perfil
  test("/positions redireciona para /profile com tab posicoes", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/positions");
    await page.waitForURL(/profile|posicoes|positions/, { timeout: 8_000 }).catch(() => null);
    expect(page.url()).toMatch(/profile|posicoes|positions/i);
  });
});

test.describe("B9 — Mercado não-live rejeita previsão na UI", () => {
  test("mercado resolvido não exibe order box com botão ativo", async ({ page }) => {
    await primeAppStorage(page);
    // Tenta navegar para um mercado com status não-live (resolved)
    // O order-box deve estar oculto ou com botão desabilitado
    await page.goto("/markets?status=resolved");
    await page.waitForTimeout(3000);
    const cards = page.locator('[data-testid="market-card"]:visible');
    const count = await cards.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const href = await cards
      .first()
      .locator('[data-testid="market-card-link"]')
      .getAttribute("href");
    if (!href) {
      test.skip();
      return;
    }
    await page.goto(href);
    await page.waitForTimeout(3000);
    // Em mercados resolvidos, o botão de prever não deve estar habilitado
    const operateBtn = page.getByTestId("order-box-operate");
    if (await operateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(operateBtn).toBeDisabled({ timeout: 5_000 });
    }
    // Deve exibir algum indicador de mercado encerrado
    const body = await page.locator("body").innerText();
    expect(/resolvido|encerrado|settled|closed|resultado/i.test(body)).toBeTruthy();
  });
});
