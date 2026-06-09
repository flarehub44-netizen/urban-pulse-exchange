import { test, expect } from "@playwright/test";

test.describe("Catalog navigation", () => {
  test("vertical page /v/crypto loads", async ({ page }) => {
    await page.goto("/v/crypto");
    await expect(page.getByRole("heading", { name: /crypto/i })).toBeVisible();
  });

  test("copa hub loads with tabs", async ({ page }) => {
    await page.goto("/copa");
    await expect(page.getByRole("heading", { name: /Copa do Mundo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Jogos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mapa" })).toBeVisible();
  });

  test("homepage shows trending section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mercados em alta")).toBeVisible();
  });
});
