import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const OVERFLOW_TOLERANCE_PX = 2;

/** Falha se a página inteira tiver scroll horizontal (não conta overflow dentro de containers internos). */
export async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate((tolerance) => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth > tolerance;
  }, OVERFLOW_TOLERANCE_PX);
  expect(overflow, "Página com overflow horizontal no documento").toBeFalsy();
}

export async function gotoAndAssertMobileLayout(
  page: Page,
  path: string,
  options?: { title?: RegExp; waitMs?: number },
) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  if (options?.waitMs) {
    await page.waitForTimeout(options.waitMs);
  }
  if (options?.title) {
    await expect(page).toHaveTitle(options.title);
  }
  await expectNoPageOverflow(page);
}
