/** Chapters of the page, as fractions of total scroll. Each one maps to a block of copy in index.html. */
export const STAGES = [
  { id: 'hero', from: 0.0 },
  { id: 'finish', from: 0.12 },
  { id: 'controls', from: 0.26 },
  { id: 'canopy', from: 0.44 },
  { id: 'cushions', from: 0.58 },
  { id: 'explode', from: 0.72 },
  { id: 'case', from: 0.88 },
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** 0 before a, 1 after b, eased in between. */
const ramp = (p, a, b) => smooth((p - a) / (b - a));
/** Rises from a, holds, and falls to 0 at b. */
const bell = (p, a, b, fade) => ramp(p, a, a + fade) * (1 - ramp(p, b - fade, b));
const lerp = (a, b, t) => a + (b - a) * t;

/** Digital Crown position in product space (right cup, outer top edge). */
const CROWN = [8.1, 2.0, 0.6];

/**
 * Camera and product keys. `yaw` rotates the headphones about Y. The camera orbits `focus`
 * (product space) from the direction `dir` at distance `dist`.
 */
const KEYS = [
  { p: 0.0, yaw: -0.5, focus: [0, 0, 0], dist: 68, dir: [0, 0.12, 1] },
  { p: 0.12, yaw: -0.36, focus: [0, 0, 0], dist: 66, dir: [0, 0.1, 1] },
  { p: 0.26, yaw: -0.12, focus: [0, 0, 0], dist: 62, dir: [0, 0.08, 1] },
  { p: 0.36, yaw: -Math.PI / 2, focus: CROWN, dist: 19, dir: [0, 0.1, 1] },
  { p: 0.44, yaw: -Math.PI / 2, focus: CROWN, dist: 18, dir: [0, 0.1, 1] },
  { p: 0.5, yaw: 0, focus: [0, 12.2, 0], dist: 22, dir: [0, 0.18, 1] },
  { p: 0.58, yaw: 0, focus: [4.6, 0, 3.5], dist: 13, dir: [0, 0.05, 1] },
  { p: 0.64, yaw: -0.45, focus: [0, 2, 1.5], dist: 66, dir: [0, 0.12, 1] },
  { p: 0.7, yaw: -0.45, focus: [0, 2, 1.5], dist: 66, dir: [0, 0.12, 1] },
  { p: 0.76, yaw: -1.15, focus: [5, 3, 4.5], dist: 60, dir: [0, 0.1, 1] },
  { p: 0.84, yaw: -1.15, focus: [5, 3, 4.5], dist: 60, dir: [0, 0.1, 1] },
  { p: 0.9, yaw: 0, focus: [0, -1, 0], dist: 84, dir: [0, 0.22, 1] },
  { p: 0.96, yaw: 0, focus: [0, -3.5, 0], dist: 92, dir: [0, 0.26, 1] },
  { p: 1.0, yaw: 0, focus: [0, -4.6, 0], dist: 100, dir: [0, 0.3, 1] },
];

function sampleKeys(p) {
  if (p <= KEYS[0].p) return KEYS[0];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (p <= b.p) {
      const t = smooth((p - a.p) / (b.p - a.p));
      return {
        yaw: lerp(a.yaw, b.yaw, t),
        dist: lerp(a.dist, b.dist, t),
        focus: a.focus.map((v, k) => lerp(v, b.focus[k], t)),
        dir: a.dir.map((v, k) => lerp(v, b.dir[k], t)),
      };
    }
  }
  return KEYS[KEYS.length - 1];
}

/** Cushion detach: lift at 58–64%, hold, glide back at 66–70%, then a small magnetic overshoot. */
function detachCurve(p) {
  if (p < 0.58) return 0;
  if (p < 0.64) return ramp(p, 0.58, 0.64);
  if (p < 0.66) return 1;
  if (p < 0.7) return 1 - ramp(p, 0.66, 0.7);
  if (p < 0.73) return -0.12 * Math.sin((Math.PI * (p - 0.7)) / 0.03);
  return 0;
}

/** Converts scroll progress into one state object. Every value is a pure function of p. */
export function evaluate(p) {
  const cam = sampleKeys(p);
  return {
    p,
    yaw: cam.yaw,
    focus: cam.focus,
    dist: cam.dist,
    dir: cam.dir,
    colorT: clamp01((p - 0.12) / 0.14) * 4,
    crownAngle: clamp01((p - 0.26) / 0.18) * 10.8,
    detach: detachCurve(p),
    explode: bell(p, 0.72, 0.88, 0.06),
    swivel: ramp(p, 0.88, 0.92),
    headDrop: ramp(p, 0.94, 0.98),
    caseRise: ramp(p, 0.89, 0.94),
    lidOpen: 1 - ramp(p, 0.97, 1.0),
    crownLeader: bell(p, 0.3, 0.47, 0.04),
    noiseLeader: bell(p, 0.36, 0.47, 0.04),
    layersLeader: bell(p, 0.75, 0.86, 0.03),
    dark: bell(p, 0.7, 0.9, 0.03),
  };
}

/** Index of the chapter that owns progress p. */
export function stageIndexOf(p) {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) if (p >= STAGES[i].from) idx = i;
  return idx;
}
