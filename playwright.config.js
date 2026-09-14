// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Baixa as imagens da galeria uma vez; os testes as servem do disco.
  globalSetup: require.resolve('./global-setup'),

  // Nenhum teste deve passar de 5s (requisito do scaffolding).
  timeout: 5_000,
  expect: { timeout: 3_000 },

  fullyParallel: true,
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
