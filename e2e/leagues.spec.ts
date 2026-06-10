import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

test.describe("ligas privadas", () => {
  test("página /leagues carrega com título e ações", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/leagues");
    await expect(page).toHaveTitle(/Ligas/i, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Criar liga/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar com código/i })).toBeVisible();
  });

  test("ranking tab ligas renderiza", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/ranking?tab=ligas");
    await page.waitForTimeout(2000);
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Ligas|liga/i);
  });

  test("deep link join route existe", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/leagues/join/INVALID1");
    await page.waitForTimeout(3000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(20);
  });
});
