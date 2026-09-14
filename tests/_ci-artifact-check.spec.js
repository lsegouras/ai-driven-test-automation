// TEMPORÁRIO — existe só para forçar o CI a falhar e provar que o passo
// "Upload HTML report" (if: failure()) realmente anexa o relatório no runner.
// Este arquivo é descartado junto com a branch assim que a verificação terminar.
const { test, expect } = require('@playwright/test');

test('falha proposital para exercitar o upload do relatório', async () => {
  expect('relatorio').toBe('anexado');
});
