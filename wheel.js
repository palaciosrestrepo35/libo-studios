/* OptionWheel (reactbits) en cualquier página: cada caja con data-wheel trae sus
   opciones como JSON [[nombre, frase, enlace opcional], ...] y debajo muestra la frase
   de la opción elegida. Gira sola mientras se ve y se detiene cuando alguien la usa. */
{
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

document.querySelectorAll('[data-wheel]').forEach(box => {
  const items = JSON.parse(box.dataset.wheel);
  const caption = box.querySelector('.ow-caption');
  const wheel = optionWheel(box.querySelector('.ow'), items.map(w => w[0]), {
    start: +(box.dataset.wheelStart || 0),
    smoothing: calm ? 1 : 220,
    onChange: i => {
      const [name, text, href] = items[i];
      const b = document.createElement('b'), s = document.createElement('span');
      b.textContent = name;
      s.textContent = text;
      caption.replaceChildren(b, s);
      if (href) {
        const a = document.createElement('a');
        a.className = 'link';
        a.href = href;
        a.textContent = 'Ver más →';
        caption.append(' ', a);
      }
    }
  });
  if (calm) return;
  let visible = false, paused = false, touched = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 }).observe(box);
  ['pointerenter', 'focusin'].forEach(t => box.addEventListener(t, () => (paused = true)));
  ['pointerleave', 'focusout'].forEach(t => box.addEventListener(t, () => (paused = false)));
  // en celular no hay hover: después de tocar una opción, se deja leer 8 s
  ['pointerdown', 'keydown'].forEach(t => box.addEventListener(t, () => (touched = Date.now())));
  setInterval(() => {
    if (visible && !paused && !wheel.busy() && !document.hidden && Date.now() - touched > 8000) wheel.next();
  }, 2600);
});
}
