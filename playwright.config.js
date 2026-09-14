// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Cada worker recarrega este arquivo num processo próprio, e o argv desses
// processos não traz as flags da linha de comando — só o do processo principal
// traz. Detectar o UI mode lendo process.argv aqui funcionaria no principal e
// falharia silenciosamente em todo worker, que é justamente onde o timeout do
// teste é aplicado. Marcar em process.env resolve: o principal avalia este
// arquivo antes de criar os workers, e eles herdam o ambiente.
if (process.argv.some((a) => a === '--ui' || a.startsWith('--ui-'))) process.env.PW_UI_MODE = '1';
const EM_UI_MODE = process.env.PW_UI_MODE === '1';

module.exports = defineConfig({
  testDir: './tests',

  // Baixa as imagens da galeria uma vez; os testes as servem do disco.
  globalSetup: require.resolve('./global-setup'),

  // Nenhum teste deve passar de 5s (requisito do scaffolding).
  //
  // Exceto sob o UI mode, que grava trace de cada ação e roda tudo sob inspeção:
  // os mesmos testes que têm 2.4s de mediana chegam a 4.3s ali, e uma oscilação da
  // máquina estoura o teto. Esse teto existe para impedir que uma execução de
  // verdade — CLI ou CI — fique pendurada; sob um depurador ele só atrapalha, e o
  // que os testes verificam não muda. O próprio Playwright faz isso com --debug,
  // que zera o timeout via PWDEBUG.
  timeout: EM_UI_MODE ? 30_000 : 5_000,
  expect: { timeout: 3_000 },

  fullyParallel: true,

  // Dois, não os quatro que o Playwright escolheria sozinho nesta máquina de 8
  // núcleos. Quatro Chromiums competindo por CPU e disco deixam cada teste MAIS
  // lento do que dois (2.0-2.9s contra 1.5-2.0s), e o efeito explode no UI mode,
  // que grava trace de cada ação: lá os mesmos testes iam a 4.0-4.6s e estouravam
  // o teto de 5s. Também alinha o local com o CI, cujo runner de 4 núcleos já
  // rodava com dois.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',

  use: {
    baseURL: 'https://erickwendel.github.io/vanilla-js-web-app-example/',
    actionTimeout: 3_000,
    navigationTimeout: 5_000,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
