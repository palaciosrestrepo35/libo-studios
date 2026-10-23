/* Lo que comparten todas las páginas: menú, año del pie, halo de tarjetas,
   títulos que flotan con el scroll y el formulario que abre WhatsApp. */
const WA = '573154192623';

// el formulario arma el mensaje y abre WhatsApp con todo ya escrito
function waMessage(f) {
  const msg = `Hola LIBO STUDIOS, quiero cotizar un proyecto.
Nombre: ${f.nombre}
Teléfono: ${f.tel}
Negocio: ${f.negocio}
Servicio: ${f.servicio}
Página actual: ${f.actual}
Detalle: ${f.detalle}`;
  return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
}

if (typeof document !== 'undefined') {   // fuera del navegador (las pruebas) solo se usa waMessage
  document.getElementById('y').textContent = new Date().getFullYear();

  const burger = document.getElementById('burger'), nav = document.getElementById('nav');
  burger.onclick = () => burger.setAttribute('aria-expanded', nav.classList.toggle('open'));
  nav.onclick = e => { if (e.target.tagName === 'A') nav.classList.remove('open'); };

  const quote = document.getElementById('quote');
  if (quote) quote.onsubmit = e => {
    e.preventDefault();
    window.open(waMessage(Object.fromEntries(new FormData(e.target))), '_blank');
  };

  // SpotlightCard (reactbits): el halo sigue al cursor, solo con variables CSS
  document.querySelectorAll('.spot').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', e.clientX - r.left + 'px');
      card.style.setProperty('--y', e.clientY - r.top + 'px');
    });
  });

  /* ScrollFloat: parte el título en letras y le corre el rango a cada una.
     El desfase que en GSAP es `stagger` aquí es un animation-range desplazado, y
     el `scrub` lo da la línea de tiempo del navegador. Sin GSAP ni ScrollTrigger. */
  function scrollFloat(h) {
    const chars = [];
    for (const node of [...h.childNodes]) {
      if (node.nodeType !== Node.TEXT_NODE) continue;   // los <br> quedan intactos
      const frag = document.createDocumentFragment();
      node.textContent.split(' ').forEach((w, i) => {
        if (i) frag.append(' ');                        // espacio real: el título sigue partiendo línea solo
        const word = document.createElement('span');   // y nunca a mitad de palabra
        word.style.whiteSpace = 'nowrap';
        for (const ch of w) {
          const s = document.createElement('span');
          s.className = 'char';
          s.textContent = ch;
          word.append(s);
          chars.push(s);
        }
        frag.append(word);
      });
      node.replaceWith(frag);
    }
    // el desfase total es fijo, así un título largo no se vuelve eterno
    const step = 22 / Math.max(1, chars.length - 1);
    chars.forEach((s, i) => {
      s.style.animationRange = 'entry ' + (8 + i * step).toFixed(1) + '% cover ' + (32 + i * step).toFixed(1) + '%';
    });
    h.classList.add('scroll-float');
  }
  if (CSS.supports('animation-timeline: view()') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('section:not(.hero):not(.page-hero) h2').forEach(scrollFloat);
  }

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // logo de la cabecera: después de armarse (≈4,6 s) repite solo el tramo del logo ya armado.
  // Sin movimiento se queda el póster con el logo
  const startLogo = () => { if (!still) document.querySelectorAll('video[data-loop-logo]').forEach(v => {
    v.addEventListener('ended', () => { v.currentTime = 4.6; v.play().catch(() => {}); });
    v.play().catch(() => {});
  }); };

  /* intro en las páginas internas: el video del logo a pantalla completa y, ya armado
     el logo, se desvanece. En el inicio la maneja motion.js, que lo lleva al hero con Flip. */
  const intro = document.getElementById('intro');
  if (intro && !document.getElementById('heroMedia')) {
    const root = document.documentElement;
    if (root.classList.contains('intro-on')) {
      try { sessionStorage.setItem('intro', '1'); } catch (e) {}   // una vez por visita, aunque se vaya a mitad
      const v = intro.querySelector('video');
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        intro.classList.add('out');
        setTimeout(() => { root.classList.remove('intro-on'); intro.remove(); }, 700);
        startLogo();
      };
      v.src = v.dataset.src;                     // solo se descarga cuando de verdad se va a ver
      v.addEventListener('timeupdate', () => { if (v.currentTime >= 5.4) finish(); });
      v.addEventListener('ended', finish);
      document.getElementById('skip').onclick = finish;
      v.play().catch(finish);                    // sin autoplay: directo a la página
      setTimeout(finish, 9000);                  // red lenta: nunca dejar la página tapada
    } else { intro.remove(); startLogo(); }
  }

  // cierre: el video del código arranca cada vez que entra en pantalla y se queda en el logo
  if (!still) document.querySelectorAll('video[data-play-on-view]').forEach(v =>
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { v.currentTime = 0; v.play().catch(() => {}); }
      else v.pause();
    }, { threshold: 0.45 }).observe(v));

  // en el inicio, las tarjetas de servicio llevan al formulario con el servicio ya elegido
  const pick = document.querySelector('#cotiza select[name=servicio]');
  if (pick) document.querySelectorAll('#servicios .card').forEach(c => {
    c.style.cursor = 'pointer';
    c.onclick = e => {
      if (e.target.closest('a')) return;               // el enlace "Ver servicio" va a su página
      pick.value = c.querySelector('h3').textContent;
      document.getElementById('cotiza').scrollIntoView();
    };
  });
}
