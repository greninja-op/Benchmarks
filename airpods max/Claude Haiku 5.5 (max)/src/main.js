import './styles/base.css';
import '@fontsource-variable/inter';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createTextures } from './scene/textures.js';
import { createStudioEnvironment, createStudioLights, animateLights } from './scene/studio.js';
import { createMaterials, createPalette, setColorway, applyPalette } from './scene/materials.js';
import { buildAirPods } from './scene/airpods.js';
import { buildSmartCase } from './scene/smartcase.js';
import { evaluate } from './scene/choreography.js';
import { createOverlay } from './ui/overlay.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = window.matchMedia('(max-width: 720px)').matches;

// Renderer, camera and studio lighting
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 0.5, 600);
scene.environment = createStudioEnvironment(renderer);
scene.environmentIntensity = 0.9;
const lights = createStudioLights(scene, isSmall ? 1024 : 2048);

// Materials and models
const T = createTextures(renderer);
const M = createMaterials(T);
const palette = createPalette();
setColorway(palette, 0);
applyPalette(M, palette);

const ap = buildAirPods(M);
const product = ap.root;
scene.add(product);
const smartCase = buildSmartCase(M);
smartCase.root.position.y = -30;
scene.add(smartCase.root);

// depthWrite off, so the shadow plane never hides the case when it sits below it
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.ShadowMaterial({ opacity: 0.08, depthWrite: false }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -5.6;
ground.receiveShadow = true;
scene.add(ground);

// Soft contact shadows under each cup. They fade out with the case and the dark theme.
const contactBlobs = [];
for (const x of [-5, 5]) {
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 13),
    new THREE.MeshBasicMaterial({ map: T.contact, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(x, -5.55, 0);
  scene.add(blob);
  contactBlobs.push(blob);
}

// Scroll: Lenis smooths the wheel, ScrollTrigger turns the page into progress 0..1
const lenis = reduceMotion ? null : new Lenis({ duration: 1.2, smoothWheel: true, touchMultiplier: 1.4 });
if (lenis) lenis.on('scroll', ScrollTrigger.update);
let pTarget = 0;
ScrollTrigger.create({
  trigger: '#scroll',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    pTarget = self.progress;
  },
});

function scrollToProgress(p) {
  const y = p * (document.documentElement.scrollHeight - window.innerHeight);
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: 'smooth' });
}

const overlay = createOverlay({
  // Each swatch sits at the progress value where colorT equals its index
  onSwatch: (i) => scrollToProgress(0.12 + (0.14 * i) / 4),
  onReplay: () => scrollToProgress(0),
});

const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Per-frame state. Camera and pose are damped so scrubbing stays smooth.
const focusW = new THREE.Vector3();
const dirV = new THREE.Vector3();
const desired = new THREE.Vector3();
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let primed = false;
let pSmooth = 0;
let lastMs = performance.now();

function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastMs) / 1000);
  lastMs = nowMs;
  pSmooth += (pTarget - pSmooth) * (1 - Math.exp(-dt * 6));
  const s = evaluate(pSmooth);

  setColorway(palette, s.colorT);
  applyPalette(M, palette);

  product.rotation.y = s.yaw;
  product.position.y = -2.6 * s.headDrop;
  ap.apply({ detach: s.detach, explode: s.explode, swivel: s.swivel, crownAngle: s.crownAngle });
  smartCase.root.position.y = -30 + 28 * s.caseRise;
  smartCase.hinge.rotation.x = -2.2 * s.lidOpen;
  ground.material.opacity = 0.08 * (1 - s.caseRise) * (1 - s.dark);
  for (const blob of contactBlobs) blob.material.opacity = 0.3 * (1 - s.caseRise) * (1 - s.dark);
  product.updateMatrixWorld(true);
  smartCase.root.updateMatrixWorld(true);

  focusW.set(s.focus[0], s.focus[1], s.focus[2]);
  product.localToWorld(focusW);
  dirV.set(s.dir[0], s.dir[1], s.dir[2]).normalize();
  const fit = Math.max(1, 0.9 / camera.aspect); // portrait screens pull the camera back
  desired.copy(focusW).addScaledVector(dirV, s.dist * fit);
  pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 4));
  pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 4));
  desired.x += pointer.sx * 0.6;
  desired.y -= pointer.sy * 0.4;
  if (!primed) {
    camPos.copy(desired);
    camLook.copy(focusW);
    primed = true;
  }
  const k = 1 - Math.exp(-dt * 6);
  camPos.lerp(desired, k);
  camLook.lerp(focusW, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  camera.updateMatrixWorld();

  animateLights(lights, pSmooth, nowMs / 1000);
  overlay.setProgress(pTarget);
  overlay.setColor(s.colorT);
  overlay.setTheme(s.dark);
  overlay.updateLeaders(camera, ap.anchors, s, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}

ScrollTrigger.refresh();
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time) => {
  if (lenis) lenis.raf(time * 1000);
  frame(performance.now());
  if (!window.__showcaseReady) {
    window.__showcaseReady = true;
    document.getElementById('loader')?.classList.add('is-hidden');
  }
});
