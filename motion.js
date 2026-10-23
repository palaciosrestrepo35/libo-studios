/* Movimiento con GSAP (los plugins de gsap.com/ui: SplitText y Flip)
   y efectos de reactbits portados sin React: SpotlightCard, Magnet y OptionWheel.
   Si GSAP no carga o el usuario pide menos movimiento, todo queda quieto y visible. */
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const h1 = document.querySelector('.hero h1');

// SpotlightCard: el halo sigue al cursor (solo CSS vars, no necesita GSAP)
document.querySelectorAll('.spot').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--x', e.clientX - r.left + 'px');
    card.style.setProperty('--y', e.clientY - r.top + 'px');
  });
});

// video del logo: después de la revelación (≈4,6 s) repite solo el tramo del logo
// ya armado, para no volver a lanzar el haz de luz cada 8 segundos
const vid = document.getElementById('logoVid');
const LOGO_READY = 4.6;
const loopLogo = () => { vid.currentTime = LOGO_READY; vid.play().catch(() => {}); };
vid.addEventListener('ended', loopLogo);

// cierre: el video del código arranca desde cero cada vez que entra en pantalla
// y se queda en el logo al terminar; sin movimiento, solo el póster con el logo
const codeVid = document.getElementById('codeVid');
if (!calm) new IntersectionObserver(([e]) => {
  if (e.isIntersecting) { codeVid.currentTime = 0; codeVid.play().catch(() => {}); }
  else codeVid.pause();
}, { threshold: 0.45 }).observe(codeVid);

/* OptionWheel (reactbits): misma matemática que el original. Cada opción va sobre
   un círculo cuyo radio deja una fila de distancia entre vecinas, y un solo rAF
   acerca la posición al objetivo con suavizado exponencial.
   ponytail: sin capturar la rueda del mouse ni el arrastre táctil, para no
   secuestrar el scroll de la página; en celular se toca la opción. */
function optionWheel(root, items, { start = 0, rowEm = 1.35, tilt = 7, blur = 1.6, fade = 0.24, minOpacity = 0.05, smoothing = 220, onChange } = {}) {
  const n = items.length;
  const els = items.map((label, i) => {
    const el = document.createElement('div');
    el.className = 'ow-item';
    el.setAttribute('role', 'option');
    el.textContent = label;
    el.onclick = () => { if (!moved) go(target + shortest(i - mod(Math.round(target))), true); };
    root.append(el);
    return el;
  });
  const mod = v => ((v % n) + n) % n;
  const shortest = d => (d > n / 2 ? d - n : d < -n / 2 ? d + n : d);
  let pos = start, target = start, sel = -1, raf = null, last = 0, drag = null, moved = false;

  const frame = now => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    pos += (target - pos) * (1 - Math.exp(-dt / (Math.max(smoothing, 1) / 1000)));
    const settled = Math.abs(target - pos) < 0.001;
    if (settled) pos = target;
    const rowH = parseFloat(getComputedStyle(els[0]).fontSize) * rowEm;
    const tiltRad = (tilt * Math.PI) / 180, R = rowH / tiltRad;
    els.forEach((el, i) => {
      const d = shortest(mod(i - pos)), dist = Math.abs(d);
      const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
      const x = -R * (1 - Math.cos(ang)), y = R * Math.sin(ang);
      el.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${((ang * 180) / Math.PI).toFixed(3)}deg)`;
      el.style.opacity = Math.max(minOpacity, 1 - dist * fade);
      el.style.filter = blur > 0 ? `blur(${(dist * blur).toFixed(2)}px)` : 'none';
      el.style.setProperty('--ow-p', Math.max(0, 1 - Math.min(dist, 1)).toFixed(4));
    });
    raf = settled ? null : requestAnimationFrame(frame);
  };
  const go = (v, snap) => {
    target = snap ? Math.round(v) : v;
    const idx = mod(Math.round(target));
    if (idx !== sel) {
      if (sel >= 0) { els[sel].classList.remove('on'); els[sel].setAttribute('aria-selected', 'false'); }
      sel = idx;
      els[idx].classList.add('on');
      els[idx].setAttribute('aria-selected', 'true');
      onChange?.(idx);
    }
    if (raf == null) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };

  // arrastre solo con mouse; en táctil el gesto vertical sigue siendo scroll de la página
  root.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    drag = { y: e.clientY, start: target, id: e.pointerId };
    moved = false;
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (!moved && Math.abs(dy) > 4) { moved = true; root.setPointerCapture(drag.id); root.classList.add('dragging'); }
    if (moved) go(drag.start - dy / (parseFloat(getComputedStyle(els[0]).fontSize) * rowEm), false);
  });
  const end = () => { if (!drag) return; drag = null; root.classList.remove('dragging'); if (moved) go(target, true); setTimeout(() => (moved = false)); };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('keydown', e => {
    const delta = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    go(Math.round(target) + delta, true);
  });
  addEventListener('resize', () => go(target, false));
  go(start, false);
  return { next: () => go(Math.round(target) + 1, true), busy: () => drag != null };
}

// la rueda de lo que hacemos: cada opción trae su frase debajo
const WHEEL = [
  ['Diseño', 'A la medida de tu marca, sin plantillas genéricas.'],
  ['Código', 'Código propio, rápido y fácil de mantener.'],
  ['SEO', 'Que te encuentren en Google y en Google Maps.'],
  ['WhatsApp', 'Pedidos y consultas que llegan listos a tu chat.'],
  ['Tiendas', 'Pagos con Wompi, Mercado Pago, PayU o Stripe.'],
  ['IA', 'Un chat que conoce tu catálogo y responde por ti.'],
  ['Velocidad', 'Sitios que cargan rápido, también en el celular.'],
  ['Soporte', 'Cambios, hosting y seguridad siempre al día.']
];
const wheelBox = document.getElementById('play');
const caption = wheelBox.querySelector('.ow-caption');
const wheel = optionWheel(wheelBox.querySelector('.ow'), WHEEL.map(w => w[0]), {
  start: 2,
  smoothing: calm ? 1 : 220,
  onChange: i => {
    const b = document.createElement('b'), s = document.createElement('span');
    b.textContent = WHEEL[i][0];
    s.textContent = WHEEL[i][1];
    caption.replaceChildren(b, s);
  }
});
// gira sola mientras se ve, y se detiene cuando alguien la está usando
if (!calm) {
  let visible = false, paused = false, touched = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 }).observe(wheelBox);
  ['pointerenter', 'focusin'].forEach(t => wheelBox.addEventListener(t, () => (paused = true)));
  ['pointerleave', 'focusout'].forEach(t => wheelBox.addEventListener(t, () => (paused = false)));
  // en celular no hay hover: después de tocar una opción, se deja leer 8 s
  ['pointerdown', 'keydown'].forEach(t => wheelBox.addEventListener(t, () => (touched = Date.now())));
  setInterval(() => {
    if (visible && !paused && !wheel.busy() && !document.hidden && Date.now() - touched > 8000) wheel.next();
  }, 2600);
}

const intro = document.getElementById('intro');
const endIntroNow = () => {
  document.documentElement.classList.remove('intro-on');
  try { sessionStorage.setItem('intro', '1'); } catch (e) {}
};

if (!window.gsap || calm) {
  endIntroNow();
  h1.style.visibility = 'visible';
  if (!calm) loopLogo();       // sin GSAP igual se ve el video, sin la intro
} else {
  gsap.registerPlugin(SplitText, Flip);

  // SplitText: las letras suben desde abajo de su renglón; la línea en degradado
  // entra como barrido, porque partirla en letras rompe el background-clip:text
  const heroIn = () => document.fonts.ready.then(() => {
    const split = SplitText.create('.hero h1 span:not(.accent)', { type: 'words,chars', mask: 'chars' });  // words: nunca parte una palabra
    gsap.set(h1, { visibility: 'visible' });
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(split.chars, { yPercent: 110, rotate: 8, duration: 1.1, stagger: 0.025 })
      .fromTo('.hero h1 .accent', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.inOut', clearProps: 'clipPath' }, 0.15);
  });

  // intro: el video arranca a pantalla completa y, cuando el logo termina de armarse,
  // Flip lo lleva hasta su lugar en el hero sin cortarlo: sigue reproduciéndose
  if (document.documentElement.classList.contains('intro-on')) {
    intro.prepend(vid);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      vid.removeEventListener('timeupdate', watch);
      if (vid.currentTime < LOGO_READY) vid.currentTime = LOGO_READY;   // al saltar, el logo ya armado
      const media = document.getElementById('heroMedia');
      gsap.to('#skip', { autoAlpha: 0, duration: 0.3 });
      // el video viaja dentro de la intro (que está encima de todo) hasta el hueco del hero;
      // solo se desvanece el negro de fondo, no el video
      gsap.to(intro, { backgroundColor: 'rgba(0,0,0,0)', duration: 1.1, ease: 'power2.inOut' });
      Flip.fit(vid, media, { duration: 1.3, ease: 'power3.inOut', onComplete: () => {
        media.append(vid);
        gsap.set(vid, { clearProps: 'all' });
        endIntroNow();
        intro.remove();
      } });
      heroIn();
    };
    const watch = () => { if (vid.currentTime >= LOGO_READY) finish(); };
    vid.addEventListener('timeupdate', watch);
    document.getElementById('skip').onclick = finish;
    scrollTo(0, 0);
    vid.currentTime = 0;
    vid.play().catch(finish);                                // sin autoplay (ahorro de batería): directo a la página
    setTimeout(finish, 9000);                                // red lenta: nunca dejar la página tapada
  } else {
    loopLogo();
    heroIn();
  }

  // Magnet: los botones del hero se dejan atraer un poco por el cursor
  if (fine) document.querySelectorAll('.magnet').forEach(btn => {
    const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.35);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}
