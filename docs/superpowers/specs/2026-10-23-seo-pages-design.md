# LIBO STUDIOS: service, sector and case pages for SEO

## Intent

LIBO STUDIOS (https://libo-studios.vercel.app/) is one landing page today. The goal is to rank on Google. Before setting up Google Search Console, a Google Business Profile and a custom domain, the site should be complete and well built, so the first thing Google finds is the best version of it.

A single page can't rank for "páginas web Medellín", "tienda online Colombia", "SEO Medellín" and "páginas web para restaurantes" all at once. Each of those searches needs its own page.

## Goals

- 6 navigation pages (one per header menu item), 7 service pages, 1 case study page, 5 sector pages, all in Spanish. 19 new pages in total.
- Every page is complete for search: title, description, headings with keywords, social preview tags, structured data, internal links.
- Site-wide basics: `sitemap.xml`, `robots.txt`, a 404 page.
- The home page links to all new pages.
- Copy in plain words a business owner understands. No jargon like "Core Web Vitals", "Merchant Center", "HSTS", "APIs". When a technical thing matters, say what it does for the client ("tu página carga rápido en el celular").
- The message throughout: we build anything a business needs, for small businesses and big companies.

## Non-goals

- No admin panel. Dropped after discussion: it needs a login, database and server for edits that can be made in code.
- No English pages yet. Later, once the Spanish site is complete.
- No pages for the other 10 sectors yet. They come later, one at a time.
- No per-city pages (Bogotá, Cali...). Other cities are mentioned in the copy only.
- No Search Console, Business Profile or domain setup in this project.

## Anti-goals (failure even if it works)

- Invented reviews, clients, numbers or prices. Only real facts. The README notes fake reviews are a legal problem in Colombia.
- Thin or near-duplicate pages, for example sector pages that only swap the sector name. Each page must have its own real content.
- Pages that look or feel different from the home page.
- Technical jargon aimed at clients.
- A slow site. Pages must stay fast on a phone.

## Pages

URLs are lowercase Spanish slugs, served as folders with `index.html` (e.g. `/paginas-web-medellin/`), which Vercel serves with no config.

Services:

| Page | Slug (builder may refine after keyword research) |
|---|---|
| Páginas web | `/paginas-web-medellin/` |
| Tiendas online | `/tiendas-online/` |
| Catálogo con pedidos por WhatsApp | `/catalogo-whatsapp/` |
| SEO y Google Maps | `/seo-medellin/` |
| Chat con IA y automatización | `/chat-con-ia/` |
| Mantenimiento web | `/mantenimiento-web/` |
| Desarrollo a la medida (small and big companies) | `/desarrollo-a-la-medida/` |

Case study: Detalles de Amor at `/proyectos/detalles-de-amor/`. Facts available are those on the home page today (176 pages ES/EN, 52 product pages, 58 products in Google Shopping, 152 pages in Google, 100/100 Ubersuggest, chat in 2 languages, live at https://detallesdeamor.co/). Nothing beyond that.

The owner of LIBO STUDIOS also manages Detalles de Amor and approved a dedicated indexed page plus free use of its screenshots, logo and product photos. Capture and optimize them (WebP, sized, lazy loaded) and use one as the page's 1200x630 social preview image.

Sectors, at `/sectores/<slug>/`: tiendas y regalos (links the case study), restaurantes, salud, belleza, servicios profesionales.

Navigation pages. The owner asked for one real page per header menu item (Estudio, Servicios, Proyectos, Sectores, Proceso, Contacto). The header links to these pages, not to `#anchors`. The home page keeps its sections as a summary, and each section links to its full page.

| Menu item | URL | Content |
|---|---|---|
| Estudio | `/estudio/` | Who LIBO STUDIOS is, how it works (one-to-one with the person who builds), what it believes in (own code, mobile first, ready for Google), that it serves small businesses and big companies in Medellín, Colombia and abroad. |
| Servicios | `/servicios/` | Hub: every service with a plain summary, linking to its service page. States clearly that anything a business needs can be built. |
| Proyectos | `/proyectos/` | Hub: Detalles de Amor case card linking to the case page. Built so new projects can be added as cards. |
| Sectores | `/sectores/` | Hub: all 15 sectors from the home page. The 5 with pages link to them, the other 10 are listed with their short description and a contact link. |
| Proceso | `/proceso/` | Modeled on https://www.somosglez.com/proceso: intro heading, numbered steps (01, 02...), each with a title, a one-line subtitle, a plain description and what the client receives in that step, then a closing statement and CTA. Uses the 4 steps on the home page (Conversación, Propuesta, Diseño y desarrollo, Lanzamiento y soporte), expanded. Add an FAQ about the process. |
| Contacto | `/contacto/` | The quote form (same WhatsApp behavior as the home page), WhatsApp, email, city, hours, and `ContactPage` structured data. |

## Commercial facts (defaults, owner did not specify)

- No prices are published. FAQs cover process, timing in general terms ("te damos la fecha por escrito en la propuesta"), ownership and support, never amounts.
- Detalles de Amor is the only past project. Every other page speaks in capability ("podemos construir", "construimos"), never "hemos construido para X", and shows no testimonials or client logos.
- If the owner later gives prices, delivery times or more projects, they are added then.

## Geography

- Medellín in the main titles. It's the most winnable local search and where the Business Profile will be.
- All of Colombia in the copy of every page: work with businesses in Bogotá, Cali, Barranquilla and the whole country, fully online.
- International clients welcome, stated in copy. Spanish reaches Latin America, the US and Spain.

## Each page contains

- Unique `<title>` and meta description with the target keyword.
- One `h1`, logical `h2`/`h3`.
- Plain-language copy: what the client gets, who it's for, how it works, a short FAQ with real questions clients ask.
- A clear call to action to WhatsApp (+57 315 419 2623, same `wa.me` pattern as the home page) or the quote form on the home page.
- Canonical URL, Open Graph and Twitter tags (image: an existing asset such as `assets/logo-reveal.jpg` unless the builder makes a proper 1200x630 one).
- JSON-LD: `Service` (or the case/sector equivalent), `BreadcrumbList`, `FAQPage` where there is an FAQ. The `ProfessionalService` block on the home page is the business entity, referenced, not duplicated with different data.
- Links to related pages and back home.

## Constraints

- Plain static HTML, no framework, no build step, as now (see `README.md`).
- Shared look: the home page's styles are inline in `index.html` (`<style>` ends at line 342). Move what new pages need into one shared stylesheet. The home page must look and behave exactly as before.
- New pages reuse the home page header, footer and visual style. Heavy effects (WebGL hero `acid.js`, intro video) stay on the home page only.
- The domain will change later. Absolute URLs (canonical, sitemap, OG, JSON-LD) must be easy to replace in one pass. Today's base is `https://libo-studios.vercel.app`.
- Accessibility basics and reduced-motion respected, as on the home page.

## Decided

- The 6 + 7 + 1 + 5 page list above, approved by the owner.
- Spanish only, Medellín-first, Colombia and world in copy.
- Plain language for clients (owner's explicit request). The Detalles de Amor section on the home page was already rewritten this way and is the reference for tone.
- Plain HTML, shared stylesheet (my call).
- `index.html` is the source of truth. `README.md` is outdated (still describes placeholder number, stats and testimonials that are gone) and gets updated as part of the build (my call).

## Left to the builder

- Keyword research per page and final slugs.
- Exact copy, within the facts and tone above.
- Page layout, as long as it matches the home page style.
- Rewriting the jargon tags in the home page Servicios section into plain words.
- Whether to add a "Servicios" dropdown or just links in the header/footer.
