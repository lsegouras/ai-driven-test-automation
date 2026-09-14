import { test, expect, type Page } from '@playwright/test';
import { serveCachedAssets } from './support/cached-assets';

/** Cada card da galeria é um <article>, então o papel basta como seletor. */
const cards = (page: Page) => page.getByRole('article');

/**
 * Título único por execução. Os testes medem a lista antes e depois em vez de
 * assumir um tamanho inicial, e um título repetido tornaria a asserção ambígua
 * caso a lista já contivesse o item.
 */
const tituloUnico = (base: string) => `${base} ${Math.random().toString(36).slice(2, 8)}`;

const enviar = async (page: Page, titulo: string, url: string) => {
  await page.getByRole('textbox', { name: 'Image Title' }).fill(titulo);
  await page.getByRole('textbox', { name: 'Image URL' }).fill(url);
  await page.getByRole('button', { name: 'Submit Form' }).click();
};

test.beforeEach(async ({ page }) => {
  await serveCachedAssets(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
});

test.describe('Envio do formulário', () => {
  test('acrescenta o item enviado ao fim da lista', async ({ page }) => {
    const antes = await cards(page).count();
    const titulo = tituloUnico('Alien Queen');
    const url = 'https://img.com/alien-queen.png';

    await enviar(page, titulo, url);

    await expect(cards(page)).toHaveCount(antes + 1);

    const novo = cards(page).last();
    await expect(novo.getByRole('heading', { name: titulo })).toBeVisible();
    await expect(novo.getByRole('img', { name: `Image of an ${titulo}` })).toHaveAttribute('src', url);
  });

  test('limpa o formulário depois que o item entra na lista', async ({ page }) => {
    const antes = await cards(page).count();

    await enviar(page, tituloUnico('Xenomorph'), 'https://img.com/xenomorph.png');

    // Esperar a lista primeiro não é decorativo: o form.reset() do app é síncrono
    // e acontece antes de o card chegar ao DOM. Sem isto o teste terminaria com o
    // app ainda trabalhando.
    await expect(cards(page)).toHaveCount(antes + 1);
    await expect(page.getByRole('textbox', { name: 'Image Title' })).toHaveValue('');
    await expect(page.getByRole('textbox', { name: 'Image URL' })).toHaveValue('');
  });

  test('acumula envios sucessivos preservando a ordem', async ({ page }) => {
    const antes = await cards(page).count();
    const primeiro = tituloUnico('Primeiro');
    const segundo = tituloUnico('Segundo');

    await enviar(page, primeiro, 'https://img.com/primeiro.png');
    await expect(cards(page)).toHaveCount(antes + 1);

    await enviar(page, segundo, 'https://img.com/segundo.png');
    await expect(cards(page)).toHaveCount(antes + 2);

    await expect(cards(page).nth(antes).getByRole('heading', { name: primeiro })).toBeVisible();
    await expect(cards(page).nth(antes + 1).getByRole('heading', { name: segundo })).toBeVisible();
  });

  test('mantém o item na lista depois de recarregar a página', async ({ page }) => {
    const antes = await cards(page).count();
    const titulo = tituloUnico('Sobrevive ao reload');

    await enviar(page, titulo, 'https://img.com/reload.png');
    await expect(cards(page)).toHaveCount(antes + 1);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(cards(page)).toHaveCount(antes + 1);
    await expect(cards(page).last().getByRole('heading', { name: titulo })).toBeVisible();
  });
});
