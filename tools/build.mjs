// Genera cada página de pages/ dentro del mismo diseño (cabecera, pie, etiquetas SEO)
// y escribe archivos estáticos: <ruta>/index.html y sitemap.xml. Vercel los sirve tal cual.
// Uso: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// el dominio vive aquí; al cambiarlo, también en index.html y robots.txt
export const BASE = 'https://libostudios.space';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WA = '573154192623';

export const NAV = [
  ['estudio', 'Estudio'], ['servicios', 'Servicios'], ['proyectos', 'Proyectos'],
  ['sectores', 'Sectores'], ['proceso', 'Proceso'], ['contacto', 'Contacto'],
];
export const SERVICES = [
  ['paginas-web-medellin', 'Páginas web'], ['tiendas-online', 'Tiendas online'],
  ['catalogo-whatsapp', 'Catálogo con WhatsApp'], ['seo-medellin', 'SEO y Google Maps'],
  ['chat-con-ia', 'Chat con IA'], ['mantenimiento-web', 'Mantenimiento web'],
  ['desarrollo-a-la-medida', 'Desarrollo a la medida'],
];

// versión en inglés: las páginas viven en pages/en/ y salen en /en/...
// cada página en inglés trae "alt" con la ruta de su versión en español (para hreflang y el botón de idioma)
export const isEn = url => url === '/en/' || url.startsWith('/en/');
const T = {
  es: {
    lang: 'es', locale: 'es_CO', home: '/', homeName: 'Inicio', crumbs: 'Ruta', nav: NAV, svcBase: '/servicios/', services: SERVICES,
    svcTitle: 'Servicios', studioTitle: 'Estudio', contactTitle: 'Contacto', quote: 'Cotizar proyecto', menu: 'Abrir menú',
    skip: 'Saltar intro', logo: 'Animación del logo de LIBO STUDIOS', wa: 'Escríbeme por WhatsApp',
    blurb: 'Páginas web, tiendas, SEO e inteligencia artificial desde Medellín, para negocios de Colombia y del mundo.',
    meet: 'Reuniones por videollamada y WhatsApp', hours: 'Atención todos los días, 24/7', rights: 'Todos los derechos reservados.', made: 'Hecho en Medellín',
    switchLabel: 'EN', switchName: 'English',
  },
  en: {
    lang: 'en', locale: 'en_US', home: '/en/', homeName: 'Home', crumbs: 'Breadcrumb',
    nav: [['studio', 'Studio'], ['services', 'Services'], ['projects', 'Projects'], ['industries', 'Industries'], ['process', 'Process'], ['contact', 'Contact']],
    svcBase: '/en/services/',
    services: [['web-design', 'Websites'], ['online-stores', 'Online stores'], ['whatsapp-catalog', 'WhatsApp catalog'], ['seo', 'SEO and Google Maps'],
      ['ai-chat', 'AI chat'], ['website-maintenance', 'Website maintenance'], ['custom-development', 'Custom development']],
    svcTitle: 'Services', studioTitle: 'Studio', contactTitle: 'Contact', quote: 'Get a quote', menu: 'Open menu',
    skip: 'Skip intro', logo: 'LIBO STUDIOS logo animation', wa: 'Message us on WhatsApp',
    blurb: 'Websites, online stores, SEO and AI from Medellín, Colombia, for businesses anywhere in the world.',
    meet: 'Meetings by video call and WhatsApp', hours: 'Open every day, 24/7', rights: 'All rights reserved.', made: 'Made in Medellín',
    switchLabel: 'ES', switchName: 'Español',
  },
};
const navPath = (t, slug) => (t.lang === 'en' ? '/en/' : '/') + slug + '/';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parsePage(text, file) {
  const m = text.match(/^\s*<!--(\{[\s\S]*?\})-->/);
  if (!m) throw new Error(`${file}: falta el encabezado <!--{json}-->`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${file}: JSON inválido: ${e.message}`); }
  for (const k of ['title', 'description', 'name']) if (!meta[k]) throw new Error(`${file}: falta "${k}" (description, title y name son obligatorios)`);
  return { meta, body: text.slice(m[0].length) };
}

export function urlFor(file) {
  const rel = file.split(sep).join('/').replace(/^pages\//, '').replace(/\.html$/, '');
  return rel === '404' ? '/404.html' : `/${rel}/`;
}

function breadcrumbs(meta, url, t) {
  const trail = url === t.home ? [[meta.name, url]] : [[t.homeName, t.home], ...(meta.crumbs || []), [meta.name, url]];
  return {
    ld: {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: BASE + path })),
    },
    html: `<nav class="crumbs" aria-label="${t.crumbs}"><ol>${trail.map(([name, path], i) =>
      i === trail.length - 1 ? `<li aria-current="page">${name}</li>` : `<li><a href="${path}">${name}</a></li>`).join('')}</ol></nav>`,
  };
}

// las preguntas frecuentes visibles (<details> dentro de .faq) también van a Google
const text = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function faqLd(body) {
  const qa = [...body.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)];
  return qa.length ? [{
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(([, q, a]) => ({ '@type': 'Question', name: text(q), acceptedAnswer: { '@type': 'Answer', text: text(a) } })),
  }] : [];
}

// el cierre de cada página lleva el video del código que termina en el logo, como el inicio
const withCodeVideo = body => body.replace('<div class="cta-band">',
  '<div class="cta-band"><video src="/assets/logo-code.mp4" poster="/assets/logo-code.jpg" muted playsinline preload="none" aria-hidden="true" data-play-on-view></video>');

// la cabecera de cada página se ve como la del inicio: fondo animado (acid.js) y, a la
// derecha, el video del logo. Si la página trae su propio diseño de cabecera, solo el fondo.
const HERO_BG = '<div class="hero-bg" aria-hidden="true"><div class="hero-shader" id="acid"></div></div>';
const heroVideo = t => `<div class="hero-media"><video src="/assets/logo-reveal.mp4" poster="/assets/logo-reveal-poster.webp" muted playsinline preload="metadata" aria-label="${t.logo}" data-loop-logo></video></div>`;
// la ruta (Inicio › Servicios › ...) va dentro de la cabecera, sobre el mismo fondo
const withHero = (body, top, t) => body
  .replace(/<section class="page-hero">\s*<div class="wrap">([\s\S]*?)<\/div>\s*<\/section>/,
    (_, inner) => `<section class="page-hero">${HERO_BG}${top}<div class="wrap hero-grid"><div>${inner}</div>${heroVideo(t)}</div></section>`)
  .replace(/<section class="page-hero">(?!<div class="hero-bg")/, '<section class="page-hero">' + HERO_BG + top);

// alt: ruta de la misma página en el otro idioma, o null si no existe
export function render(meta, body, url, alt = null) {
  const t = T[isEn(url) ? 'en' : 'es'];
  const canon = BASE + url;
  const og = BASE + '/' + (meta.og || 'assets/og/default.jpg');
  const crumbs = meta.noindex ? null : breadcrumbs(meta, url, t);
  const [esUrl, enUrl] = isEn(url) ? [alt, url] : [url, alt];
  const hreflang = alt && !meta.noindex ? `<link rel="alternate" hreflang="es" href="${BASE + esUrl}">
<link rel="alternate" hreflang="en" href="${BASE + enUrl}">
<link rel="alternate" hreflang="x-default" href="${BASE + esUrl}">` : '';
  const other = isEn(url) ? T.es : T.en;
  const switchLang = `<a class="lang" href="${alt || other.home}" hreflang="${other.lang}" lang="${other.lang}" aria-label="${t.switchName}">${t.switchLabel}</a>`;
  const top = crumbs ? `<div class="wrap">${crumbs.html}</div>` : '';
  const hasHero = body.includes('<section class="page-hero">');
  const ld = [...(crumbs ? [crumbs.ld] : []), ...(meta.schema || []), ...faqLd(body)]
    .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const navLinks = t.nav.map(([slug, label]) =>
    `<li><a href="${navPath(t, slug)}"${meta.nav === slug ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n      ');
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
${meta.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canon}">`}
${hreflang}
<meta property="og:type" content="website">
<meta property="og:locale" content="${t.locale}">
<meta property="og:site_name" content="LIBO STUDIOS">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.png">
${ld}
<script>
document.documentElement.classList.add('js');
// la intro con el video del logo sale una vez por visita, en la primera página que se abra
try {
  if (!sessionStorage.getItem('intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.documentElement.classList.add('intro-on');
} catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QHM4VTX3DD"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-QHM4VTX3DD');
</script>
${hasHero ? '<link rel="preload" as="image" href="/assets/logo-reveal-poster.webp" fetchpriority="high">' : ''}
</head>
<body>
<div class="intro" id="intro"><video data-src="/assets/logo-reveal.mp4" muted playsinline aria-label="${t.logo}"></video><button type="button" id="skip">${t.skip}</button></div>
<div class="progress" aria-hidden="true"></div>

<header>
  <div class="wrap bar">
    <a class="brand" href="${t.home}"><img src="/assets/logo.webp" alt="" width="52" height="37"><b>LIBO <span>STUDIOS</span></b></a>
    <nav id="nav"><ul>
      ${navLinks}
    </ul></nav>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="${t.menu}">☰</button>
    ${switchLang}
    <a class="btn" href="${navPath(t, t.nav[5][0])}">${t.quote}</a>
  </div>
</header>

<main class="inner">
${hasHero ? '' : top}
${withCodeVideo(withHero(body.trim(), top, t))}
</main>

<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>
        <a class="brand" href="${t.home}" style="margin-bottom:16px"><img src="/assets/logo.webp" alt="" width="52" height="37"><b>LIBO <span>STUDIOS</span></b></a>
        <p class="muted" style="max-width:36ch">${t.blurb}</p>
      </div>
      <div>
        <h2 class="fh">${t.svcTitle}</h2>
        <ul>
          ${t.services.map(([s, l]) => `<li><a href="${t.svcBase}${s}/">${l}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h2 class="fh">${t.studioTitle}</h2>
        <ul>
          ${t.nav.map(([s, l]) => `<li><a href="${navPath(t, s)}">${l}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h2 class="fh">${t.contactTitle}</h2>
        <ul>
          <li><a href="https://wa.me/${WA}">WhatsApp +57 315 419 2623</a></li>
          <li>Medellín, Antioquia, Colombia</li>
          <li><a href="mailto:palaciosrestrepo35@gmail.com">palaciosrestrepo35@gmail.com</a></li>
          <li>${t.meet}</li>
          <li>${t.hours}</li>
        </ul>
      </div>
    </div>
    <div class="legal">
      <span>© <span id="y"></span> LIBO STUDIOS. ${t.rights}</span>
      <span>${t.made}</span>
    </div>
  </div>
</footer>

<a class="wa" href="https://wa.me/${WA}" aria-label="${t.wa}">WhatsApp</a>
<script defer src="/site.js"></script>
<script defer src="/acid.js"></script>${body.includes('data-wheel') ? '\n<script defer src="/wheel.js"></script>' : ''}
</body>
</html>
`;
}

// fecha del último commit de la fuente; sin commit todavía, hoy. Google y Bing usan <lastmod> para saber qué volver a rastrear
const today = () => new Date().toISOString().slice(0, 10);
export function lastmod(file) {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim() || today(); }
  catch { return today(); }
}

// urls: [ruta, fecha] por página
export function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${BASE + u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export function sourceFiles(dir = join(ROOT, 'pages')) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sourceFiles(p) : f.endsWith('.html') ? [p] : [];
  });
}

export const outFor = url => join(ROOT, url.endsWith('/') ? url + 'index.html' : url);

function main() {
  const urls = [['/', lastmod('index.html')]];
  const pages = sourceFiles().map(abs => {
    const file = relative(ROOT, abs);
    return { file, url: urlFor(file), ...parsePage(readFileSync(abs, 'utf8'), file) };
  });
  // cada página en inglés dice cuál es su versión en español; el camino de vuelta sale de ahí
  const alts = new Map();
  for (const p of pages) if (p.meta.alt) { alts.set(p.url, p.meta.alt); alts.set(p.meta.alt, p.url); }
  for (const { file, url, meta, body } of pages) {
    mkdirSync(dirname(outFor(url)), { recursive: true });
    writeFileSync(outFor(url), render(meta, body, url, alts.get(url) || null));
    if (!meta.noindex) urls.push([url, lastmod(file)]);
    console.log('ok', url);
  }
  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap(urls));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
