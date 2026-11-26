import * as THREE from 'three';
import gsap from 'gsap';
import { STAGES, stageIndexOf } from '../scene/choreography.js';
import { FINISHES } from '../scene/materials.js';

const LIGHT_BG = new THREE.Color('#f5f5f7');
const DARK_BG = new THREE.Color('#0c0d10');
const LIGHT_INK = new THREE.Color('#1d1d1f');
const DARK_INK = new THREE.Color('#f5f5f7');
const NS = 'http://www.w3.org/2000/svg';
const tmp = new THREE.Vector3();

/** Chapter reveals, finish swatches, the theme switch, and leader lines projected from 3D anchors. */
export function createOverlay({ onSwatch, onReplay }) {
  const chapters = STAGES.map((s) => document.querySelector(`[data-stage="${s.id}"]`));
  const swatches = [...document.querySelectorAll('[data-swatch]')];
  swatches.forEach((el, i) => {
    el.style.setProperty('--swatch', FINISHES[i].cup);
    el.setAttribute('aria-label', FINISHES[i].name);
    el.addEventListener('click', () => onSwatch(i));
  });
  document.querySelector('[data-replay]')?.addEventListener('click', onReplay);

  const svg = document.getElementById('leaders');
  const callouts = {};
  const leaders = {};
  document.querySelectorAll('[data-callout]').forEach((el) => {
    const key = el.dataset.callout;
    callouts[key] = el;
    const g = document.createElementNS(NS, 'g');
    const path = document.createElementNS(NS, 'path');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '3.5');
    g.append(path, dot);
    svg.append(g);
    leaders[key] = { g, path, dot };
  });

  const bar = document.querySelector('.progress span');
  let activeStage = -1;
  let activeSwatch = -1;

  function setProgress(p) {
    bar.style.transform = `scaleY(${p.toFixed(4)})`;
    const idx = stageIndexOf(p);
    if (idx === activeStage) return;
    activeStage = idx;
    chapters.forEach((el, i) => {
      const on = i === idx;
      el.classList.toggle('is-active', on);
      if (on) {
        gsap.fromTo(
          el.querySelectorAll('[data-reveal]'),
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true },
        );
      }
    });
  }

  function setColor(colorT) {
    const idx = Math.round(colorT);
    if (idx === activeSwatch) return;
    activeSwatch = idx;
    swatches.forEach((el, i) => el.classList.toggle('is-selected', i === idx));
    document.querySelector('[data-swatch-name]').textContent = FINISHES[idx].name;
  }

  function setTheme(dark) {
    const bg = LIGHT_BG.clone().lerp(DARK_BG, dark);
    const ink = LIGHT_INK.clone().lerp(DARK_INK, dark);
    const style = document.documentElement.style;
    style.setProperty('--bg', `#${bg.getHexString()}`);
    style.setProperty('--fg', `#${ink.getHexString()}`);
    style.setProperty('--fg-muted', dark > 0.5 ? 'rgba(245,245,247,0.62)' : 'rgba(29,29,31,0.62)');
  }

  /** Projects each anchor to the screen and draws an elbow line from it to the callout card. */
  function updateLeaders(camera, anchors, s, w, h) {
    const items = [
      ['crown', anchors.crown, s.crownLeader],
      ['noise', anchors.noise, s.noiseLeader],
      ['shell', anchors.shell, s.layersLeader],
      ['electronics', anchors.electronics, s.layersLeader],
      ['driver', anchors.driver, s.layersLeader],
      ['cushion', anchors.cushion, s.layersLeader],
    ];
    for (const [key, anchor, alpha] of items) {
      const el = callouts[key];
      const L = leaders[key];
      if (!el || !L) continue;
      el.style.opacity = alpha.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - alpha) * 10).toFixed(1)}px, 0)`;
      L.g.style.opacity = alpha.toFixed(3);
      if (alpha < 0.01) continue;
      anchor.getWorldPosition(tmp).project(camera);
      const ax = (tmp.x * 0.5 + 0.5) * w;
      const ay = (-tmp.y * 0.5 + 0.5) * h;
      const r = el.getBoundingClientRect();
      const cy = r.top + r.height / 2;
      const cx = r.left + r.width / 2 < ax ? r.right : r.left;
      L.path.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)} V${cy.toFixed(1)} H${cx.toFixed(1)}`);
      L.dot.setAttribute('cx', ax.toFixed(1));
      L.dot.setAttribute('cy', ay.toFixed(1));
    }
  }

  return { setProgress, setColor, setTheme, updateLeaders };
}
