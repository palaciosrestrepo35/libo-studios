/* Movimiento con GSAP (los plugins de gsap.com/ui: SplitText, Draggable, Inertia)
   y dos efectos de reactbits portados sin React: SpotlightCard y Magnet.
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
  gsap.registerPlugin(SplitText, Draggable, InertiaPlugin, Flip);

  // SplitText: las letras suben desde abajo de su renglón; la línea en degradado
  // entra como barrido, porque partirla en letras rompe el background-clip:text
  const heroIn = () => document.fonts.ready.then(() => {
    const split = SplitText.create('.hero h1 span:not(.accent)', { type: 'chars', mask: 'chars' });
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

  // tablero: las piezas caen al verlo y se pueden arrastrar y lanzar con inercia
  const play = document.getElementById('play');
  const chips = [...play.querySelectorAll('.chip')];
  const place = () => chips.forEach((c, i) => {
    const w = play.clientWidth, cols = w < 500 ? 2 : 3, row = Math.floor(i / cols);
    const x = ((i % cols) + 0.15 + (row % 2) * 0.35) * (w / cols);
    gsap.set(c, { x: gsap.utils.clamp(16, w - c.offsetWidth - 16, x), y: 28 + row * 92 });
  });
  place();
  addEventListener('resize', place);
  const fall = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    gsap.from(chips, { y: -140, opacity: 0, rotate: () => gsap.utils.random(-25, 25), duration: 1.1, ease: 'bounce.out', stagger: 0.07 });
    fall.disconnect();
  }, { threshold: 0.5 });
  fall.observe(play);

  Draggable.create(chips, {
    bounds: play,
    inertia: true,
    edgeResistance: 0.75,
    onPress() { gsap.to(this.target, { scale: 1.1, rotate: gsap.utils.random(-8, 8), duration: 0.2 }); },
    onRelease() { gsap.to(this.target, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(3)' }); }
  });

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
