/* Movimiento con GSAP (los plugins de gsap.com/ui: SplitText y Flip)
   y Magnet de reactbits portado sin React (SpotlightCard vive en site.js, OptionWheel en wheel.js).
   Si GSAP no carga o el usuario pide menos movimiento, todo queda quieto y visible. */
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const h1 = document.querySelector('.hero h1');

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
  gsap.registerPlugin(SplitText, Flip);

  // SplitText: las letras suben desde abajo de su renglón; la línea en degradado
  // entra como barrido, porque partirla en letras rompe el background-clip:text
  const heroIn = () => document.fonts.ready.then(() => {
    const split = SplitText.create('.hero h1 span:not(.accent)', { type: 'words,chars', mask: 'chars', aria: 'none' });  // words: nunca parte una palabra
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
