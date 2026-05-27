import { test, expect } from "@playwright/test";
import {
  buildPaymentReceivedPayload,
  hasSyncPayStaging,
  hasSyncPayWebhookSecret,
  signSyncPayWebhook,
} from "./helpers/syncpay";
import { hasPlaywrightCredentials, loginWithTestUser } from "./helpers/auth";

test.describe("SyncPay webhook — segurança", () => {
  test("rejeita assinatura inválida", async ({ request, baseURL }) => {
    test.skip(!hasSyncPayWebhookSecret(), "Defina SYNCPAY_WEBHOOK_SECRET");
    const body = JSON.stringify(
      buildPaymentReceivedPayload({ providerId: "e2e-invalid", amount: 50 }),
    );
    const res = await request.post(`${baseURL}/api/public/webhooks/syncpay`, {
      headers: {
        "Content-Type": "application/json",
        "x-syncpay-signature": "deadbeef",
        "x-syncpay-event-id": `e2e-invalid-${Date.now()}`,
      },
      data: body,
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("SyncPay — depósito staging", () => {
  test.skip(
    !hasPlaywrightCredentials() || !hasSyncPayStaging(),
    "Requer PLAYWRIGHT_TEST_* + SYNCPAY_API_KEY + SYNCPAY_WEBHOOK_SECRET",
  );
  test.describe.configure({ timeout: 120_000 });

  test("gerar QR Pix → webhook mock → confirma depósito", async ({ page, request, baseURL }) => {
    await loginWithTestUser(page);
    await page.goto("/wallet?tab=deposit");
    await page.waitForTimeout(2500);

    const needsRegister = await page.getByText(/cadastro|registr/i).isVisible().catch(() => false);
    if (needsRegister) {
      test.skip(true, "Usuário de teste não está registrado para depósito Pix");
      return;
    }

    const generateBtn = page.getByRole("button", { name: /gerar qr code pix/i });
    if (!(await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Aba de depósito indisponível");
      return;
    }

    await page.locator('input[type="number"]').first().fill("50");
    await generateBtn.click();

    const intentEl = page.getByTestId("deposit-intent-id");
    await expect(intentEl).toBeVisible({ timeout: 25_000 });
    const providerId = await intentEl.getAttribute("data-provider-id");
    expect(providerId).toBeTruthy();

    const payload = buildPaymentReceivedPayload({ providerId: providerId!, amount: 50 });
    const rawBody = JSON.stringify(payload);
    const signature = signSyncPayWebhook(rawBody);

    const webhookRes = await request.post(`${baseURL}/api/public/webhooks/syncpay`, {
      headers: {
        "Content-Type": "application/json",
        "x-syncpay-signature": signature,
        "x-syncpay-event-id": `e2e-paid-${Date.now()}`,
      },
      data: rawBody,
    });
    expect(webhookRes.ok()).toBeTruthy();

    await expect(page.getByText(/depósito confirmado|adicionado ao seu saldo/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
