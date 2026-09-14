// @ts-check
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://erickwendel.github.io/vanilla-js-web-app-example/img';
const IMAGES = ['ai-alien.jpeg', 'predator.jpeg', 'et-bilu.jpeg'];

const CACHE_DIR = path.join(__dirname, '.image-cache');

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
 * As três imagens da galeria somam ~940 KB, sendo 838 KB só a predator.jpeg.
 * Buscá-las da rede em cada teste era o que estourava o orçamento de 5s com os
 * workers em paralelo. Aqui elas são baixadas uma única vez por execução (e
 * reaproveitadas entre execuções locais); os testes as servem do disco.
 */
module.exports = async () => {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  await Promise.all(
    IMAGES.map(async (name) => {
      const dest = path.join(CACHE_DIR, name);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
      await download(`${BASE}/${name}`, dest);
    }),
  );
};

module.exports.CACHE_DIR = CACHE_DIR;
module.exports.IMAGES = IMAGES;
