import { test, expect } from "@playwright/test";

test.describe("Copa hub", () => {
  test("shows all five tabs", async ({ page }) => {
    await page.goto("/copa");
    for (const label of ["Jogos", "Props", "Grupos", "Chaveamento", "Mapa"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("props tab shows prediction markets grid", async ({ page }) => {
    await page.goto("/copa");
    await page.getByRole("button", { name: "Props" }).click();
    await expect(page.locator("[data-testid='catalog-market-grid'], .grid").first()).toBeVisible();
  });

  test("map tab loads outright section", async ({ page }) => {
    await page.goto("/copa");
    await page.getByRole("button", { name: "Mapa" }).click();
    await expect(page.getByText(/campeão|Copa/i).first()).toBeVisible();
  });
});
