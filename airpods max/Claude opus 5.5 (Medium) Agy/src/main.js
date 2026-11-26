import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './style.css';
import { buildAirPodsMax } from './model.js';
import { buildStudioEnv } from './env.js';
import { Callouts } from './callouts.js';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Keyframe track with smootherstep easing; values are numbers or Vector3. */
function track(keys) {
  return (p) => {
    if (p <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [p0, v0] = keys[i], [p1, v1] = keys[i + 1];
      if (p <= p1) {
        const t = ease((p - p0) / (p1 - p0 || 1));
        return typeof v0 === 'number' ? v0 + (v1 - v0) * t : v0.clone().lerp(v1, t);
      }
    }
    return keys[keys.length - 1][1];
  };
}

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.environment = buildStudioEnv(renderer);
scene.environmentIntensity = 1.0;

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 300);

const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 90 });
key.shadow.bias = -0.0004;
key.shadow.radius = 5;
key.shadow.normalBias = 0.025;
key.shadow.radius = 6;
key.target.position.set(0, -3, 0);
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xe6eeff, 1.3);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8dc, 0.25));

const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.ShadowMaterial({ opacity: 0.1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -11.3;
ground.receiveShadow = true;
scene.add(ground);

const model = buildAirPodsMax();
scene.add(model.root);

// ---------------------------------------------------------------------------
// Colorways
// ---------------------------------------------------------------------------
const FINISHES = [
  { name: 'Silver', swatch: '#e3e4e6', alu: '#dcdde0', band: '#f2f2f0', knit: '#e5e5e3', case: '#e0e1e4' },
  { name: 'Space Gray', swatch: '#55565a', alu: '#5c5d61', band: '#2d2d2f', knit: '#3b3b3d', case: '#232325' },
  { name: 'Sky Blue', swatch: '#a6b9ca', alu: '#a3b7c9', band: '#2f4b68', knit: '#6d85a5', case: '#2c496a' },
  { name: 'Pink', swatch: '#f0d2ca', alu: '#edd0c8', band: '#eccac1', knit: '#f0d3cc', case: '#e7bdb3' },
  { name: 'Green', swatch: '#cad6c3', alu: '#c8d3c1', band: '#c4d1bc', knit: '#cad6c4', case: '#a8b8a1' },
];
const PAL = FINISHES.map((f) => ({ alu: new THREE.Color(f.alu), band: new THREE.Color(f.band), knit: new THREE.Color(f.knit), case: new THREE.Color(f.case) }));
const curColor = { alu: PAL[0].alu.clone(), band: PAL[0].band.clone(), knit: PAL[0].knit.clone(), case: PAL[0].case.clone() };
const tgtColor = { alu: new THREE.Color(), band: new THREE.Color(), knit: new THREE.Color(), case: new THREE.Color() };
let colorTarget = 0;
const COLOR_P0 = 0.13, COLOR_P1 = 0.25;
const colorFromScroll = (p) => {
  const t = clamp01((p - COLOR_P0) / (COLOR_P1 - COLOR_P0)) * 4;
  const i = Math.min(3, Math.floor(t));
  return Math.min(4, i + smooth(0.3, 0.7, t - i));
};

// ---------------------------------------------------------------------------
// Choreography tracks (scroll progress 0 → 1)
// ---------------------------------------------------------------------------
function liftAt(p) {
  const a = 0.6, b = 0.642, c = 0.668, d = 0.703;
  if (p <= a) return [0, 0];
  if (p < b) { const t = (p - a) / (b - a); return [t * t * (3 - 2 * t), 0]; }
  if (p < c) return [1, 0];
  if (p < d) { const t = (p - c) / (d - c); return [1 - t * t * t, 0]; } // magnetic pull accelerates
  const u = (p - d) / 0.012;
  if (u < 1) return [0.05 * Math.sin(Math.PI * u) * (1 - u), Math.sin(Math.PI * u)];
  return [0, 0];
}

const T = {
  rotY: track([[0, -0.55], [0.1, -0.38], [0.14, -0.3], [0.25, 0.32], [0.29, 0], [0.885, 0], [0.95, -0.2], [1, -0.16]]),
  ext: track([[0, 0], [0.43, 0], [0.48, 1], [0.715, 1], [0.75, 0], [1, 0]]),
  roll: track([[0, 0.11], [0.44, 0.11], [0.5, 0], [1, 0]]),
  yawL: track([[0, -0.3], [0.455, -0.3], [0.51, -Math.PI / 2], [1, -Math.PI / 2]]),
  yawR: track([[0, 0.3], [0.455, 0.3], [0.51, Math.PI / 2], [1, Math.PI / 2]]),
  explode: track([[0, 0], [0.745, 0], [0.795, 1], [0.835, 1], [0.875, 0], [1, 0]]),
  ghost: track([[0, 0], [0.75, 0], [0.79, 1], [0.84, 1], [0.872, 0], [1, 0]]),
  caseRise: track([[0, 0], [0.885, 0], [0.925, 1], [1, 1]]),
  drop: track([[0, 0], [0.885, 0], [0.92, 3.8], [0.927, 3.8], [0.958, 0], [1, 0]]),
  flap: track([[0, 0], [0.958, 0], [0.988, 1], [1, 1]]),
  sx: track([[0, 0], [0.1, 0], [0.14, 0.17], [0.25, 0.17], [0.3, 0.12], [0.42, 0.12], [0.465, -0.1], [0.57, -0.12], [0.605, 0.04], [0.71, 0.04], [0.76, 0.1], [0.86, 0.1], [0.9, 0], [1, 0]]),
  sy: track([[0, -0.1], [0.1, -0.1], [0.14, 0], [0.59, 0], [0.61, -0.07], [0.71, -0.07], [0.75, 0], [0.88, 0], [0.92, 0.02], [1, 0.02]]),
};

function poseAt(p) {
  const [lift, snap] = liftAt(p);
  return {
    rotX: 0, rotY: T.rotY(p), drop: T.drop(p), ext: T.ext(p), roll: T.roll(p),
    yawL: T.yawL(p), yawR: T.yawR(p), lift, snap,
    explode: T.explode(p), ghost: T.ghost(p), caseRise: T.caseRise(p), flap: T.flap(p),
    crown: p * 55,
  };
}

function measureAt(p, name) {
  model.setPose(poseAt(p));
  model.root.updateMatrixWorld(true);
  return model.anchors[name].getWorldPosition(new THREE.Vector3());
}

// Camera keyframes anchored to actual hardware sockets.
const crownP = measureAt(0.35, 'crown');
const btnP = measureAt(0.35, 'button');
const macroMid = crownP.clone().lerp(btnP, 0.45).add(V(0, -0.25, 0));
const canP = measureAt(0.48, 'canopy');
const lrP = measureAt(0.55, 'lr');
const detP = measureAt(0.62, 'lCenter').lerp(measureAt(0.62, 'rCenter'), 0.5).add(V(0, 0, 2.6));
const exP = measureAt(0.81, 'rCenter').lerp(measureAt(0.81, 'xCushion'), 0.5).add(V(0, 0.4, 0));
const finP = V(0, 1.6, 1.5);
const dirA = V(0.86, 0.44, 0.25).normalize(), dirB = V(0.82, 0.46, -0.34).normalize();

const camKeys = [
  [0, V(0, 2, 56), V(0, 0.2, 0)],
  [0.1, V(0, 1.5, 52), V(0, 0, 0)],
  [0.14, V(0, 2.5, 46), V(0, 0, 0)],
  [0.25, V(0, 2.5, 45), V(0, 0, 0)],
  [0.3, macroMid.clone().addScaledVector(dirA, 13), macroMid.clone()],
  [0.42, macroMid.clone().addScaledVector(dirB, 11.5), macroMid.clone()],
  [0.465, canP.clone().add(V(10, 7, 12.5)), canP.clone().add(V(1.5, -1, 0))],
  [0.5, canP.clone().add(V(-8, 5.5, 11)), canP.clone().add(V(-2, -1.2, 0))],
  [0.54, lrP.clone().add(V(2.4, 2.6, 17.5)), lrP.clone().add(V(0, -0.3, 1.0))],
  [0.575, lrP.clone().add(V(4.2, 1.4, 16)), lrP.clone().add(V(0.2, -0.3, 1.0))],
  [0.61, detP.clone().add(V(8, 5, 48)), detP.clone()],
  [0.71, detP.clone().add(V(-6, 4, 48)), detP.clone()],
  [0.765, exP.clone().add(V(32, 7, 15)), exP.clone()],
  [0.86, exP.clone().add(V(28, 11, 22)), exP.clone()],
  [0.905, finP.clone().add(V(0, 4, 64)), finP.clone()],
  [1, finP.clone().add(V(0, 3, 60)), finP.clone()],
];
const camPos = track(camKeys.map((k) => [k[0], k[1]]));
const camTgt = track(camKeys.map((k) => [k[0], k[2]]));

// ---------------------------------------------------------------------------
// UI: callouts, panels, swatches, rail
// ---------------------------------------------------------------------------
const CALLOUTS = [
  { anchor: 'crown', range: [0.305, 0.44], dx: 230, dy: 130, mdx: 40, mdy: 150, kicker: 'Control', title: 'Digital Crown', body: 'Turn for precise volume. Press to play, pause or answer calls — twice to skip forward, three times to skip back. Press and hold for Siri.' },
  { anchor: 'button', range: [0.315, 0.44], dx: 230, dy: -130, mdx: 40, mdy: -140, kicker: 'Control', title: 'Noise Control', body: 'One press switches between Active Noise Cancellation and Transparency mode.' },
  { anchor: 'canopy', range: [0.455, 0.505], dx: -220, dy: 120, mdx: -40, mdy: 160, kicker: 'Comfort', title: 'Knit-mesh canopy', body: 'A breathable, stretch-woven canopy spans the stainless steel frame to distribute weight and reduce on-head pressure.' },
  { anchor: 'lr', range: [0.53, 0.585], dx: -230, dy: 120, mdx: -40, mdy: 170, kicker: 'Acoustics', title: 'L / R acoustic mesh', body: 'A custom woven mesh marks each side and lets sound pass cleanly from driver to ear.' },
  { anchor: 'foam', range: [0.535, 0.585], dx: -220, dy: -150, mdx: -40, mdy: -160, kicker: 'Comfort', title: 'Acoustic memory foam', body: 'Knit-textile cushions gently seal around your ears for truly immersive sound.' },
  { anchor: 'magnet', range: [0.615, 0.7], dx: 170, dy: 120, mdx: 40, mdy: 130, kicker: 'Magnetic', title: 'Magnetic attachment', body: 'Cushions align and lock in place instantly — no clips, no tools.' },
  { anchor: 'grille', range: [0.62, 0.7], dx: -170, dy: 150, mdx: -40, mdy: 160, kicker: 'Acoustics', title: 'Perforated acoustic housing', body: 'Precision perforations tune airflow from the 40 mm driver for deep, accurate bass.' },
  { anchor: 'xShell', range: [0.77, 0.855], dx: 40, dy: -160, mdx: 30, mdy: -140, kicker: '01', title: 'Anodized aluminum shell', body: 'Bead-blasted, anodized enclosure with nine-microphone array.' },
  { anchor: 'xElec', range: [0.774, 0.855], dx: 35, dy: 185, mdx: 30, mdy: 155, kicker: '02', title: 'H1 chip & sensors', body: 'Ten audio cores per ear cup, plus optical, position and case-detect sensors.' },
  { anchor: 'xDriver', range: [0.778, 0.855], dx: -25, dy: -165, mdx: -30, mdy: -155, kicker: '03', title: '40 mm dynamic driver', body: 'Dual neodymium ring magnet motor — under 1% THD across the audible range.' },
  { anchor: 'xHousing', range: [0.782, 0.855], dx: -30, dy: 190, mdx: -30, mdy: 160, kicker: '04', title: 'Acoustic baffle', body: 'Perforated housing with magnetic seats for the cushion.' },
  { anchor: 'xCushion', range: [0.786, 0.855], dx: -40, dy: 150, mdx: -30, mdy: 145, kicker: '05', title: 'Memory foam cushion', body: 'Acoustically engineered memory foam wrapped in knit textile.' },
];
const callouts = new Callouts(document.getElementById('leaders'), document.getElementById('callouts'), CALLOUTS, model.anchors);

const panels = [...document.querySelectorAll('.panel')].map((el) => ({
  el, a: parseFloat(el.dataset.in), b: parseFloat(el.dataset.out), lines: el.querySelectorAll('.reveal > *'), active: false,
}));
panels.forEach((pn) => gsap.set(pn.lines, { yPercent: 110, opacity: 0 }));

const swatchWrap = document.querySelector('.swatches');
const colorName = document.querySelectorAll('[data-color-name]');
FINISHES.forEach((f, i) => {
  const b = document.createElement('button');
  b.className = 'swatch';
  b.style.setProperty('--c', f.swatch);
  b.setAttribute('aria-label', f.name);
  b.addEventListener('click', () => {
    if (progress.target >= 0.12 && progress.target <= 0.26) scrollToP(COLOR_P0 + (i / 4) * (COLOR_P1 - COLOR_P0));
    else colorTarget = i;
  });
  swatchWrap.querySelector('.swatches__row').appendChild(b);
});
const swatchButtons = [...swatchWrap.querySelectorAll('.swatch')];

const STAGES = [
  ['Design', 0.0], ['Color', 0.17], ['Controls', 0.36], ['Comfort', 0.49], ['Magnetic', 0.655], ['Engineering', 0.81], ['Smart Case', 0.999],
];
const STAGE_BOUNDS = [0, 0.12, 0.26, 0.44, 0.58, 0.72, 0.88, 1.01];
const rail = document.querySelector('.rail');
STAGES.forEach(([label, p]) => {
  const b = document.createElement('button');
  b.className = 'rail__dot';
  b.innerHTML = `<span>${label}</span>`;
  b.addEventListener('click', () => scrollToP(p));
  rail.appendChild(b);
});
const railDots = [...rail.querySelectorAll('.rail__dot')];
const stageLabel = document.querySelector('[data-stage-label]');
const progressBar = document.querySelector('.nav__progress i');
const labBackdrop = document.querySelector('.backdrop--lab');

// ---------------------------------------------------------------------------
// Scroll: Lenis smooth scroll + GSAP ScrollTrigger progress + rAF delta smoothing
// ---------------------------------------------------------------------------
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.lagSmoothing(0);

const progress = { target: 0, value: 0 };
ScrollTrigger.create({
  trigger: '#scroll', start: 'top top', end: 'bottom bottom',
  onUpdate: (self) => { progress.target = self.progress; },
});
function scrollToP(p) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  lenis.scrollTo(p * max, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
}
document.querySelectorAll('[data-goto]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); scrollToP(parseFloat(el.dataset.goto)); }));

// Debug / QA hook: jump instantly to a progress value.
const qs = new URLSearchParams(location.search);
window.__jump = (p) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  lenis.scrollTo(p * max, { immediate: true, force: true });
  window.scrollTo(0, p * max);
  ScrollTrigger.update();
  progress.target = p; progress.value = p;
};

// Mouse parallax
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
let W = 1, H = 1;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  document.getElementById('leaders').setAttribute('viewBox', `0 0 ${W} ${H}`);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------
const tmpPos = new THREE.Vector3(), tmpTgt = new THREE.Vector3();
let lastStage = -1, lastColorIdx = -1, elapsed = 0, firstFrame = true;

function frame(time, deltaMs) {
  const dt = Math.min(0.05, (deltaMs || 16.7) / 1000);
  elapsed += dt;
  lenis.raf(time * 1000);

  // critically-damped progress smoothing (frame-rate independent)
  progress.value += (progress.target - progress.value) * (1 - Math.exp(-dt * 9));
  if (Math.abs(progress.target - progress.value) < 1e-5) progress.value = progress.target;
  const p = progress.value;

  // pose
  const pose = poseAt(p);
  pose.rotY += Math.sin(elapsed * 0.35) * 0.07 * (1 - smooth(0.05, 0.11, p));
  model.setPose(pose);
  mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 4));
  mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 4));
  model.root.rotation.y += mouse.sx * 0.06;
  model.root.rotation.x += mouse.sy * 0.035;

  // colors
  if (p >= 0.12 && p <= 0.26) colorTarget = colorFromScroll(p);
  const i0 = Math.floor(colorTarget), i1 = Math.min(4, i0 + 1), cf = colorTarget - i0;
  const kc = 1 - Math.exp(-dt * 7);
  for (const k of ['alu', 'band', 'knit', 'case']) {
    tgtColor[k].copy(PAL[i0][k]).lerp(PAL[i1][k], cf);
    curColor[k].lerp(tgtColor[k], kc);
  }
  model.setColors(curColor);

  // camera (with portrait-aware dolly-out)
  const aspect = W / H;
  const kDist = aspect < 1 ? 1 + (1 - aspect) * 1.5 : 1;
  tmpTgt.copy(camTgt(p));
  tmpPos.copy(camPos(p)).sub(tmpTgt).multiplyScalar(kDist).add(tmpTgt);
  camera.position.copy(tmpPos);
  camera.lookAt(tmpTgt);
  const mobile = W < 760;
  const sx = mobile ? 0 : T.sx(p), sy = mobile ? T.sy(p) * 0.5 + 0.06 * smooth(0.12, 0.16, p) : T.sy(p);
  camera.setViewOffset(W, H, -sx * W, sy * H, W, H);

  // dynamic studio lighting: env + key/rim orbit so highlights glide across the aluminium
  const envRot = -0.6 + p * 3.4 + 1.6 * smooth(0.26, 0.44, p) + mouse.sx * 0.15;
  scene.environmentRotation.set(0, envRot, 0);
  const la = 0.7 + p * 2.6;
  key.position.set(Math.cos(la) * 16, 26, Math.sin(la) * 12 + 10);
  rim.position.set(-Math.cos(la) * 18, 9, -Math.sin(la) * 18 - 10);

  renderer.render(scene, camera);

  // overlays
  callouts.update(p, camera, W, H);
  for (const pn of panels) {
    const v = smooth(pn.a, pn.a + 0.015, p) * (1 - smooth(pn.b - 0.015, pn.b, p));
    pn.el.style.opacity = v;
    pn.el.style.visibility = v > 0.001 ? 'visible' : 'hidden';
    const act = v > 0.5;
    if (act !== pn.active) {
      pn.active = act;
      pn.el.classList.toggle('is-active', act);
      gsap.killTweensOf(pn.lines);
      if (act) gsap.to(pn.lines, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.07, ease: 'expo.out' });
      else gsap.to(pn.lines, { yPercent: 110, opacity: 0, duration: 0.45, stagger: 0.02, ease: 'power2.in' });
    }
  }
  const stage = STAGE_BOUNDS.findIndex((b, i) => p >= b && p < STAGE_BOUNDS[i + 1]);
  if (stage !== lastStage) {
    lastStage = stage;
    railDots.forEach((d, i) => d.classList.toggle('is-active', i === stage));
    if (stageLabel && STAGES[stage]) stageLabel.textContent = STAGES[stage][0];
  }
  progressBar.style.transform = `scaleX(${p})`;
  const ci = Math.round(colorTarget);
  if (ci !== lastColorIdx) {
    lastColorIdx = ci;
    swatchButtons.forEach((b, i) => b.classList.toggle('is-active', i === ci));
    colorName.forEach((el) => {
      gsap.fromTo(el, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
      el.textContent = FINISHES[ci].name;
    });
  }
  const swVis = (1 - smooth(0.09, 0.11, p)) * 0.85 + smooth(0.115, 0.13, p) * (1 - smooth(0.255, 0.27, p));
  swatchWrap.style.opacity = Math.min(1, swVis);
  swatchWrap.style.pointerEvents = swVis > 0.3 ? 'auto' : 'none';
  labBackdrop.style.opacity = smooth(0.73, 0.77, p) * (1 - smooth(0.86, 0.89, p));
  document.querySelector('.scroll-hint').style.opacity = 1 - smooth(0.0, 0.03, p);

  if (firstFrame) {
    firstFrame = false;
    const loader = document.querySelector('.loader');
    gsap.to(loader, { opacity: 0, duration: 0.9, delay: 0.15, ease: 'power2.out', onComplete: () => loader.remove() });
    gsap.from('.nav, .rail', { opacity: 0, y: -10, duration: 1.2, delay: 0.5, ease: 'expo.out' });
    gsap.from(canvas, { opacity: 0, scale: 1.04, duration: 1.8, delay: 0.1, ease: 'expo.out' });
  }
}
gsap.ticker.add(frame);

if (qs.has('p')) requestAnimationFrame(() => window.__jump(parseFloat(qs.get('p'))));
