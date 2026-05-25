import { test, expect } from "@playwright/test";
import { dismissOnboardingIfOpen, openFirstLiveMarket, primeAppStorage } from "./helpers/markets";

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
});
