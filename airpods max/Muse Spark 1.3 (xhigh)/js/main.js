/**
 * main.js — boots the AirPods Max interactive showcase.
 * Wires textures → headphones model → studio scene → choreography.
 * Includes a small adapter so the model's native API satisfies every
 * method the choreography expects (colorways, anchors, crown, case fit).
 */
import * as THREE from 'three';
import { createTextures } from './textures.js';
import { createScene } from './scene.js';
import { buildAirPodsMax } from './headphones.js';
import { createChoreography } from './choreography.js';

const container = document.getElementById('scene');

let bundle;
try {
  const textures = createTextures(THREE);
  bundle = createScene(THREE, null, container);
  const { scene, camera, renderer } = bundle;

  const model = buildAirPodsMax(THREE, textures);
  const group = model.group;
  group.position.y = 0.15;
  scene.add(group);

  /* ------------------------------------------------------------------ *
   * Adapter — normalize model API for choreography.js                  *
   * ------------------------------------------------------------------ */

  // Extra anchors the model doesn't expose natively.
  function extraAnchor(parent, x, y, z) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent?.add(o);
    return o;
  }
  const canopyAnchor = extraAnchor(model.parts.canopy, 0, 0.15, 0);
  const h1Anchor = extraAnchor(model.parts.h1Board, 0, 0.1, 0);
  const shellAnchor = extraAnchor(model.parts.shellR, 0.3, 0.3, 0);
  const cushionAnchor = model.anchors.cushionAnchorR ?? extraAnchor(model.parts.rightCushion, 0, 0, 0);

  const anchors = {
    crown: model.anchors.crownAnchor,
    noise: model.anchors.noiseAnchor,
    canopy: canopyAnchor,
    cushion: cushionAnchor,
    driver: model.anchors.driverAnchor,
    h1: h1Anchor,
    shell: shellAnchor,
  };

  // Smooth colour morphing: chase per-frame toward the requested target.
  const COLOR_TARGETS = {
    silver:    { aluminum: '#e8e8ea', knit: '#f0f0f2', canopy: '#f0f0f2', case: '#d8d8de' },
    'space-gray': { aluminum: '#3a3d40', knit: '#2a2c2e', canopy: '#2a2c2e', case: '#232527' },
    'sky-blue': { aluminum: '#a7c1d9', knit: '#7fa8c9', canopy: '#7fa8c9', case: '#7fa8c9' },
    pink:      { aluminum: '#f4c2c2', knit: '#e8a0bf', canopy: '#e8a0bf', case: '#e8a0bf' },
    green:     { aluminum: '#b5d3b5', knit: '#6ba57a', canopy: '#5f9470', case: '#5f9470' },
  };
  let colorTarget = null;
  let colorPending = false;
  const tmp = {};
  for (const k of Object.keys(COLOR_TARGETS)) {
    tmp[k] = {
      aluminum: new THREE.Color(COLOR_TARGETS[k].aluminum),
      knit: new THREE.Color(COLOR_TARGETS[k].knit),
      canopy: new THREE.Color(COLOR_TARGETS[k].canopy),
      case: new THREE.Color(COLOR_TARGETS[k].case),
    };
  }

  const adaptedModel = {
    group, parts: model.parts, materials: model.materials, anchors,
    setColorway(id, cw) {
      const key = typeof id === 'string' ? id : (cw?.id ?? 'silver');
      colorTarget = tmp[key] ?? tmp.silver;
      colorPending = true;
    },
    setCushionDetach: (t) => model.setCushionDetach(t),
    setExploded: (t) => model.setExploded(t),
    setCaseFlap: (t) => model.setCaseFlap(t),
    setCupSwivel: (t) => model.setCupSwivel(t),
    setCrownRotation(a) {
      if (model.parts.crown) model.parts.crown.rotation.y = a;
    },
    setCaseFit(t) {
      // Headphones sink into the case as the flap closes.
      group.position.y = 0.15 - 0.55 * Math.min(1, Math.max(0, t));
    },
    getAnchor(id) { return anchors[id] ?? null; },
  };

  // Apply initial colourway.
  adaptedModel.setColorway('silver');

  const choreography = createChoreography({ model: adaptedModel, camera, scene, renderer });

  // Per-frame extras: dust drift + smooth colour chase + light sweep.
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (bundle.updateDust) bundle.updateDust(t);
    if (bundle.updateLights) bundle.updateLights(t, choreography.getProgress());
    if (colorPending && colorTarget) {
      const mats = model.materials;
      const chased = {
        aluminum: mats.aluminum.color.clone().lerp(colorTarget.aluminum, 0.08),
        knit: mats.knit.color.clone().lerp(colorTarget.knit, 0.08),
        canopy: mats.canopy.color.clone().lerp(colorTarget.canopy, 0.08),
        case: mats.case.color.clone().lerp(colorTarget.case, 0.08),
      };
      model.setColorway(chased);
      if (mats.aluminum.color.distanceTo(colorTarget.aluminum) < 0.01) colorPending = false;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
} catch (err) {
  console.error('[AirPods Max] failed to initialise:', err);
  const fallback = document.createElement('div');
  fallback.className = 'fallback';
  fallback.textContent = 'Please use a modern browser with WebGL2 to view this showcase.';
  document.body.appendChild(fallback);
}
