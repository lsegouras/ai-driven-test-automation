// @ts-check
const path = require('path');
const { CACHE_DIR, ASSETS, BASE } = require('../../global-setup');

/** @type {Map<string, string>} caminho relativo -> content-type */
const TIPO_POR_ASSET = new Map(ASSETS);

/**
 * Serve as imagens da galeria e o Bootstrap a partir do cache em disco montado
 * pelo global-setup, em vez da rede. São ~1,25 MB que todo teste rebaixaria.
 * Renderizam idênticos, já que são os mesmos bytes, e o HTML e os módulos em
 * /src continuam vindo do site publicado — é o deploy real sob teste.
 *
 * O padrão é ancorado em BASE de propósito: um glob solto casaria pelo nome do
 * arquivo em qualquer host, e um https://outro-cdn.com/lib/bootstrap.bundle.min.js
 * seria servido do disco no lugar do arquivo real, sem aviso.
 *
 * @param {import('@playwright/test').Page} page
 */
async function serveCachedAssets(page) {
  await page.route(`${BASE}/{img,lib}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const rel = [...TIPO_POR_ASSET.keys()].find((k) => pathname.endsWith(`/${k}`));
    if (!rel) return route.continue();
    return route.fulfill({ path: path.join(CACHE_DIR, rel), contentType: TIPO_POR_ASSET.get(rel) });
  });

  // As URLs de imagem usadas nos testes são fictícias e não resolveriam. Servindo
  // bytes reais, os cards criados renderizam — e o atributo src continua sendo
  // exatamente o que foi enviado.
  await page.route('https://img.com/**', (route) =>
    route.fulfill({ path: path.join(CACHE_DIR, 'img/et-bilu.jpeg'), contentType: 'image/jpeg' }));
}

module.exports = { serveCachedAssets };
