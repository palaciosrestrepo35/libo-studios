# LIBO STUDIOS

Website for LIBO STUDIOS, a web design and development studio in Medellín. Plain static HTML, CSS and JS, served by Vercel as-is. Live at https://libostudios.space/

```
index.html        home page, written by hand
pages/            source of every other page: a JSON header + the page body
tools/build.mjs   wraps each page in the shared layout, writes <slug>/index.html and sitemap.xml
tools/check.mjs   SEO and copy checks for every page
styles.css        all styles, shared by every page
site.js           menu, quote form → WhatsApp, logo intro, videos, scroll titles
motion.js         home only: GSAP SplitText + Flip intro, Magnet, OptionWheel
acid.js           WebGL background in every page header (AcidSquares from reactbits)
assets/           logo, favicon, videos, Open Graph images (og/), case screenshots (casos/)
docs/             design, plan and keyword map (docs/seo/keywords.md)
```

The folders `estudio/`, `servicios/`, `sectores/`, `proyectos/`, `proceso/`, `contacto/`, `404.html` and `sitemap.xml` are generated. Edit the file in `pages/`, never the generated one.

## Edit or add a page

1. Edit or create a file in `pages/`. The path is the URL: `pages/servicios/tiendas-online.html` becomes `/servicios/tiendas-online/`.
2. The file starts with a JSON header:

   ```html
   <!--{
     "title": "Up to 60 characters",
     "description": "120 to 160 characters",
     "name": "Short name for the breadcrumb",
     "nav": "servicios",
     "crumbs": [["Servicios", "/servicios/"]],
     "schema": [ { "@type": "Service", ... } ],
     "og": "assets/og/image.jpg"
   }-->
   ```

   `title`, `description` and `name` are required. The layout adds the header, footer, breadcrumb, canonical, social preview tags and the breadcrumb data for Google.
3. A `<section class="page-hero">` gets the animated background and the logo video. A `<div class="cta-band">` gets the code-to-logo video. Questions written as `<details><summary>` inside `<div class="faq">` are also sent to Google as FAQ data.
4. Build and check:

   ```bash
   node tools/build.mjs && node tools/check.mjs
   node --test tools/build.test.mjs
   ```

   The check fails on titles or descriptions out of range, more or fewer than one `h1`, broken internal links, invalid Google data, service or sector pages under 500 words, dashes, and technical words a client would not understand (the list is `JARGON` in `tools/check.mjs`).

## Local

```bash
npx http-server -p 5500 -c-1
```

Then open http://localhost:5500. Pages use absolute paths (`/styles.css`), so open the site through a server, not as a file.

## Deploy

```bash
vercel          # preview URL
vercel --prod   # production
```

No framework, no build command on Vercel. Run `node tools/build.mjs` and commit the generated files before deploying.

`vercel.json` redirects `/servicios` to `/servicios/` and `/index.html` to `/`, so each page has one address. `.vercelignore` keeps `pages/`, `tools/` and `docs/` off the server, otherwise Google sees every page twice.

After a deploy, tell Bing (and every engine on IndexNow) what changed:

```bash
node tools/indexnow.mjs
```

The key file `3bd86c40c983d16ca0d0a9e71673e60c.txt` at the root must stay published for that to work.

## Changing the domain

The address lives in three places: `BASE` in `tools/build.mjs`, the canonical, Open Graph and business data in `index.html`, and `robots.txt`. Change all three, run the build, and `tools/check.mjs` confirms `index.html` matches `BASE`.

## Notes

Components from reactbits and GSAP were ported to plain JS and CSS rather than installed, which is why there is no `package.json`:

- **AcidSquares** (reactbits): the header background. The fragment shader is verbatim, running on raw WebGL2. Tune it in the `P` object at the top of `acid.js`.
- **OptionWheel**, **Magnet** and **SpotlightCard** (reactbits), same math as the originals.
- **ScrollFloat** (GSAP + ScrollTrigger): the per-letter heading animation, done with the browser's scroll timelines.

Scroll animations need Chrome, Edge or Safari 26. Firefox shows the pages static and complete, and so does any browser where the visitor asked for reduced motion.

Only real facts go on the site: no invented reviews, clients or numbers. Publishing invented reviews is a legal problem in Colombia.
