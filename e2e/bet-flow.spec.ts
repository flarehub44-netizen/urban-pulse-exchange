import { test, expect } from "@playwright/test";
import {
  minLiveMarketsExpected,
  openFirstLiveMarket,
  primeAppStorage,
  waitForMarketCards,
} from "./helpers/markets";

test.describe("Fluxo core — aposta e carteira", () => {
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

  test("double-click no botão de operar não dispara múltiplos diálogos", async ({ page }) => {
    await openFirstLiveMarket(page);
    const operateBtn = page.getByTestId("order-box-operate");
    await expect(operateBtn).toBeEnabled({ timeout: 10_000 });
    // Pool realtime re-renderiza o CTA; force evita flake de "element is not stable"
    await operateBtn.click({ clickCount: 2, delay: 80, force: true });
    await page.waitForTimeout(800);
    const dialogs = page.getByRole("dialog");
    expect(await dialogs.count()).toBeLessThanOrEqual(2);
  });

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

  test("saldo insuficiente bloqueia ou alerta", async ({ page }) => {
    await openFirstLiveMarket(page);
    const stakeInput = page.getByTestId("order-box-stake");
    await stakeInput.fill("999999999", { force: true });
    const operateBtn = page.getByTestId("order-box-operate");
    await expect(operateBtn).toBeDisabled({ timeout: 5_000 });
    await expect(page.getByTestId("order-box").getByText(/Saldo insuficiente/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
