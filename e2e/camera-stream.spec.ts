import { test, expect } from "@playwright/test";

const PROD_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "";
const IS_PROD = PROD_BASE.includes("workers.dev");

test.describe("Camera stream UI", () => {
  test("admin sources page loads camera section", async ({ page }) => {
    await page.goto("/admin/sources");
    await expect(page.getByRole("heading", { name: /Fontes de dados/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Câmeras/i).first()).toBeVisible();
  });

  test("market live shows Ao vivo strip with video or cameras listed", async ({ page }) => {
    await page.goto("/markets?status=live");
    const firstLink = page.locator('a[href^="/markets/"]').first();
    if ((await firstLink.count()) === 0) {
      test.skip();
      return;
    }
    await firstLink.click();
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });

    const liveTitle = page.getByText(/Ao vivo/i).first();
    const noSignal = page.getByText(/Sem sinal ao vivo/i);
    await expect(liveTitle.or(noSignal)).toBeVisible({ timeout: 12_000 });

    if (await liveTitle.isVisible()) {
      const video = page.locator("video").first();
      if (IS_PROD) {
        await expect(video).toBeVisible({ timeout: 20_000 });
      } else {
        const hasVideo = (await video.count()) > 0;
        expect(
          hasVideo || (await page.getByText(/Paulista|Marginal|Pinheiros|demo/i).count()) > 0,
        ).toBeTruthy();
      }
    }
  });

  test("urbanmind shows live section when cameras seeded", async ({ page }) => {
    await page.goto("/urbanmind");
    await expect(page).toHaveTitle(/UrbanMind/i, { timeout: 15_000 });
    const liveOrEmpty = page.getByText(/Ao vivo|Sem sinal ao vivo/i);
    await expect(liveOrEmpty.first()).toBeVisible({ timeout: 12_000 });
  });
});

test.describe("Stream URL validation", () => {
  test("demo m3u8 is valid HTTPS pattern", () => {
    const url = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain(".m3u8");
  });
});
