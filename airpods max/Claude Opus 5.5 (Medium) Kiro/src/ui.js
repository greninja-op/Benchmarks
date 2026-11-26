// DOM overlay: progress-synced panels, 3D-anchored leader lines, swatches, stage nav.
import * as THREE from 'three';
import { PALETTE } from './scene/materials.js';
import { STAGES } from './choreography.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const SVGNS = 'http://www.w3.org/2000/svg';

export function createUI({ anchors, onSwatch, onStage }) {
  // ---- panels
  const panels = [...document.querySelectorAll('.panel')].map((el) => {
    const [a, b] = el.dataset.range.split(',').map(Number);
    return { el, a, b };
  });

  // ---- callouts
  const svg = document.getElementById('leaders');
  const layer = document.getElementById('callouts');
  const defs = [
    { g: 'crown', i: 0, anchor: anchors.crown, dx: -0.28, dy: 0.2, title: 'Digital Crown', body: 'Turn for precise volume control. Press once to play or pause, twice to skip forward, three times to skip back. Press and hold for Siri.' },
    { g: 'crown', i: 1, anchor: anchors.button, dx: 0.26, dy: -0.24, title: 'Noise Control button', body: 'Press to switch between Active Noise Cancellation and Transparency mode.' },
    { g: 'explode', i: 0, anchor: anchors.shell, dx: 0.12, dy: -0.27, title: 'Anodized aluminum shell', body: 'Bead-blasted, single-piece ear cup with a knurled Digital Crown.' },
    { g: 'explode', i: 1, anchor: anchors.electronics, dx: 0.1, dy: 0.3, title: 'H1 chip + sensors', body: '10 audio cores. Optical and position sensors in each cup.' },
    { g: 'explode', i: 2, anchor: anchors.driver, dx: -0.06, dy: -0.31, title: '40 mm dynamic driver', body: 'Dual neodymium ring magnet motor. Under 1% total harmonic distortion.' },
    { g: 'explode', i: 3, anchor: anchors.baffle, dx: -0.1, dy: 0.3, title: 'Acoustic baffle', body: 'Perforated housing with a magnetic mounting ring.' },
    { g: 'explode', i: 4, anchor: anchors.cushion, dx: -0.14, dy: -0.26, title: 'Memory-foam cushion', body: 'Acoustically engineered knit. Magnetically attached.' },
  ];
  const callouts = defs.map((d) => {
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('pathLength', '1');
    path.classList.add('leader');
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', '4'); dot.classList.add('socket');
    const ring = document.createElementNS(SVGNS, 'circle');
    ring.setAttribute('r', '10'); ring.classList.add('socket-ring');
    svg.append(path, ring, dot);
    const card = document.createElement('div');
    card.className = 'callout';
    card.innerHTML = `<h4>${d.title}</h4><p>${d.body}</p>`;
    layer.append(card);
    return { ...d, path, dot, ring, card };
  });

  // ---- swatches
  const swWrap = document.getElementById('swatches');
  const swName = document.getElementById('swatch-name');
  const colorNames = document.querySelectorAll('[data-color-name]');
  const swatches = PALETTE.map((p, i) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.setProperty('--c', p.swatch);
    b.setAttribute('aria-label', p.name); b.title = p.name;
    b.addEventListener('click', () => onSwatch(i));
    swWrap.querySelector('.swatch-row').append(b);
    return b;
  });

  // ---- stage nav
  const nav = document.getElementById('stages');
  const dots = STAGES.map((s) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${s.label}</span>`;
    b.addEventListener('click', () => onStage(s.at));
    nav.append(b);
    return b;
  });

  const v3 = new THREE.Vector3();
  let lastColor = -1;
  return {
    update(time, S, camera, w, h, colorIndex) {
      for (const p of panels) {
        const fin = smooth((time - p.a) / 1.6), fout = smooth((p.b - time) / 1.6);
        const o = Math.min(fin, fout);
        p.el.style.opacity = o.toFixed(3);
        p.el.style.transform = `translate3d(0, ${((1 - fin) * 28 - (1 - fout) * 28).toFixed(1)}px, 0)`;
        p.el.style.visibility = o < 0.002 ? 'hidden' : 'visible';
        p.el.classList.toggle('on', o > 0.5);
      }
      const m = Math.min(w, h);
      for (const c of callouts) {
        const g = c.g === 'crown' ? S.callCrown : S.callExplode;
        const v = clamp01(g * 1.5 - c.i * 0.12);
        if (v <= 0.001) { c.card.style.opacity = 0; c.card.style.visibility = 'hidden'; c.path.style.opacity = 0; c.dot.style.opacity = 0; c.ring.style.opacity = 0; continue; }
        c.anchor.getWorldPosition(v3).project(camera);
        if (v3.z > 1) continue;
        const ax = (v3.x * 0.5 + 0.5) * w, ay = (-v3.y * 0.5 + 0.5) * h;
        const small = w < 700;
        let dx = c.dx * m * (small ? 0.7 : 1), dy = c.dy * m * (small ? 0.75 * (1 + 0.35 * (c.i >> 1)) : 1);
        let ex = ax + dx, ey = ay + dy;
        const cw = small ? 150 : 240;
        // keep cards inside the viewport
        ex = dx < 0 ? Math.max(cw + 16, ex) : Math.min(w - cw - 16, ex);
        ey = dy < 0 ? Math.min(h - 60, Math.max(190, ey)) : Math.min(h - 120, Math.max(90, ey));
        const elbowX = ax + Math.sign(ex - ax) * Math.min(Math.abs(ex - ax), Math.abs(ey - ay) * 0.55);
        const endX = ex + (dx < 0 ? -cw : cw);
        c.path.setAttribute('d', `M${ax.toFixed(1)},${ay.toFixed(1)} L${elbowX.toFixed(1)},${ey.toFixed(1)} L${endX.toFixed(1)},${ey.toFixed(1)}`);
        const lv = smooth(v);
        c.path.style.strokeDashoffset = (1 - lv).toFixed(3);
        c.path.style.opacity = 1;
        c.dot.setAttribute('cx', ax); c.dot.setAttribute('cy', ay); c.dot.style.opacity = lv;
        c.ring.setAttribute('cx', ax); c.ring.setAttribute('cy', ay); c.ring.style.opacity = lv * 0.6;
        const left = dx < 0 ? ex - cw : ex;
        c.card.style.visibility = 'visible';
        c.card.style.width = cw + 'px';
        c.card.style.opacity = smooth((v - 0.45) / 0.55).toFixed(3);
        c.card.style.transform = `translate3d(${left.toFixed(1)}px, ${(dy < 0 ? ey - 10 : ey + 10).toFixed(1)}px, 0) translateY(${dy < 0 ? '-100%' : '0'})`;
      }
      const ci = Math.round(colorIndex);
      if (ci !== lastColor) {
        lastColor = ci;
        swatches.forEach((b, i) => b.classList.toggle('active', i === ci));
        swName.textContent = PALETTE[ci].name;
        colorNames.forEach((n) => (n.textContent = PALETTE[ci].name));
      }
      swWrap.classList.toggle('hidden', time < 10 || (time > 71 && time < 89) || time > 92);
      let si = 0; [0, 12, 26, 44, 58, 72, 88].forEach((b, i) => { if (time >= b) si = i; });
      dots.forEach((d, i) => d.classList.toggle('active', i === si));
    },
  };
}
