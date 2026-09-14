// @ts-check
const { test, expect } = require('@playwright/test');
const { serveCachedAssets } = require('./support/cached-assets');

/**
 * Roda dentro do browser: verdadeiro quando toda <img> do conjunto foi decodificada.
 * @param {HTMLImageElement[]} imgs
 */
const todasDecodificadas = (imgs) =>
  imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0);

/**
 * Falha se alguma <img> do escopo não tiver sido decodificada pelo browser.
 * naturalWidth só é maior que zero quando os bytes chegaram e foram lidos como
 * imagem — um <img> quebrado tem src preenchido e naturalWidth igual a zero.
 * @param {import('@playwright/test').Locator} scope
 */
const expectImagesRendered = async (scope) => {
  await expect.poll(() => scope.locator('img').evaluateAll(todasDecodificadas)).toBe(true);
};

test.beforeEach(async ({ page }) => {
  await serveCachedAssets(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
});

test.describe('Galeria de imagens', () => {
  // Envio e validação do formulário são cobertos por form-submission.spec.ts e
  // form-validation.spec.ts. Sobra aqui o que eles não cobrem: o estado inicial da
  // página e a prova de que as imagens realmente renderizam.
  //
  // Este é o único teste que afirma um número absoluto de cards, e de propósito:
  // o que ele verifica É o conteúdo seed. Cada teste recebe um contexto limpo, com
  // localStorage vazio, então os três são determinísticos.
  test('carrega a página com os cards seed e as imagens renderizadas', async ({ page }) => {
    await expect(page).toHaveTitle('TDD Frontend Example');
    await expect(page.getByRole('article')).toHaveCount(3);

    for (const titulo of ['AI Alien', 'Predator Night Vision', 'ET Bilu']) {
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    }

    await expectImagesRendered(page.locator('#card-list'));
  });
});
