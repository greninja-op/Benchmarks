// Shared mutable state — written by the 3D scene every frame, read by the
// DOM overlay (leader lines / HUD) without triggering React re-renders.

export const COLORWAYS = [
  {
    name: 'Silver',
    alu: '#dfe1e4', canopy: '#f0f0ee', cushion: '#e9e9e7', inner: '#d8d8d6',
    case: '#ececea', accent: '#8e8e93', swatch: 'linear-gradient(135deg,#f4f4f6,#c9ccd1)',
  },
  {
    name: 'Space Gray',
    alu: '#53555a', canopy: '#26272b', cushion: '#333438', inner: '#232427',
    case: '#2b2c30', accent: '#aeaeb2', swatch: 'linear-gradient(135deg,#6b6d73,#26272b)',
  },
  {
    name: 'Sky Blue',
    alu: '#b4cde2', canopy: '#2e4a66', cushion: '#8db1cc', inner: '#5d84a6',
    case: '#2e4a66', accent: '#c7dcee', swatch: 'linear-gradient(135deg,#bcd4e8,#2e4a66)',
  },
  {
    name: 'Pink',
    alu: '#e3a7ad', canopy: '#c96f74', cushion: '#eec3c6', inner: '#d99aa0',
    case: '#d98d93', accent: '#ffe3e5', swatch: 'linear-gradient(135deg,#f6ccd0,#c96f74)',
  },
  {
    name: 'Green',
    alu: '#aec6b2', canopy: '#5f7d68', cushion: '#c3d6c6', inner: '#9db8a4',
    case: '#6d8a76', accent: '#e2f0e4', swatch: 'linear-gradient(135deg,#cfe3d2,#5f7d68)',
  },
]

export const scrollState = {
  progress: 0,          // smoothed 0..1 (damped in render loop)
  rawProgress: 0,       // immediate scroll 0..1
  velocity: 0,
  mouseX: 0,
  mouseY: 0,
  manualColor: -1,      // -1 = follow scroll auto-cycle in Stage 2
  manualStamp: 0,       // performance.now() of last swatch click
  activeColorName: 'Sky Blue',
}

// Live Object3D refs registered by the model (filled at mount).
export const anchorObjects = {}

// Screen-space anchor points projected from 3D sockets each frame.
// sx/sy are CSS pixels relative to the viewport; behind = off/behind camera.
export const anchors = {
  crown:      { sx: 0, sy: 0, behind: true, label: 'Digital Crown' },
  noise:      { sx: 0, sy: 0, behind: true, label: 'Noise Control' },
  canopy:     { sx: 0, sy: 0, behind: true, label: 'Knit-mesh canopy' },
  cushionR:   { sx: 0, sy: 0, behind: true, label: 'Ear cushion' },
  cushionL:   { sx: 0, sy: 0, behind: true, label: 'Ear cushion' },
  baffle:     { sx: 0, sy: 0, behind: true, label: 'Acoustic baffle' },
  driver:     { sx: 0, sy: 0, behind: true, label: '40 mm driver' },
  h1:         { sx: 0, sy: 0, behind: true, label: 'H1 chip' },
  shell:      { sx: 0, sy: 0, behind: true, label: 'Aluminium shell' },
  magnet:     { sx: 0, sy: 0, behind: true, label: 'Magnetic ring' },
  caseFlap:   { sx: 0, sy: 0, behind: true, label: 'Smart Case' },
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
// fade in then out across scroll windows
export const fadeWindow = (p, i0, i1, o0, o1) =>
  smooth(i0, i1, p) * (1 - smooth(o0, o1, p))
export const lerp = (a, b, t) => a + (b - a) * t
