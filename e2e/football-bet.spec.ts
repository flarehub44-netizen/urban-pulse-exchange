import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

/**
 * Requires dev seed market fb-999999001 (live) from migration 20260701000000_football_markets.sql
 */
test.describe("football bet flow", () => {
  test.describe.configure({ timeout: 60_000 });

  test("redirects /football to markets futebol segment", async ({ page }) => {
    await page.goto("/football");
    await expect(page).toHaveURL(/\/markets(\?.*segment=futebol|\/\?segment=futebol)/, {
      timeout: 15_000,
    });
  });

  test("lists football markets in hub without login", async ({ page }) => {
    await page.goto("/markets?segment=futebol");
    await expect(page.getByRole("heading", { name: /Mercados/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Futebol/i })).toBeVisible();
  });

  test("opens seeded market detail without login", async ({ page }) => {
    await page.goto("/football/fb-999999001");
    await expect(page.getByText(/São Paulo/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Corinthians/i)).toBeVisible();
  });

  test("places bet on seeded live market", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/football/fb-999999001");
    await expect(page.getByTestId("football-order-box")).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("football-order-stake").fill("10", { force: true });
    await page
      .getByRole("button", { name: /São Paulo/i })
      .first()
      .click();
    await page.getByTestId("football-order-submit").click();

    await expect(page.getByText(/Previsão registrada|registrada/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
