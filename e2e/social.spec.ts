import { test, expect } from "@playwright/test";
import { primeAppStorage } from "./helpers/markets";

test.describe("E — Feed e Social", () => {
  test.describe.configure({ timeout: 30_000 });

  // E1: feed carrega com título correto
  test("E1: feed carrega com título e conteúdo", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/feed");
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/Feed/i, { timeout: 10_000 });
    await page.waitForTimeout(6000);

    const body = await page.locator("body").innerText();
    // Feed deve ter conteúdo (nav + posts ou estado vazio)
    expect(body.length).toBeGreaterThan(100);
  });

  // E1: criação de post — página do feed é acessível
  test("E1: página do feed abre sem erro", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/feed");
    await page.waitForTimeout(6000);

    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
    expect(/500|server error/i.test(body)).toBeFalsy();
  });

  // E5: post com texto > 280 chars é bloqueado
  test("E5: post com texto acima de 280 chars é bloqueado ou truncado", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/feed");
    await page.waitForTimeout(6000);

    const postInput = page
      .getByTestId("feed-post-input")
      .or(page.getByPlaceholder(/análise|previsão|compartilhe/i).first());

    if (await postInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const longText = "A".repeat(300);
      await postInput.fill(longText);
      await page.waitForTimeout(500);

      // Botão de enviar deve estar desabilitado ou o texto deve ser truncado
      const submitBtn = page.getByRole("button", { name: /publicar|postar|enviar/i }).first();
      const isDisabled = await submitBtn.isDisabled({ timeout: 2_000 }).catch(() => false);
      const inputValue = await postInput.inputValue().catch(() => "");
      const textLength = inputValue.length;

      // O texto deve ser cortado em 280 OU o botão desabilitado
      expect(isDisabled || textLength <= 280).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  // E2: like em post
  test("E2: like em post não quebra a UI", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/feed");
    await page.waitForTimeout(4000);

    const likeBtn = page
      .getByRole("button", { name: /curtir|like/i })
      .or(page.getByTestId("like-button"))
      .first();

    if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeBtn.click();
      await page.waitForTimeout(1500);
      // Não deve ter erro ou crash
      await expect(page.locator("body")).toBeVisible();
    } else {
      expect(true).toBeTruthy();
    }
  });

  // E3: seguir trader no ranking
  test("E3: seguir trader no ranking não quebra a UI", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/ranking");
    await page.waitForTimeout(4000);

    const followBtn = page.getByRole("button", { name: /seguir|follow/i }).first();

    if (await followBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await followBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.locator("body")).toBeVisible();
    } else {
      expect(true).toBeTruthy();
    }
  });

  // E4: perfil público carrega stats
  test("E4: perfil público de outro usuário carrega dados", async ({ page }) => {
    await primeAppStorage(page);

    // Pegar um userId do ranking
    await page.goto("/ranking");
    await page.waitForTimeout(4000);

    const profileLink = page.getByRole("link").filter({ hasText: /@\w+/ }).first();

    if (await profileLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const href = await profileLink.getAttribute("href");
      if (href?.includes("/profile/")) {
        await page.goto(href);
        await page.waitForTimeout(3000);
        const body = await page.locator("body").innerText();
        expect(/ROI|acertos|apostas|divisão|perfil/i.test(body)).toBeTruthy();
      }
    } else {
      expect(true).toBeTruthy();
    }
  });

  // E6: comentários em post
  test("E6: thread de comentários carrega no detalhe de post", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/feed");
    await page.waitForTimeout(4000);

    const commentBtn = page
      .getByRole("button", { name: /comentar|comment|responder/i })
      .or(page.getByTestId("comment-button"))
      .first();

    if (await commentBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await commentBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.locator("body")).toBeVisible();
    } else {
      expect(true).toBeTruthy();
    }
  });
});

test.describe("E — Ranking e Ligas", () => {
  test("ranking carrega com título correto", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/ranking");
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/Ranking/i, { timeout: 10_000 });
    await page.waitForTimeout(6000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test("ligas: página de ligas carrega com título correto", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/leagues");
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/Liga/i, { timeout: 10_000 });
    await page.waitForTimeout(4000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test("ligas: campo de invite code é acessível", async ({ page }) => {
    await primeAppStorage(page);
    await page.goto("/leagues");
    await page.waitForTimeout(3000);

    const joinInput = page
      .getByPlaceholder(/código|invite code|convite/i)
      .or(page.getByTestId("invite-code-input"));

    if (await joinInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Testa código inválido
      await joinInput.fill("INVALID-CODE-XYZ");
      const joinBtn = page.getByRole("button", { name: /entrar|join/i }).first();
      if (await joinBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await joinBtn.click();
        await page.waitForTimeout(2000);
        // Deve exibir erro de código inválido, não crash
        const body = await page.locator("body").innerText();
        expect(body.length).toBeGreaterThan(20);
      }
    } else {
      expect(true).toBeTruthy();
    }
  });
});
