/* AcidSquares del catálogo de reactbits, portado a WebGL2 puro.
   El shader es idéntico al original; lo que se quitó fue React, ogl y el
   pase de blur (RenderTarget), que con blur=0 nunca se ejecutaba.
   ponytail: sin blur post-proceso. Si se necesita, son dos framebuffers más. */

const P = {
  color1: '#160500', // fondo profundo
  color2: '#F04E19', // naranja de la marca
  color3: '#FFCFA8', // núcleo caliente
  speed: 0.45,
  waveDepth: 1.0,
  zoom: 1.35,
  density: 10.0,
  spread: 0.3,
  stepSize: 0.002,
  glow: 1.0,
  exposure: 3200,
  colorShift: 0.35,
  contrast: 1.05,
  brightness: 1.0,
  opacity: 0.72,
  steps: 32,
  mouseStrength: 0.12,
  mouseRadius: 0.35,
  grain: true,
  grainIntensity: 0.045
};

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uWaveDepth;
uniform float uZoom;
uniform float uDensity;
uniform float uSpread;
uniform float uStepSize;
uniform float uGlow;
uniform float uExposure;
uniform float uColorShift;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform float uSteps;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy;
  float zoom = max(uZoom, 0.05);
  float aspect = iResolution.x / iResolution.y;
  vec2 ndc = (2.0 * frag - iResolution.xy) / iResolution.y;
  vec2 dir = ndc * (0.5 / zoom);

  vec2 mouseNdc = vec2(uMouse.x * aspect, uMouse.y);
  float mr = max(uMouseRadius, 0.01);
  vec2 md = ndc - mouseNdc;
  float dent = exp(-dot(md, md) / (mr * mr)) * (3.0 * uMouseStrength * uMouseActive);

  float travel = sin(iTime * uSpeed) * uWaveDepth;
  float density = max(uDensity, 1.0);
  float spread = clamp(uSpread, 0.05, 0.6);
  float stepSize = max(uStepSize, 0.0005);
  float glowGain = max(uGlow, 0.0);

  vec3 tOffset = vec3(0.0, dent, travel);
  vec3 p = vec3(0.0);
  float s = 0.0;
  float glow = 0.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= uSteps) break;
    p += vec3(dir * s, s);
    vec3 q = p + tOffset;
    s += density - length(q.xz) + length(ceil(q).xy);
    s = stepSize + abs(s) * spread;
    glow += glowGain / s;
  }

  float e = glow / max(uExposure, 1.0);
  float shimmer = 0.5 + 0.5 * dot(cos(iTime * uColorShift + p), vec3(0.3333));
  float v = tanh(e * uBrightness * mix(0.7, 1.05, shimmer));
  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, 0.55, v));
  col = mix(col, uColor3, smoothstep(0.55, 1.0, v));
  col *= v;

  float a = clamp(v, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * a;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    a = clamp(a + gv, 0.0, 1.0);
  }
  fragColor = vec4(outRgb, a);
}`;

const hexToRgb = hex => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [1, 2, 3].map(i => parseInt(m[i], 16) / 255) : [1, 1, 1];
};

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

function acidSquares(host) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return; // sin WebGL2 el hero se queda con su fondo plano
  host.appendChild(canvas);

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray()); // triángulo generado con gl_VertexID, sin buffers

  const loc = {};
  const u = (name, ...v) => {
    const l = loc[name] ?? (loc[name] = gl.getUniformLocation(prog, name));
    if (l) [gl.uniform1f, gl.uniform2f, gl.uniform3f][v.length - 1].call(gl, l, ...v);
  };

  const small = matchMedia('(max-width: 780px)').matches;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  u('uSpeed', P.speed); u('uWaveDepth', P.waveDepth); u('uZoom', P.zoom);
  u('uDensity', P.density); u('uSpread', P.spread); u('uStepSize', P.stepSize);
  u('uGlow', P.glow); u('uExposure', P.exposure); u('uColorShift', P.colorShift);
  u('uContrast', P.contrast); u('uBrightness', P.brightness); u('uOpacity', P.opacity);
  u('uSteps', small ? 20 : P.steps);
  u('uMouseStrength', P.mouseStrength); u('uMouseRadius', P.mouseRadius);
  u('uGrain', P.grain ? 1 : 0); u('uGrainIntensity', P.grainIntensity);
  u('uColor1', ...hexToRgb(P.color1));
  u('uColor2', ...hexToRgb(P.color2));
  u('uColor3', ...hexToRgb(P.color3));

  const draw = t => {
    u('iTime', t);
    u('uMouse', cur[0], cur[1]);
    u('uMouseActive', active);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, small ? 1 : 1.5);
    const w = Math.max(1, Math.round(host.clientWidth * dpr));
    const h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    u('iResolution', w, h);
    draw(time);
  };

  const target = [0, 0], cur = [0, 0];
  let active = 0, activeTarget = 0, time = 0, raf = 0;

  new ResizeObserver(resize).observe(host);
  resize();

  if (still) { draw(0); return; }

  const hero = host.closest('section') || host;
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    target[0] = ((e.clientX - r.left) / r.width - 0.5) * 2;
    target[1] = -((e.clientY - r.top) / r.height - 0.5) * 2;
    activeTarget = 1;
  });
  hero.addEventListener('mouseleave', () => { activeTarget = 0; });

  const t0 = performance.now();
  const loop = now => {
    time = (now - t0) * 0.001;
    cur[0] += 0.05 * (target[0] - cur[0]);
    cur[1] += 0.05 * (target[1] - cur[1]);
    active += 0.05 * (activeTarget - active);
    draw(time);
    raf = requestAnimationFrame(loop);
  };

  // no gastar GPU con el hero fuera de pantalla o la pestaña en segundo plano
  let onScreen = true, onTab = !document.hidden;
  const start = () => { if (onScreen && onTab && !raf) raf = requestAnimationFrame(loop); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? start() : stop(); }).observe(host);
  document.addEventListener('visibilitychange', () => { onTab = !document.hidden; onTab ? start() : stop(); });
  start();
}

const host = document.getElementById('acid');
if (host) acidSquares(host);
