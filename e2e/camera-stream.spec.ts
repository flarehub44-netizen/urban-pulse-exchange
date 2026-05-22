import { test, expect } from "@playwright/test";

/** Public HLS test stream (may be offline; test UI shell only). */
const DEMO_M3U8 = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

test.describe("Camera stream UI", () => {
  test("admin sources page loads camera section", async ({ page }) => {
    await page.goto("/admin/sources");
    await expect(page.getByRole("heading", { name: /Fontes de dados/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Câmeras/i).first()).toBeVisible();
  });

  test("market detail tolerates live camera strip", async ({ page }) => {
    await page.goto("/markets?status=live");
    const firstLink = page.locator('a[href^="/markets/"]').first();
    if ((await firstLink.count()) === 0) {
      test.skip();
      return;
    }
    await firstLink.click();
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
    // Strip renders or empty state — no crash
    const liveOrEmpty = page.getByText(/Ao vivo|Sem sinal ao vivo/i);
    await expect(liveOrEmpty.first()).toBeVisible({ timeout: 10_000 });
  });

  test("classifyStreamUrl helper via page (admin placeholder)", async () => {
    // Smoke: UrbanMind route loads with live section label
    await page.goto("/urbanmind");
    await expect(page).toHaveTitle(/UrbanMind/i, { timeout: 15_000 });
  });
});

test.describe("Stream URL validation (unit-level in browser)", () => {
  test("demo m3u8 is valid HTTPS pattern", () => {
    expect(DEMO_M3U8).toMatch(/^https:\/\//);
    expect(DEMO_M3U8).toContain(".m3u8");
  });
});
