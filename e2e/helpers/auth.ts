import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { primeAppStorage } from "./markets";

const AUTH_URL = /auth=login|auth=signup/i;
const AUTH_BODY = /entrar na viax|criar conta|login|cadastro/i;

export function hasPlaywrightCredentials() {
  return !!(process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD);
}

/** Usuário não autenticado: modal de auth ou query `auth=`. */
export async function expectAuthGate(page: Page) {
  const url = page.url();
  const body = await page.locator("body").innerText();
  const gated = AUTH_URL.test(url) || AUTH_BODY.test(body);
  expect(gated).toBeTruthy();
}

/** Rota protegida não deve renderizar conteúdo autenticado sem sessão. */
export async function expectProtectedRoute(page: Page, path: string) {
  await primeAppStorage(page);
  await page.goto(path);
  await page.waitForTimeout(2500);
  await expectAuthGate(page);
}

export async function loginWithTestUser(page: Page) {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD são obrigatórios");
  }

  await primeAppStorage(page);
  await page.goto("/dashboard");
  await page.waitForTimeout(1500);

  const modalHeading = page.getByRole("heading", { name: /entrar na viax/i });
  if (await modalHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL(AUTH_URL, { timeout: 15_000 });
    return;
  }

  if (AUTH_URL.test(page.url())) {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL(AUTH_URL, { timeout: 15_000 });
  }
}

export async function expectCanonicalPath(page: Page, pathPattern: RegExp) {
  await page.waitForTimeout(1000);
  expect(page.url()).toMatch(pathPattern);
}
