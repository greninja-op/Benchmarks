import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './style.css';
import { createMaterials, applyPalette } from './scene/materials.js';
import { buildAirPods, updateAirPods } from './scene/airpods.js';
import { buildCase, updateCase } from './scene/case.js';
import { createStudio } from './scene/studio.js';
import { S, buildTimeline, COLOR_TIMES } from './choreography.js';
import { createUI } from './ui.js';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);
const studio = createStudio(renderer, scene);

const M = createMaterials();
const rig = buildAirPods(M);
const smartCase = buildCase(M);
const stage = new THREE.Group();
stage.add(rig.headset, smartCase.group);
scene.add(stage);

// Ghostable parts (left cup, headband, arms) get their own material clones so
// the exploded right cup can be isolated without touching shared materials.
const ghostPairs = new Map();
rig.ghosts.forEach((root) => root.traverse((o) => {
  if (!o.isMesh) return;
  const swap = (m) => { if (!ghostPairs.has(m)) ghostPairs.set(m, m.clone()); return ghostPairs.get(m); };
  o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
}));
let ghostTransparent = false;
function applyGhost(g) {
  const op = 1 - g;
  const wantT = g > 0.001;
  for (const [orig, clone] of ghostPairs) {
    if (orig.color) clone.color.copy(orig.color);
    clone.opacity = op;
    if (wantT !== ghostTransparent) { clone.transparent = wantT; clone.depthWrite = !wantT || op > 0.6; clone.needsUpdate = true; }
  }
  ghostTransparent = wantT;
  rig.ghosts.forEach((r) => (r.visible = op > 0.02));
}

// ---- scroll: Lenis + ScrollTrigger driving one scrubbed timeline
const tl = buildTimeline();
const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.lagSmoothing(0);
const st = ScrollTrigger.create({ trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: 0.7, animation: tl });
const scrollToTime = (t) => lenis.scrollTo(st.start + (st.end - st.start) * (t / 100), { duration: 2.2 });

// ---- colors: scroll-driven, with a manual override from the swatches
let manualColor = null, shownColor = 0;
const ui = createUI({
  anchors: { ...rig.R.anchors },
  onSwatch: (i) => {
    if (tl.time() < 27) scrollToTime(COLOR_TIMES[i]);
    else manualColor = i;
  },
  onStage: (t) => scrollToTime(t),
});

// ---- pointer parallax
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

let W = 1, H = 1;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const bgLight = new THREE.Color('#f5f5f7'), bgDark = new THREE.Color('#060607'), bg = new THREE.Color();
const target = new THREE.Vector3();
let last = performance.now();

function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  lenis.raf(now);
  const time = tl.time();

  // color
  if (time < 26.5) manualColor = null;
  const want = manualColor ?? S.color;
  shownColor += (want - shownColor) * (1 - Math.exp(-dt * 7));
  if (Math.abs(want - shownColor) < 1e-3) shownColor = want;
  applyPalette(M, shownColor);

  // product rig
  rig.headset.position.y = S.rise;
  updateAirPods(rig, S, now / 1000);
  updateCase(smartCase, S);
  applyGhost(S.ghost);
  studio.update(S);

  // camera orbit + parallax + responsive framing
  const k = 1 - Math.exp(-dt * 3);
  pointer.sx += (pointer.x - pointer.sx) * k; pointer.sy += (pointer.y - pointer.sy) * k;
  const aspect = W / H;
  const fit = Math.pow(Math.max(1, 1.0 / aspect), 0.75);
  const az = S.az + pointer.sx * 0.06, el = S.el - pointer.sy * 0.04, d = S.dist * fit;
  target.set(S.tx, S.ty, S.tz);
  camera.position.set(
    target.x + d * Math.sin(az) * Math.cos(el),
    target.y + d * Math.sin(el),
    target.z + d * Math.cos(az) * Math.cos(el)
  );
  camera.lookAt(target);
  const portrait = aspect < 0.9;
  const sx = portrait ? 0 : S.shiftX, sy = portrait ? -0.06 : S.shiftY;
  camera.setViewOffset(W, H, sx * W, sy * H, W, H);

  // backdrop
  bg.copy(bgLight).lerp(bgDark, S.dark);
  document.body.style.backgroundColor = `#${bg.getHexString()}`;
  document.body.classList.toggle('dark', S.dark > 0.5);

  renderer.render(scene, camera);
  ui.update(time, S, camera, W, H, shownColor);
  requestAnimationFrame(frame);
}

// warm up shader programs before revealing
renderer.compile(scene, camera);
requestAnimationFrame(() => {
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
});
window.__S = S; window.__tl = tl; window.__lenis = lenis; window.__st = st;
