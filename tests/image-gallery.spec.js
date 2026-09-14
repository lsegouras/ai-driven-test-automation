// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');
const { CACHE_DIR } = require('../global-setup');

/** Cards renderizados na galeria. */
const cards = (page) => page.locator('#card-list article');

/**
 * Falha se alguma <img> do escopo não tiver sido decodificada pelo browser.
 * naturalWidth só é maior que zero quando os bytes chegaram e foram lidos como
 * imagem — um <img> quebrado tem src preenchido e naturalWidth igual a zero.
 */
const expectImagesRendered = async (scope) => {
  await expect
    .poll(() =>
      scope
        .locator('img')
        .evaluateAll((imgs) => imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0)),
    )
    .toBe(true);
};

test.beforeEach(async ({ page }) => {
  // As imagens vêm do cache em disco (ver global-setup.js), não da rede. Elas
  // renderizam normalmente — só não custam os ~940 KB por teste que estouravam o
  // orçamento de 5s com os workers em paralelo.
  await page.route('**/img/*.jpeg', (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    return route.fulfill({ path: path.join(CACHE_DIR, name), contentType: 'image/jpeg' });
  });

  // A URL usada no teste de criação de card é fictícia e não resolveria. Servindo
  // uma imagem real, o card novo também renderiza — e o atributo src continua sendo
  // exatamente o que o teste afirma.
  await page.route('https://img.com/**', (route) =>
    route.fulfill({ path: path.join(CACHE_DIR, 'et-bilu.jpeg'), contentType: 'image/jpeg' }));

  await page.goto('./', { waitUntil: 'domcontentloaded' });
});

test.describe('Galeria de imagens', () => {
  test('carrega a página com os cards iniciais', async ({ page }) => {
    await expect(page).toHaveTitle('TDD Frontend Example');
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'AI Alien' })).toBeVisible();
    await expectImagesRendered(page.locator('#card-list'));
  });

  test('adiciona um card ao enviar o formulário preenchido', async ({ page }) => {
    const title = 'Alien Xenomorph';
    const imageUrl = 'https://img.com/xenomorph.png';

    await page.locator('#title').fill(title);
    await page.locator('#imageUrl').fill(imageUrl);
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(cards(page)).toHaveCount(4);

    const novoCard = cards(page).last();
    await expect(novoCard.getByRole('heading', { name: title })).toBeVisible();
    await expect(novoCard.locator('img')).toHaveAttribute('src', imageUrl);
    await expectImagesRendered(novoCard);
  });

  test('limpa o formulário depois de um envio válido', async ({ page }) => {
    await page.locator('#title').fill('ET Bilu 2');
    await page.locator('#imageUrl').fill('https://img.com/bilu2.png');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.locator('#title')).toHaveValue('');
    await expect(page.locator('#imageUrl')).toHaveValue('');

    // O form.reset() do app é síncrono, mas salvar e renderizar o card não é: o
    // card só entra no DOM ~150ms depois. Sem esperar por ele, o teste termina no
    // meio do trabalho do app e o snapshot do relatório congela a imagem ainda
    // carregando. Esperar aqui também torna o "envio válido" do título verdadeiro.
    await expect(cards(page)).toHaveCount(4);
    await expectImagesRendered(cards(page).last());
  });

  test('não adiciona card quando o formulário está vazio', async ({ page }) => {
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.locator('#titleFeedback')).toBeVisible();
    await expect(page.locator('#titleFeedback')).toHaveText(/Please type a title/);
    await expect(cards(page)).toHaveCount(3);
  });

  test('não adiciona card quando a URL é inválida', async ({ page }) => {
    await page.locator('#title').fill('URL quebrada');
    await page.locator('#imageUrl').fill('nao-e-uma-url');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.locator('#urlFeedback')).toBeVisible();
    await expect(cards(page)).toHaveCount(3);
  });
});
