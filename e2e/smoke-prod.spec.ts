import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

test.describe("Production smoke @smoke", () => {
  test.skip(!process.env.PLAYWRIGHT_SMOKE_PROD, "Set PLAYWRIGHT_SMOKE_PROD=1 against deployed URL");

  const routes = ["/", "/v/crypto", "/v/economia", "/copa", "/pm/pm-copa-winner-2026"];

  for (const path of routes) {
    test(`${path} responds`, async ({ page }) => {
      const res = await page.goto(`${base}${path}`);
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});
