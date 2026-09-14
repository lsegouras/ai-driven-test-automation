// @ts-check
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://erickwendel.github.io/vanilla-js-web-app-example';

/**
 * Assets estáticos e pesados que todo teste rebaixaria da rede. Só entram aqui
 * coisas que não são o app em si: as imagens da galeria e o Bootstrap vendorizado.
 * O HTML e os módulos em /src continuam vindo do site publicado, que é o que está
 * de fato sob teste.
 *
 * O nome do CSS tem um typo — "boostrap" — que é do próprio app, não daqui.
 */
const ASSETS = [
  ['img/ai-alien.jpeg', 'image/jpeg'],
  ['img/predator.jpeg', 'image/jpeg'],
  ['img/et-bilu.jpeg', 'image/jpeg'],
  ['img/icon.webp', 'image/webp'],
  ['lib/boostrap.min.css', 'text/css'],
  ['lib/bootstrap.bundle.min.js', 'text/javascript'],
];

const CACHE_DIR = path.join(__dirname, '.asset-cache');

/** Baixa uma URL para o disco, seguindo redirect. */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`${url} respondeu ${res.statusCode}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(undefined)));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * Baixa os assets uma única vez por execução (e reaproveita entre execuções
 * locais). Juntos eles somam ~1,25 MB, e cada teste os rebaixava inteiros — era
 * isso que estourava o orçamento de 5s, sobretudo no UI mode, onde a gravação de
 * trace encarece cada ação.
 */
module.exports = async () => {
  await Promise.all(
    ASSETS.map(async ([rel]) => {
      const dest = path.join(CACHE_DIR, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
      await download(`${BASE}/${rel}`, dest);
    }),
  );
};

module.exports.CACHE_DIR = CACHE_DIR;
module.exports.ASSETS = ASSETS;
