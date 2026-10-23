// Genera cada página de pages/ dentro del mismo diseño (cabecera, pie, etiquetas SEO)
// y escribe archivos estáticos: <ruta>/index.html y sitemap.xml. Vercel los sirve tal cual.
// Uso: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// el dominio vive aquí; al cambiarlo, también en index.html y robots.txt
export const BASE = 'https://libo-studios.vercel.app';
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

function breadcrumbs(meta, url) {
  const trail = [['Inicio', '/'], ...(meta.crumbs || []), [meta.name, url]];
  return {
    ld: {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: BASE + path })),
    },
    html: `<nav class="crumbs" aria-label="Ruta"><ol>${trail.map(([name, path], i) =>
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
const HERO_VIDEO = '<div class="hero-media"><video src="/assets/logo-reveal.mp4" poster="/assets/logo-reveal-poster.webp" muted playsinline preload="metadata" aria-label="Animación del logo de LIBO STUDIOS" data-loop-logo></video></div>';
// la ruta (Inicio › Servicios › ...) va dentro de la cabecera, sobre el mismo fondo
const withHero = (body, top) => body
  .replace(/<section class="page-hero">\s*<div class="wrap">([\s\S]*?)<\/div>\s*<\/section>/,
    (_, inner) => `<section class="page-hero">${HERO_BG}${top}<div class="wrap hero-grid"><div>${inner}</div>${HERO_VIDEO}</div></section>`)
  .replace(/<section class="page-hero">(?!<div class="hero-bg")/, '<section class="page-hero">' + HERO_BG + top);

export function render(meta, body, url) {
  const canon = BASE + url;
  const og = BASE + '/' + (meta.og || 'assets/og/default.jpg');
  const crumbs = meta.noindex ? null : breadcrumbs(meta, url);
  const top = crumbs ? `<div class="wrap">${crumbs.html}</div>` : '';
  const hasHero = body.includes('<section class="page-hero">');
  const ld = [...(crumbs ? [crumbs.ld] : []), ...(meta.schema || []), ...faqLd(body)]
    .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const navLinks = NAV.map(([slug, label]) =>
    `<li><a href="/${slug}/"${meta.nav === slug ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n      ');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
${meta.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canon}">`}
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CO">
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
${hasHero ? '<link rel="preload" as="image" href="/assets/logo-reveal-poster.webp" fetchpriority="high">' : ''}
</head>
<body>
<div class="intro" id="intro"><video data-src="/assets/logo-reveal.mp4" muted playsinline aria-label="Animación del logo de LIBO STUDIOS"></video><button type="button" id="skip">Saltar intro</button></div>
<div class="progress" aria-hidden="true"></div>

<header>
  <div class="wrap bar">
    <a class="brand" href="/"><img src="/assets/logo.webp" alt="" width="52" height="37"><b>LIBO <span>STUDIOS</span></b></a>
    <nav id="nav"><ul>
      ${navLinks}
    </ul></nav>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="Abrir menú">☰</button>
    <a class="btn" href="/contacto/">Cotizar proyecto</a>
  </div>
</header>

<main class="inner">
${hasHero ? '' : top}
${withCodeVideo(withHero(body.trim(), top))}
</main>

<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>
        <a class="brand" href="/" style="margin-bottom:16px"><img src="/assets/logo.webp" alt="" width="52" height="37"><b>LIBO <span>STUDIOS</span></b></a>
        <p class="muted" style="max-width:36ch">Páginas web, tiendas, SEO e inteligencia artificial para negocios en Medellín, toda Colombia y el mundo.</p>
      </div>
      <div>
        <h2 class="fh">Servicios</h2>
        <ul>
          ${SERVICES.map(([s, l]) => `<li><a href="/servicios/${s}/">${l}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h2 class="fh">Estudio</h2>
        <ul>
          ${NAV.map(([s, l]) => `<li><a href="/${s}/">${l}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h2 class="fh">Contacto</h2>
        <ul>
          <li><a href="https://wa.me/${WA}">WhatsApp +57 315 419 2623</a></li>
          <li>Medellín, Colombia</li>
          <li><a href="mailto:palaciosrestrepo35@gmail.com">palaciosrestrepo35@gmail.com</a></li>
          <li>Proyectos en todo el país y fuera de Colombia</li>
          <li>Atención todos los días, 24/7</li>
        </ul>
      </div>
    </div>
    <div class="legal">
      <span>© <span id="y"></span> LIBO STUDIOS. Todos los derechos reservados.</span>
      <span>Hecho en Medellín</span>
    </div>
  </div>
</footer>

<a class="wa" href="https://wa.me/${WA}" aria-label="Escríbeme por WhatsApp">WhatsApp</a>
<script defer src="/site.js"></script>
<script defer src="/acid.js"></script>${body.includes('data-wheel') ? '\n<script defer src="/wheel.js"></script>' : ''}
</body>
</html>
`;
}

export function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${BASE + u}</loc></url>`).join('\n')}
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
  const urls = ['/'];
  for (const abs of sourceFiles()) {
    const file = relative(ROOT, abs);
    const { meta, body } = parsePage(readFileSync(abs, 'utf8'), file);
    const url = urlFor(file);
    mkdirSync(dirname(outFor(url)), { recursive: true });
    writeFileSync(outFor(url), render(meta, body, url));
    if (!meta.noindex) urls.push(url);
    console.log('ok', url);
  }
  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap(urls));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
