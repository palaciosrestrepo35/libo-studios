// Avisa a Bing, Yandex y los demás buscadores de IndexNow que las páginas del sitemap cambiaron.
// Uso, después de publicar: node tools/indexnow.mjs
// La llave es pública a propósito: el archivo <KEY>.txt en la raíz prueba que el sitio es nuestro.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, ROOT } from './build.mjs';

const KEY = '3bd86c40c983d16ca0d0a9e71673e60c';
const urlList = [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(BASE).host, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList }),
});
// 200 o 202 es aceptado; 403 es que la llave todavía no está publicada
console.log(res.status, `${urlList.length} URLs enviadas`, await res.text());
process.exit(res.ok ? 0 : 1);
