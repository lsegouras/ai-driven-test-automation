// @ts-check
const { test, expect } = require('@playwright/test');

/** Cards renderizados na galeria. */
const cards = (page) => page.locator('#card-list article');

test.beforeEach(async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
});

test.describe('Galeria de imagens', () => {
  test('carrega a página com os cards iniciais', async ({ page }) => {
    await expect(page).toHaveTitle('TDD Frontend Example');
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'AI Alien' })).toBeVisible();
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
  });

  test('limpa o formulário depois de um envio válido', async ({ page }) => {
    await page.locator('#title').fill('ET Bilu 2');
    await page.locator('#imageUrl').fill('https://img.com/bilu2.png');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.locator('#title')).toHaveValue('');
    await expect(page.locator('#imageUrl')).toHaveValue('');
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
