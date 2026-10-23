# LIBO STUDIOS

Landing page for LIBO STUDIOS, a web design and development studio in Medellín. Static site, no build step.

```
index.html      page, styles and scripts
acid.js         WebGL hero background (AcidSquares de reactbits)
motion.js       GSAP: SplitText, Draggable + Inertia, Magnet, Spotlight
assets/         logo.png (ícono), logo-full.png, favicon.png, logo-reveal.mp4 (intro + hero), logo-code.mp4 (cierre)
```

## Local

```bash
npx http-server -p 5503 -c-1   # soporta rangos: el video puede saltar al logo armado
```

Then open http://localhost:5503. Edit and refresh, there is nothing to compile.

## Deploy

```bash
npm i -g vercel
vercel          # preview URL
vercel --prod   # production
```

Vercel serves the folder as-is. No framework, no build command, no environment
variables.

## Before going live

The page currently ships with placeholder business data. Replace it:

- **WhatsApp number.** `573000000000` appears in three places: the `WA` constant
  in the script at the bottom of `index.html`, the footer contact list, and the
  floating WhatsApp button. All three must be the real number, in international
  format without `+`.
- **Stats.** `4800`, `1200` and `98` in the orange band are invented. They drive
  the odometer through `data-value`.
- **Testimonials.** The four quotes and the names on them are invented. Real
  quotes, or cut the section.
- **Trust row.** `12` years, `1 año` warranty and `48 h` turnaround in the hero.
- **Address and hours** in the footer.

Publishing invented reviews as if they were real customers is a legal problem in
Colombia, not just a stylistic one. Swap them or remove the section.

## Notes

Three components from reactbits and GSAP were ported to plain JS and CSS rather
than installed, which is why there is no `package.json`:

- **Counter** (reactbits): the odometer in the stats band. Same digit math,
  driven by `requestAnimationFrame` instead of a motion spring.
- **AcidSquares** (reactbits): the hero background. The fragment shader is
  verbatim, running on raw WebGL2 instead of `ogl`. Tune it in the `P` object at
  the top of `acid.js`. The blur post-pass was dropped since it never ran at
  `blur: 0`.
- **ScrollFloat** (GSAP + ScrollTrigger): the per-letter heading animation. The
  `stagger` became a shifted `animation-range` per character and the `scrub`
  became the browser's own view timeline.

Scroll animations use native CSS scroll timelines, so they need Chrome, Edge or
Safari 26. Firefox shows the page static and complete, and so does any browser
where the visitor asked for reduced motion.
