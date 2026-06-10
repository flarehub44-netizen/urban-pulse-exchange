import { test, expect } from "@playwright/test";

test.describe("Catalog navigation", () => {
  test("vertical page /v/crypto loads", async ({ page }) => {
    await page.goto("/v/crypto");
    await expect(page.getByRole("heading", { name: /crypto/i })).toBeVisible();
  });

  test("vertical page /v/politica loads", async ({ page }) => {
    await page.goto("/v/politica");
    await expect(page.getByRole("heading", { name: /política|politica/i })).toBeVisible();
  });

  test("vertical page /v/economia loads", async ({ page }) => {
    await page.goto("/v/economia");
    await expect(page.getByRole("heading", { name: /economia/i })).toBeVisible();
  });

  test("prediction market detail /pm loads", async ({ page }) => {
    await page.goto("/pm/pm-copa-winner-2026");
    await expect(page.getByText(/Copa do Mundo 2026/i)).toBeVisible();
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

  test("football page links to copa hub", async ({ page }) => {
    await page.goto("/football");
    await expect(page.getByRole("link", { name: /Hub Copa 2026/i })).toBeVisible();
  });
});
