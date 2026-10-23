import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePage, urlFor, render, sitemap } from './build.mjs';
import { checkPage } from './check.mjs';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('waMessage builds a WhatsApp link with every form field, accents included', () => {
  const ctx = {};
  vm.runInNewContext(readFileSync(new URL('../site.js', import.meta.url), 'utf8'), ctx);
  const url = ctx.waMessage({ nombre: 'Ana María', tel: '300', negocio: 'Café Ñ', servicio: 'SEO y Google', actual: 'No, es la primera', detalle: 'menú' });
  assert.ok(url.startsWith('https://wa.me/573154192623?text='));
  const text = decodeURIComponent(url.split('?text=')[1]);
  for (const v of ['Ana María', '300', 'Café Ñ', 'SEO y Google', 'No, es la primera', 'menú']) assert.ok(text.includes(v), v);
});

const meta = { title: 'Contacto · LIBO STUDIOS', description: 'x'.repeat(130), name: 'Contacto', nav: 'contacto', crumbs: [] };

test('parsePage names the file when the JSON header is broken', () => {
  assert.throws(() => parsePage('<!--{bad json-->\n<section></section>', 'pages/rota.html'), /pages\/rota\.html/);
});

test('parsePage names the file when description is missing', () => {
  assert.throws(() => parsePage('<!--{"title":"t","name":"n"}-->\n<section></section>', 'pages/sin.html'), /pages\/sin\.html.*description/);
});

test('parsePage splits header and body', () => {
  const { meta: m, body } = parsePage('<!--{"title":"t","description":"d","name":"n"}-->\n<section>hola</section>', 'p.html');
  assert.equal(m.title, 't');
  assert.equal(body.trim(), '<section>hola</section>');
});

test('urlFor maps sources to clean URLs', () => {
  assert.equal(urlFor('pages/servicios/tiendas-online.html'), '/servicios/tiendas-online/');
  assert.equal(urlFor('pages/contacto.html'), '/contacto/');
  assert.equal(urlFor('pages/404.html'), '/404.html');
});

test('render adds canonical, one breadcrumb list and marks the current nav item', () => {
  const html = render(meta, '<section><h1>Hola</h1></section>', '/contacto/');
  assert.ok(html.includes('<link rel="canonical" href="https://libo-studios.vercel.app/contacto/">'));
  assert.equal(html.split('"@type":"BreadcrumbList"').length - 1, 1);
  assert.match(html, /<a href="\/contacto\/" aria-current="page">Contacto<\/a>/);
});

test('sitemap lists absolute URLs', () => {
  assert.ok(sitemap(['/', '/contacto/']).includes('<loc>https://libo-studios.vercel.app/contacto/</loc>'));
});

test('checkPage flags a link to a page that does not exist', () => {
  const html = render(meta, '<section><h1>Hola</h1><a href="/no-existe/">x</a></section>', '/contacto/');
  const v = checkPage(html, '/contacto/', new Set(['/', '/contacto/']));
  assert.ok(v.some(s => s.includes('/no-existe/')), v.join('\n'));
});

test('checkPage flags jargon and dashes in visible text but not in JSON-LD', () => {
  const html = render(meta, '<section><h1>Hola</h1><p>Mejoramos tus Core Web Vitals — rápido</p></section>', '/contacto/');
  const v = checkPage(html, '/contacto/', new Set(['/', '/contacto/']));
  assert.ok(v.some(s => s.includes('Core Web Vitals')), v.join('\n'));
  assert.ok(v.some(s => s.includes('—')), v.join('\n'));
});
