// Revisa cada página construida contra las reglas SEO y de texto del proyecto.
// Uso: node tools/check.mjs [--skip-home]. Sale con 1 si encuentra problemas.
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, ROOT, urlFor, outFor, sourceFiles } from './build.mjs';

// palabras que un cliente no entiende; en el texto visible van en palabras simples
export const JARGON = ['Core Web Vitals', 'Merchant Center', 'HSTS', 'HTTPS', 'APIs?', 'SSL', 'CRM', 'indexación', 'indexadas?', 'SEO técnico',
  'datos estructurados', 'Cloudflare', 'UX/UI', 'landing pages?'];

const visibleText = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

export const wordCount = html => visibleText(html.match(/<main[\s\S]*<\/main>/)?.[0] || html).split(' ').filter(w => /\p{L}/u.test(w)).length;

export function checkPage(html, url, existing) {
  const v = [];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const noindex = /<meta name="robots" content="noindex"/.test(html);
  const len = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').length;
  if (!title || len(title) > 60) v.push(`título de ${len(title)} caracteres (máximo 60): "${title}"`);
  if (len(desc) < 120 || len(desc) > 160) v.push(`descripción de ${len(desc)} caracteres (120 a 160)`);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) v.push(`${h1s} h1 (debe haber exactamente 1)`);
  if (!noindex && !html.includes(`<link rel="canonical" href="${BASE + url}">`)) v.push(`canonical distinto de ${BASE + url}`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch (e) { v.push(`JSON-LD inválido: ${e.message}`); }
  }
  // cualquier enlace que termine en este sitio, relativo o absoluto, tiene que existir
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (raw.startsWith('#')) continue;
    let target;
    try { target = new URL(raw.replace(/&amp;/g, '&'), BASE + url); } catch { v.push(`${attr} inválido: ${raw}`); continue; }
    if (target.origin !== BASE) continue;
    const path = decodeURIComponent(target.pathname);
    const ok = existing.has(path) || (/\.\w+$/.test(path) && existsSync(join(ROOT, path)));
    if (!ok) v.push(`${attr} roto: ${raw}`);
  }
  const text = visibleText(html);
  for (const w of JARGON) {
    const m = text.match(new RegExp(`(?<![\\p{L}])${w}(?![\\p{L}])`, 'iu'));
    if (m) v.push(`palabra técnica en el texto: "${m[0]}"`);
  }
  for (const d of ['—', '–']) if (text.includes(d)) v.push(`raya "${d}" en el texto`);
  // las páginas de servicio y sector necesitan contenido propio de verdad, no relleno
  if (/^\/(servicios|sectores)\/[^/]+\/$/.test(url) && wordCount(html) < 500) v.push(`solo ${wordCount(html)} palabras (mínimo 500)`);
  return v;
}

function main() {
  const skipHome = process.argv.includes('--skip-home');
  const pages = sourceFiles().map(abs => urlFor(relative(ROOT, abs)));
  const existing = new Set(['/', ...pages]);
  const map = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
  let bad = 0;
  const report = (url, list) => { for (const s of list) { console.log(`${url}: ${s}`); bad++; } };

  if (!home.includes(`<link rel="canonical" href="${BASE}/">`)) report('/', [`index.html no usa el dominio ${BASE}`]);
  if (!skipHome) report('/', checkPage(home, '/', existing));
  for (const url of pages) {
    const html = readFileSync(outFor(url), 'utf8');
    const list = checkPage(html, url, existing);
    if (!/content="noindex"/.test(html) && !map.includes(`<loc>${BASE + url}</loc>`)) list.push('no está en sitemap.xml');
    report(url, list);
  }
  console.log(bad ? `\n${bad} problemas` : `${pages.length + 1} páginas revisadas, 0 problemas`);
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
