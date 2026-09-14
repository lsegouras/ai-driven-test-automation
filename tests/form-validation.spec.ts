import { test, expect, type Page } from '@playwright/test';
import { serveCachedAssets } from './support/cached-assets';

const cards = (page: Page) => page.getByRole('article');
const campoTitulo = (page: Page) => page.getByRole('textbox', { name: 'Image Title' });
const campoUrl = (page: Page) => page.getByRole('textbox', { name: 'Image URL' });
const botaoEnviar = (page: Page) => page.getByRole('button', { name: 'Submit Form' });

/**
 * Os avisos são divs sem papel próprio, então a âncora é o texto que a pessoa lê.
 * Eles existem sempre no DOM: o Bootstrap os revela quando o campo está inválido
 * e o formulário já foi validado, então o que se afirma é visibilidade.
 */
const avisoTitulo = (page: Page) => page.getByText('Please type a title for the image.');
const avisoUrl = (page: Page) => page.getByText('Please type a valid URL');

test.beforeEach(async ({ page }) => {
  await serveCachedAssets(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
});

test.describe('Validação do formulário', () => {
  test('rejeita o envio com o formulário vazio e aponta os dois campos', async ({ page }) => {
    const antes = await cards(page).count();

    await botaoEnviar(page).click();

    await expect(avisoTitulo(page)).toBeVisible();
    await expect(avisoUrl(page)).toBeVisible();
    await expect(cards(page)).toHaveCount(antes);
    // O app move o foco para o primeiro campo inválido.
    await expect(campoTitulo(page)).toBeFocused();
  });

  test('aponta apenas a URL quando o título é válido e a URL não é', async ({ page }) => {
    const antes = await cards(page).count();

    await campoTitulo(page).fill('Título perfeitamente válido');
    await campoUrl(page).fill('isso-nao-e-uma-url');
    await botaoEnviar(page).click();

    await expect(avisoUrl(page)).toBeVisible();
    await expect(avisoTitulo(page)).toBeHidden();
    await expect(cards(page)).toHaveCount(antes);
    await expect(campoUrl(page)).toBeFocused();
  });

  test('aponta apenas o título quando ele está vazio e a URL é válida', async ({ page }) => {
    const antes = await cards(page).count();

    await campoUrl(page).fill('https://img.com/valida.png');
    await botaoEnviar(page).click();

    await expect(avisoTitulo(page)).toBeVisible();
    await expect(avisoUrl(page)).toBeHidden();
    await expect(cards(page)).toHaveCount(antes);
    await expect(campoTitulo(page)).toBeFocused();
  });

  test('preserva o que foi digitado quando o envio é rejeitado', async ({ page }) => {
    const titulo = 'Não quero perder isto';
    const url = 'ainda-nao-e-uma-url';

    await campoTitulo(page).fill(titulo);
    await campoUrl(page).fill(url);
    await botaoEnviar(page).click();

    await expect(avisoUrl(page)).toBeVisible();
    await expect(campoTitulo(page)).toHaveValue(titulo);
    await expect(campoUrl(page)).toHaveValue(url);
  });

  test('aceita o envio depois que o campo inválido é corrigido', async ({ page }) => {
    const antes = await cards(page).count();
    const titulo = `Corrigido ${Math.random().toString(36).slice(2, 8)}`;

    await campoTitulo(page).fill(titulo);
    await campoUrl(page).fill('ainda-nao-e-uma-url');
    await botaoEnviar(page).click();

    await expect(avisoUrl(page)).toBeVisible();
    await expect(cards(page)).toHaveCount(antes);

    await campoUrl(page).fill('https://img.com/corrigida.png');
    await botaoEnviar(page).click();

    await expect(cards(page)).toHaveCount(antes + 1);
    await expect(cards(page).last().getByRole('heading', { name: titulo })).toBeVisible();
    await expect(avisoUrl(page)).toBeHidden();
  });
});
