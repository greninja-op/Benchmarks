import * as THREE from 'three'
import { track, window01 } from './store.js'

/* ------------------------------------------------------------------ */
/*  Scroll choreography — 7 stages, piecewise-cubic scalar tracks.     */
/*  Camera segments can be solved against live anchor world-positions  */
/*  (or the model origin) so macro shots stay locked on hardware.      */
/* ------------------------------------------------------------------ */

export const STAGES = [0, 0.12, 0.26, 0.44, 0.58, 0.72, 0.88, 1]

const yawT = track([
  [0, -0.38], [0.12, -0.49], [0.19, 2.8], [0.26, 5.79],
  [0.30, 5.93], [0.365, 5.98], [0.40, 6.6], [0.44, 7.23],
  [0.50, 6.88], [0.535, 4.6], [0.555, 4.14], [0.60, 5.98],
  [0.72, 5.92], [0.75, 5.36], [0.88, 5.36], [0.94, 6.283], [1, 6.283],
])

const fovT = track([
  [0, 30], [0.115, 27.5], [0.13, 33.5], [0.26, 33.5], [0.30, 30.5],
  [0.33, 29], [0.365, 29.5], [0.44, 30], [0.51, 33], [0.55, 28],
  [0.585, 27.5], [0.62, 32], [0.72, 33], [0.78, 30], [0.88, 30], [1, 31],
])

const foldT = track([[0, 0], [0.885, 0], [0.935, 1]])
const caseRiseT = track([[0, 0], [0.865, 0], [0.925, 1]])
const nestT = track([[0, 0], [0.90, 0], [0.955, 1]])
const explodeT = track([[0, 0], [0.75, 0], [0.815, 1], [0.845, 1], [0.882, 0]])
const mxT = track([[0, 0], [0.72, 0], [0.755, 2.2], [0.855, 2.2], [0.882, 0]])
const flapT = track([
  [0, 0], [0.893, 0], [0.908, 1], [0.952, 1],
  [0.978, -0.12], [0.986, 0.05], [0.994, 0],
])
const detachT = track([
  [0, 0], [0.595, 0], [0.652, 1], [0.664, 1.04], [0.686, 1],
  [0.712, -0.05], [0.718, 0],
])
const detachRT = track([
  [0, 0], [0.600, 0], [0.658, 1], [0.670, 1.04], [0.692, 1],
  [0.718, -0.05], [0.724, 0],
])

const crownSpinT = (p) => p * 10 + THREE.MathUtils.smoothstep(p, 0.295, 0.365) * 2.6

export function evalChoreo(p) {
  return {
    yaw: yawT(p),
    fold: foldT(p),
    detachL: detachT(p),
    detachR: detachRT(p),
    explode: explodeT(p),
    caseRise: caseRiseT(p),
    nest: nestT(p),
    flap: flapT(p),
    mx: mxT(p),
    crownSpin: crownSpinT(p),
    // HUD windows
    swatchVis: window01(p, 0.095, 0.305, 0.05),
    leaderCrown: window01(p, 0.278, 0.372, 0.035),
    leaderButton: window01(p, 0.378, 0.44, 0.028),
    leaderExplode: window01(p, 0.755, 0.878, 0.035),
    colorAuto: p >= 0.118 && p <= 0.272,
    stage: p < 0.12 ? 0 : p < 0.26 ? 1 : p < 0.44 ? 2 : p < 0.58 ? 3 : p < 0.72 ? 4 : p < 0.88 ? 5 : 6,
  }
}

/* ------------------------- camera segments ------------------------- */
/* Each segment: [p0, p1, posA, posB, tgtA, tgtB, fov0, fov1]           */
/* Point entries:                                                      */
/*   [x, y, z]                     — world space                        */
/*   ['anchor', name, [dx,dy,dz]]  — offset from a live anchor          */
/*   ['model', [dx,dy,dz]]         — offset from model origin           */
const SEGS = [
  // Stage 1 — hero entrance (16-unit-tall subject needs fov 32 @ z≈30)
  [0, 0.12, [0.5, 1.2, 30.5], [1.7, 1.25, 29.2], [0, 1.2, 0], [0.2, 1.25, 0], 32, 32],
  // Stage 2 — colorway turntable
  [0.12, 0.26, [1.7, 1.25, 29.2], [-2.4, 0.8, 28.6], [0.2, 1.25, 0], [0, 1.0, 0], 32, 34],
  // Stage 3a — Digital Crown macro (anchor-tracked)
  [0.26, 0.30, ['anchor:crown', 1.75, 1.6, 8.2], ['anchor:crown', 1.45, 1.4, 6.6], ['anchor:crown', 0, 0.15, 0], ['anchor:crown', 0, 0.15, 0], 34, 30.5],
  [0.30, 0.365, ['anchor:crown', 1.45, 1.4, 6.6], ['anchor:crown', 1.05, 1.2, 4.9], ['anchor:crown', 0, 0.15, 0], ['anchor:crown', 0, 0.12, 0], 30.5, 29.5],
  // Stage 3b — noise control button macro (arcs over the top)
  [0.365, 0.412, ['anchor:button', 1.05, 1.2, 4.9], ['anchor:button', 1.1, 2.7, 10.8], ['anchor:button', 0, 0.12, 0], ['anchor:button', 0, 0.1, 0], 29.5, 31.5],
  [0.412, 0.44, ['anchor:button', 1.1, 2.7, 10.8], ['anchor:button', 1.15, 0.85, 4.7], ['anchor:button', 0, 0.1, 0], ['anchor:button', 0, 0.1, 0], 31.5, 30],
  // Stage 4a — canopy glide
  [0.44, 0.475, ['anchor:button', 1.15, 0.85, 4.7], [-3.4, 8.4, 13.0], ['anchor:button', 0, 0.1, 0], [0, 6.2, 0], 30, 33],
  [0.475, 0.51, [-3.4, 8.4, 13.0], [-1.2, 7.9, 11.6], [0, 6.2, 0], [0, 6.6, 0], 33, 33],
  // Stage 4b — cushion weave macro (anchor-tracked)
  [0.51, 0.545, [-1.2, 7.9, 11.6], ['anchor:cushionL', 3.1, 1.0, 6.4], [0, 6.6, 0], ['anchor:cushionL', 0, 0, 0], 33, 29.5],
  [0.545, 0.585, ['anchor:cushionL', 3.1, 1.0, 6.4], ['anchor:cushionL', 1.5, 0.25, 3.8], ['anchor:cushionL', 0, 0, 0], ['anchor:cushionL', 0, 0, 0], 29.5, 27.5],
  // Stage 5 — magnetic detach & snap back
  [0.585, 0.62, ['anchor:cushionL', 1.5, 0.25, 3.8], [-4.2, 0.8, 17.5], ['anchor:cushionL', 0, 0, 0], [0, -1.3, 0], 27.5, 32],
  [0.62, 0.72, [-4.2, 0.8, 17.5], [0.6, 1.1, 18.5], [0, -1.3, 0], [0.35, -0.95, 0], 32, 32.5],
  // Stage 6 — exploded view (targets ride the shifted model; train spans ~10 units left of center)
  [0.72, 0.755, [0.6, 1.1, 18.5], ['model', -1.2, 2.6, 21.5], [0.35, -0.95, 0], ['model', -2.6, 1.75, 0], 32.5, 29],
  [0.755, 0.88, ['model', -1.2, 2.6, 21.5], ['model', 0.9, 3.0, 20.0], ['model', -2.6, 1.75, 0], ['model', -2.4, 1.8, 0], 29, 29],
  // Stage 7 — Smart Case finale
  [0.88, 0.925, ['model', 0.9, 3.0, 20.0], [0.0, 2.6, 33.5], ['model', -2.4, 1.8, 0], [0, 1.35, 0], 29, 33],
  [0.925, 1.0, [0.0, 2.6, 33.5], [1.7, 4.4, 32.4], [0, 1.35, 0], [0.4, 1.6, 0], 33, 33],
]

const ss = (t) => t * t * (3 - 2 * t)
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()

/** Solve the desired camera pose at scroll position p (mutates outPos/outTgt). */
export function resolveCamera(p, modelPos, anchorPos, outPos, outTgt, out) {
  let seg = SEGS[0]
  for (const s of SEGS) { if (p >= s[0] && p <= s[1]) { seg = s; break } }
  const t = ss(THREE.MathUtils.clamp((p - seg[0]) / Math.max(1e-5, seg[1] - seg[0]), 0, 1))

  const solve = (entry, outV3) => {
    if (Array.isArray(entry)) {
      const tag = entry[0]
      if (typeof tag === 'string' && tag.startsWith('anchor:')) {
        const ap = anchorPos.get(tag.slice(7))
        if (ap) outV3.set(ap.x + entry[1], ap.y + entry[2], ap.z + entry[3])
        else outV3.set(entry[1], entry[2], entry[3])
      } else if (tag === 'model') {
        outV3.set(modelPos.x + entry[1], modelPos.y + entry[2], modelPos.z + entry[3])
      } else {
        outV3.set(entry[0], entry[1], entry[2])
      }
    } else {
      outV3.set(entry[0], entry[1], entry[2])
    }
    return outV3
  }

  const a0 = seg[2], a1 = seg[3], b0 = seg[4], b1 = seg[5]
  solve(a0, _a)
  solve(a1, _b)
  outPos.copy(_a).lerp(_b, t)
  solve(b0, _a)
  solve(b1, _b)
  outTgt.copy(_a).lerp(_b, t)
  out.fov = seg[6] + (seg[7] - seg[6]) * t
  return out
}
