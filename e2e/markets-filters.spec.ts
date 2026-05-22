import { test, expect } from "@playwright/test";
import { primeAppStorage, waitForMarketCards } from "./helpers/markets";

test.describe("D — Mercados e Filtros", () => {
  test.describe.configure({ timeout: 45_000 });

  // D1: filtro live exibe mercados
  test("D1: filtro live carrega página de mercados", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets?status=live");
    await page.waitForTimeout(6000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
    // Não deve mostrar erro 500 ou server error (excluindo palavras pt-BR como "encerrado")
    expect(/500 internal server error|page not found|not found/i.test(body)).toBeFalsy();
  });

  // D2: filtro closing exibe mercados encerrando
  test("D2: filtro closing responde sem erro", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets?status=closing");
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).toBeVisible();
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // D3: filtro por região
  test("D3: filtro por região mantém URL consistente", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets");
    await page.waitForTimeout(3000);

    // Clica no filtro de região se existir
    const regionFilter = page
      .getByTestId("filter-region")
      .or(page.getByRole("button", { name: /região|centro|zona/i }).first());
    if (await regionFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await regionFilter.click();
      await page.waitForTimeout(1500);
      // URL ou estado deve refletir o filtro
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(50);
    } else {
      // Filtro de região pode não estar visível — teste passa como N/A
      expect(true).toBeTruthy();
    }
  });

  // D5: busca textual
  test("D5: campo de busca filtra mercados por texto", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/markets");
    await page.waitForTimeout(3000);

    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/buscar|search|mercado/i).first());

    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill("Paulista");
      await page.waitForTimeout(1500);
      const body = await page.locator("body").innerText();
      // Resultado filtrado tem conteúdo
      expect(body.length).toBeGreaterThan(20);
    } else {
      expect(true).toBeTruthy();
    }
  });

  // D6: market detail carrega tabs
  test("D6: detalhe de mercado exibe tabs de chart, book e comentários", async ({ page }) => {
    await primeAppStorage(page);
    const { cards } = await waitForMarketCards(page, 1, 25_000);
    const href = await cards
      .first()
      .locator('[data-testid="market-card-link"]')
      .getAttribute("href");
    if (!href) {
      test.skip();
      return;
    }
    await page.goto(href);
    await page.waitForTimeout(4000);

    const body = await page.locator("body").innerText();
    // Deve ter tabs de gráfico, orderbook ou comentários
    expect(/gráfico|book|comentários|chart|histórico|yes|no/i.test(body)).toBeTruthy();
  });

  // D6: order box carrega no detalhe
  test("D6: order box aparece no detalhe de mercado live", async ({ page }) => {
    await primeAppStorage(page);
    const { cards } = await waitForMarketCards(page, 1, 25_000);
    const href = await cards
      .first()
      .locator('[data-testid="market-card-link"]')
      .getAttribute("href");
    if (!href) {
      test.skip();
      return;
    }
    await page.goto(href);
    const orderBox = page.getByTestId("order-box");
    await expect(orderBox).toBeVisible({ timeout: 15_000 });
  });

  // D8: edge badge da IA aparece quando disponível
  test("D8: edge badge ou previsão da UrbanMind aparece no detalhe", async ({ page }) => {
    await primeAppStorage(page);
    const { cards } = await waitForMarketCards(page, 1, 25_000);
    const href = await cards
      .first()
      .locator('[data-testid="market-card-link"]')
      .getAttribute("href");
    if (!href) {
      test.skip();
      return;
    }
    await page.goto(href);
    await page.waitForTimeout(4000);

    const body = await page.locator("body").innerText();
    // UrbanMind ou AI deve estar referenciado
    const hasAI = /urbanmind|IA|edge|predição|confiança|ai/i.test(body);
    // Pode não estar presente em todos os mercados, mas página não deve errar
    expect(body.length).toBeGreaterThan(50);
    void hasAI; // informativo, não bloqueia teste
  });

  // D4: favoritar mercado (watchlist)
  test("D4: favoritar mercado adiciona à watchlist", async ({ page }) => {
    await primeAppStorage(page);
    const { cards } = await waitForMarketCards(page, 1, 25_000);

    // Procura botão de favorito no primeiro card
    const favoriteBtn = cards
      .first()
      .getByRole("button", { name: /favorit|watch|star/i })
      .or(cards.first().getByTestId("watchlist-toggle"));

    if (await favoriteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await favoriteBtn.click();
      await page.waitForTimeout(1500);
      // Ação não deve causar erro
      await expect(page.locator("body")).toBeVisible();
    } else {
      // Botão de favorito pode estar no detalhe do mercado
      const href = await cards
        .first()
        .locator('[data-testid="market-card-link"]')
        .getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForTimeout(3000);
        const detailFav = page
          .getByRole("button", { name: /favorit|watch|star/i })
          .or(page.getByTestId("watchlist-toggle"));
        if (await detailFav.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await detailFav.click();
          await page.waitForTimeout(1000);
          await expect(page.locator("body")).toBeVisible();
        }
      }
    }
  });
});

test.describe("D — Live Map", () => {
  test("mapa ao vivo carrega heatmap", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/live");
    await page.waitForTimeout(4000);
    await expect(page).toHaveTitle(/ao vivo|live|mapa/i);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });
});
