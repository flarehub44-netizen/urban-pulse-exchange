import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const MARKET_CARD = '[data-testid="market-card"]';
export const MARKET_CARD_VISIBLE = '[data-testid="market-card"]:visible';
export const MARKET_CARD_LINK = '[data-testid="market-card-link"]';

/** Evita modal de onboarding bloquear a lista de mercados. */
export async function primeAppStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("viax_onboarded", "1");
    localStorage.removeItem("viax_markets_filters");
  });
}

export async function dismissOnboardingIfOpen(page: Page) {
  const skip = page.getByRole("button", { name: /Pular tutorial|Pular/i }).first();
  if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(400);
  }
}

/** Produção exige ≥3; preview/CI aceita ≥1 se DB tiver mercados. */
export function minLiveMarketsExpected() {
  if (process.env.PLAYWRIGHT_MIN_LIVE) {
    return Number(process.env.PLAYWRIGHT_MIN_LIVE) || 1;
  }
  return process.env.PLAYWRIGHT_BASE_URL?.includes("workers.dev") ? 3 : 1;
}

/** Wait until market list has loaded (skeletons gone). */
export async function waitForMarketCards(page: Page, minCount = 1, timeoutMs = 25_000) {
  await primeAppStorage(page);
  await page.goto("/markets?status=live");
  await expect(page).toHaveTitle(/Mercados/i);
  await dismissOnboardingIfOpen(page);
  await expect(page.getByText(/[1-9]\d* mercados · pools/i)).toBeVisible({ timeout: timeoutMs });
  const cards = page.locator(MARKET_CARD_VISIBLE);
  await expect(cards.first()).toBeVisible({ timeout: timeoutMs });
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(minCount);
  return { cards, count };
}

const PREFERRED_LIVE_IDS = [
  "paulista-rush-live",
  "reboucas-live",
  "backup-paulista-live",
  "backup-reboucas-live",
];

/** Abre detalhe de mercado demo conhecido (evita card settled na lista). */
export async function openFirstLiveMarket(page: Page) {
  await primeAppStorage(page);
  const tryMarketUrl = async (href: string) => {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    await page.getByTestId("order-box").waitFor({ state: "visible", timeout: 15_000 });
  };

  for (const id of PREFERRED_LIVE_IDS) {
    try {
      await tryMarketUrl(`/markets/${id}`);
      return;
    } catch {
      /* próximo */
    }
  }

  const { cards } = await waitForMarketCards(page, 1);
  const n = await cards.count();
  for (let i = 0; i < Math.min(n, 8); i++) {
    const href = await cards.nth(i).locator(MARKET_CARD_LINK).getAttribute("href");
    if (!href?.includes("/markets/")) continue;
    try {
      await tryMarketUrl(href);
      return;
    } catch {
      /* próximo card */
    }
  }

  throw new Error("Nenhum mercado live abriu order-box sem erro de UI.");
}
