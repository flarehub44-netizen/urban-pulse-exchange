import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";
import {
  expectAuthGate,
  expectCanonicalPath,
  expectProtectedRoute,
  hasPlaywrightCredentials,
  loginWithTestUser,
} from "./helpers/auth";

test.describe("C1 — Autenticação e sessão", () => {
  test("dashboard sem login abre modal de autenticação", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(4000);

    const url = page.url();
    expect(url).not.toContain("/auth/error");
    const body = await page.locator("body").innerText();
    const hasAuthModal =
      (await page
        .getByRole("heading", { name: /entrar na viax|criar conta/i })
        .isVisible()
        .catch(() => false)) || /auth=login|auth=signup/i.test(url);
    expect(hasAuthModal || /entrar|criar conta|login/i.test(body)).toBeTruthy();
  });
});

test.describe("C1b — Páginas de auth formal", () => {
  test("callback de auth carrega sem erro", async ({ page }) => {
    await page.goto("/auth/callback");
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    const url = page.url();
    expect(/confirmando|aguarde|erro|mercados|viax/i.test(body) || /\/markets|\/dashboard/.test(url)).toBeTruthy();
    expect(/500|server error|before initialization/i.test(body)).toBeFalsy();
  });

  test("login e signup carregam formulários", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForTimeout(2500);
    await expect(page.getByRole("heading", { name: /entrar na viax/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.goto("/auth/signup");
    await page.waitForTimeout(2500);
    await expect(page.getByRole("heading", { name: /criar conta/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("admin redireciona não-autenticado para dashboard ou login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toMatch(/\/admin\/(users|markets)$/);
  });
});

test.describe("C5 — Rotas canônicas protegidas (sem sessão)", () => {
  test("/wallet exige autenticação", async ({ page }) => {
    await expectProtectedRoute(page, "/wallet");
  });

  test("/positions exige autenticação", async ({ page }) => {
    await expectProtectedRoute(page, "/positions");
  });

  test("/settings exige autenticação", async ({ page }) => {
    await expectProtectedRoute(page, "/settings");
  });

  test("/wallet?tab=deposit exige autenticação", async ({ page }) => {
    await expectProtectedRoute(page, "/wallet?tab=deposit");
  });
});

test.describe("C6 — URLs legadas do perfil (sem sessão)", () => {
  test("profile?tab=carteira exige login (antes do redirect canônico)", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/profile?tab=carteira");
    await page.waitForTimeout(3000);
    await expectAuthGate(page);
  });

  test("profile?tab=posicoes e config exigem login", async ({ page }) => {
    await primeAppStorage(page);
    for (const tab of ["posicoes", "config"] as const) {
      await page.goto(`/profile?tab=${tab}`);
      await page.waitForTimeout(2500);
      await expectAuthGate(page);
    }
  });

  test("abas do perfil in-app exigem login", async ({ page }) => {
    await primeAppStorage(page);
    for (const tab of ["badges", "favoritos", "mercados"] as const) {
      await page.goto(`/profile?tab=${tab}`);
      await page.waitForTimeout(2500);
      await expectAuthGate(page);
    }
  });
});

test.describe("C8 — Rotas canônicas com sessão E2E", () => {
  test.skip(!hasPlaywrightCredentials(), "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test("URLs legadas redirecionam para rotas canônicas", async ({ page }) => {
    await page.goto("/profile?tab=carteira");
    await expectCanonicalPath(page, /\/wallet(\?|$)/);

    await page.goto("/profile?tab=posicoes");
    await expectCanonicalPath(page, /\/positions(\?|$)/);

    await page.goto("/profile?tab=config");
    await expectCanonicalPath(page, /\/settings(\?|$)/);
  });

  test("/wallet renderiza carteira e abas", async ({ page }) => {
    await page.goto("/wallet");
    await page.waitForTimeout(2000);
    await expectCanonicalPath(page, /\/wallet/);
    await expect(page.getByRole("heading", { name: /carteira/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /depositar/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /histórico/i }).first()).toBeVisible();
  });

  test("/wallet?tab=deposit abre fluxo de depósito", async ({ page }) => {
    await page.goto("/wallet?tab=deposit");
    await page.waitForTimeout(2000);
    await expectCanonicalPath(page, /\/wallet/);
    const depositPanel =
      (await page.getByText(/adicionar.*saldo/i).isVisible().catch(() => false)) ||
      (await page.getByText(/conta registrada|cadastro/i).isVisible().catch(() => false));
    expect(depositPanel).toBeTruthy();
    const generateBtn = page.getByRole("button", { name: /gerar qr code pix/i });
    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(generateBtn).toBeEnabled();
    }
  });

  test("/positions renderiza painel de posições", async ({ page }) => {
    await page.goto("/positions");
    await page.waitForTimeout(2000);
    await expectCanonicalPath(page, /\/positions/);
    await expect(page.getByRole("heading", { name: /previsões/i })).toBeVisible();
  });

  test("/settings renderiza configurações", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(2000);
    await expectCanonicalPath(page, /\/settings/);
    const body = await page.locator("body").innerText();
    expect(/notificações|tema|conta|parceiro/i.test(body)).toBeTruthy();
  });

  test("dashboard → CTA leva a wallet ou positions conforme contexto", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);
    await expectCanonicalPath(page, /\/dashboard/);

    const primaryCta = page
      .getByRole("button", { name: /depositar agora|gerir posições|apostar agora/i })
      .first();
    if (await primaryCta.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await primaryCta.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toMatch(/\/wallet|\/positions|\/markets/);
    }
  });
});

test.describe("C9 — Funil depósito na carteira (sessão E2E)", () => {
  test.skip(!hasPlaywrightCredentials(), "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");
  test.describe.configure({ timeout: 90_000 });

  test("gerar QR Pix na /wallet dispara UI de pagamento ou feedback de erro", async ({ page }) => {
    await loginWithTestUser(page);
    await page.goto("/wallet?tab=deposit");
    await page.waitForTimeout(2500);

    const generateBtn = page.getByRole("button", { name: /gerar qr code pix/i });
    const needsRegister = await page.getByText(/cadastro|registr/i).isVisible().catch(() => false);

    if (needsRegister) {
      test.skip(true, "Usuário de teste não está registrado para depósito");
      return;
    }

    if (!(await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Aba de depósito indisponível para este usuário");
      return;
    }

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill("50");
    await generateBtn.click();

    const qrVisible = await page
      .getByText(/escaneie o qr code|pix copia e cola|aguardando confirmação/i)
      .first()
      .isVisible({ timeout: 20_000 })
      .catch(() => false);
    const errorToast = await page
      .getByText(/depósito falhou|informe um valor|erro/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(qrVisible || errorToast).toBeTruthy();
  });
});
