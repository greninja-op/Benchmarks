import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/*  Shared, mutable render-state store. Written by listeners / rAF,    */
/*  read inside useFrame and HUD rAF loops. Never triggers React.      */
/* ------------------------------------------------------------------ */
export const APP = {
  raw: 0,          // raw scroll progress 0..1
  progress: 0,     // damped progress used by all 3D tracks
  scrollVelocity: 0,
  aspect: 1,
  colorOverride: null,   // null | 0..4 (set by swatch clicks)
  autoIdx: 0,            // last auto-selected colorway
  finishIdx: 0,
  finishName: 'Silver',
  choreo: null,          // last evalChoreo() snapshot (HUD reads)
  mouse: { tx: 0, ty: 0 },     // raw pointer target (-1..1)
  anchorWorld: new Map(),      // name -> THREE.Vector3 (scene side)
  anchorXY: new Map(),         // name -> {x,y,behind} (HUD side)
}

/* --------------------------- Colorways ---------------------------- */
// Tuned against official product photography (silver/2120* & sky-blue 208).
export const COLORWAYS = [
  {
    name: 'Silver',
    alu: '#e7e9ec', soft: '#eceef1', canopy: '#f1f2f4', cushion: '#f3f3f5',
    mesh: '#d7dade', plate: '#25272b', case: '#e8eaeb', trim: '#c9ccd1',
  },
  {
    name: 'Space Gray',
    alu: '#54565b', soft: '#3a3c40', canopy: '#484a4f', cushion: '#45474c',
    mesh: '#3a3d42', plate: '#1e2025', case: '#45474c', trim: '#7d8086',
  },
  {
    name: 'Sky Blue',
    alu: '#b6c6d2', soft: '#1f4260', canopy: '#2f5d84', cushion: '#285074',
    mesh: '#1d3c57', plate: '#1a2733', case: '#2e5671', trim: '#c6d3dc',
  },
  {
    name: 'Pink',
    alu: '#d6c3c1', soft: '#ead4d2', canopy: '#e6cecd', cushion: '#ead5d4',
    mesh: '#d6bcb9', plate: '#2b2122', case: '#ecdad8', trim: '#d5bbb8',
  },
  {
    name: 'Green',
    alu: '#bcc7b6', soft: '#dde4d5', canopy: '#d2dbc6', cushion: '#dde4d7',
    mesh: '#c4cfbd', plate: '#232b22', case: '#dee4d7', trim: '#b7c2ab',
  },
]

const _cA = new THREE.Color()
const _cB = new THREE.Color()

/** Color lerp helper: result stored into `out`. */
export function lerpColor(out, hexA, hexB, t) {
  _cA.set(hexA); _cB.set(hexB)
  return out.copy(_cA).lerp(_cB, t)
}

/* ---------------------- Track interpolation ----------------------- */
const easeInOut = (t) => t * t * (3 - 2 * t)

/**
 * Scalar track from keyframes [[p, value], ...] (p ascending).
 * Smoothstep-cubic interpolation between keys; clamps at ends.
 */
export function track(keys, easing = easeInOut) {
  return (p) => {
    if (p <= keys[0][0]) return keys[0][1]
    const last = keys[keys.length - 1]
    if (p >= last[0]) return last[1]
    for (let i = 0; i < keys.length - 1; i++) {
      const [p0, v0] = keys[i]
      const [p1, v1] = keys[i + 1]
      if (p >= p0 && p <= p1) {
        const t = (p - p0) / Math.max(1e-5, p1 - p0)
        return v0 + (v1 - v0) * easing(t)
      }
    }
    return last[1]
  }
}

/** Linear (no easing) track. */
export function linearTrack(keys) {
  return track(keys, (t) => t)
}

/** 0..1 window mask with smooth lead-in / lead-out. */
export function window01(p, p0, p1, fade = 0.035) {
  const a = THREE.MathUtils.smoothstep(p, p0, p0 + fade)
  const b = 1 - THREE.MathUtils.smoothstep(p, p1 - fade, p1)
  return a * b
}
