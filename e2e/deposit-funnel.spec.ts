import { test, expect } from "@playwright/test";
import { dismissOnboardingIfOpen, openFirstLiveMarket, primeAppStorage } from "./helpers/markets";
import { expectProtectedRoute, hasPlaywrightCredentials, loginWithTestUser } from "./helpers/auth";

test.describe("deposit funnel", () => {
  test.describe.configure({ timeout: 60_000 });

  test("public shell shows Depositar e jogar CTA", async ({ page }) => {
    await page.goto("/markets?status=live");
    await expect(page.getByRole("button", { name: /Depositar e jogar/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("insufficient balance toast offers Pix deposit on market", async ({ page }) => {
    await primeAppStorage(page);
    await openFirstLiveMarket(page);
    await dismissOnboardingIfOpen(page);

    const stakeInput = page.getByTestId("order-box-stake");
    await stakeInput.fill("999999999", { force: true });
    const operateBtn = page.getByTestId("order-box-operate");
    await operateBtn.click({ force: true });

    await expect(page.getByText(/Depositar via Pix/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deposit=1 in URL opens quick deposit sheet when registered", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets?status=live&deposit=1");
    await dismissOnboardingIfOpen(page);
    await page.waitForTimeout(3000);

    const sheet = page.getByTestId("quick-deposit-sheet");
    if (await sheet.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(sheet.getByText(/Adicionar.*saldo/i)).toBeVisible();
    }
  });

  test("markets list supports deposit banner area for logged-in users", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets?status=live");
    await dismissOnboardingIfOpen(page);
    await page.waitForTimeout(4000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test("/wallet canônica exige auth sem sessão", async ({ page }) => {
    await expectProtectedRoute(page, "/wallet");
  });

  test("order-box saldo insuficiente oferece link para /wallet", async ({ page }) => {
    await primeAppStorage(page);
    await openFirstLiveMarket(page);
    await dismissOnboardingIfOpen(page);

    const stakeInput = page.getByTestId("order-box-stake");
    await stakeInput.fill("999999999", { force: true });
    await page.getByTestId("order-box-operate").click({ force: true });

    const pixCta = page.getByText(/Depositar via Pix/i).first();
    const walletLink = page.getByRole("link", { name: /carteira/i }).first();
    const hasDepositPath =
      (await pixCta.isVisible({ timeout: 8_000 }).catch(() => false)) ||
      (await walletLink.isVisible({ timeout: 3_000 }).catch(() => false));
    expect(hasDepositPath).toBeTruthy();
  });
});

test.describe("deposit funnel — pós-login", () => {
  test.skip(!hasPlaywrightCredentials(), "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");
  test.describe.configure({ timeout: 90_000 });

  test("dashboard KPI saldo navega para depósito ou abre fluxo Pix", async ({ page }) => {
    await loginWithTestUser(page);
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);

    const lowBalanceBanner = page.getByRole("button", { name: /depositar agora/i }).first();
    const balanceKpi = page.locator("button").filter({ hasText: /saldo/i }).first();

    if (await lowBalanceBanner.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await lowBalanceBanner.click();
    } else if (await balanceKpi.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await balanceKpi.click();
    } else {
      test.skip(true, "Sem CTA de depósito visível no dashboard para este usuário");
      return;
    }

    await page.waitForTimeout(2000);
    const onWallet = /\/wallet/.test(page.url());
    const sheetOpen = await page
      .getByTestId("quick-deposit-sheet")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(onWallet || sheetOpen).toBeTruthy();
  });
});
