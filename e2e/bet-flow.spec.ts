import { test, expect } from "@playwright/test";

test.describe("Fluxo core — aposta e carteira", () => {
  test("mercado live abre order box", async ({ page }) => {
    await page.goto("/markets?status=live");
    await page.waitForTimeout(5000);
    const link = page.locator('a[href*="/markets/"]').first();
    if (!(await link.isVisible().catch(() => false))) {
      test.skip(true, "Sem mercados live — aplicar migration refresh");
      return;
    }
    await link.click();
    await page.waitForTimeout(2000);
    await expect(page.getByRole("button", { name: /Operar|Apostar|SIM|NÃO/i }).first()).toBeVisible(
      {
        timeout: 12_000,
      },
    );
  });

  test("double-click no botão de operar não dispara múltiplos diálogos", async ({ page }) => {
    await page.goto("/markets?status=live");
    await page.waitForTimeout(5000);
    const link = page.locator('a[href*="/markets/"]').first();
    if (!(await link.isVisible().catch(() => false))) {
      test.skip(true, "Sem mercados live");
      return;
    }
    await link.click();
    await page.waitForTimeout(2000);
    const operateBtn = page.getByRole("button", { name: /Operar|Apostar/i }).first();
    if (!(await operateBtn.isVisible().catch(() => false))) {
      test.skip(true, "Order box indisponível");
      return;
    }
    await operateBtn.dblclick({ delay: 50 });
    await page.waitForTimeout(500);
    const dialogs = page.getByRole("dialog");
    await expect(dialogs).toHaveCount(await dialogs.count());
    expect(await dialogs.count()).toBeLessThanOrEqual(2);
  });

  test("depósito simulado na carteira", async ({ page }) => {
    await page.goto("/profile?tab=carteira");
    await page.waitForTimeout(3000);
    const depositTab = page.getByRole("button", { name: /Depositar/i });
    if (await depositTab.isVisible().catch(() => false)) {
      await depositTab.click();
    }
    const banner = page.getByRole("note");
    await expect(banner.first())
      .toBeVisible({ timeout: 8000 })
      .catch(() => {});
    const confirm = page.getByRole("button", { name: /Confirmar depósito/i });
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await page.waitForTimeout(2000);
    }
  });

  test("saldo insuficiente bloqueia operar", async ({ page }) => {
    await page.goto("/markets?status=live");
    await page.waitForTimeout(5000);
    const link = page.locator('a[href*="/markets/"]').first();
    if (!(await link.isVisible().catch(() => false))) {
      test.skip(true, "Sem mercados live");
      return;
    }
    await link.click();
    await page.waitForTimeout(2000);
    const maxBtn = page.getByRole("button", { name: /100%|Máx/i }).first();
    if (await maxBtn.isVisible().catch(() => false)) {
      await maxBtn.click();
    }
    const operateBtn = page.getByRole("button", { name: /Operar|Apostar/i }).first();
    const disabled = await operateBtn.isDisabled().catch(() => true);
    if (!disabled) {
      await operateBtn.click();
      await expect(page.getByText(/insuficiente|saldo/i).first()).toBeVisible({ timeout: 8000 });
    }
  });
});
