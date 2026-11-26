import { AIRPODS_COLORWAYS, SCROLL_STAGES, type ColorwayId } from '../data/airpodsSpec';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface ChoreographyState {
  scrollProgress: number;
  stageIndex: number;
  cameraPos: Vec3Tuple;
  cameraTarget: Vec3Tuple;
  cameraFov: number;
  headsetPos: Vec3Tuple;
  headsetRot: Vec3Tuple;
  keyLightAzimuth: number;
  rimLightAzimuth: number;
  crownSpin: number;
  cushionDetach: number;
  explodeFactor: number;
  cupSwivelFlat: number;
  smartCaseLift: number;
  smartCaseOpacity: number;
  headsetDropInCase: number;
  smartCaseFlapClose: number;
  controlsCalloutOpacity: number;
  explodedCalloutOpacity: number;
  autoColorwayIndex: number;
}

export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export interface Keyframe {
  at: number;
  cameraPos: Vec3Tuple;
  cameraTarget: Vec3Tuple;
  cameraFov: number;
  headsetPos: Vec3Tuple;
  headsetRot: Vec3Tuple;
}

const KEYFRAMES: Keyframe[] = [
  // Stage 1: Hero front three-quarter (0.00 - 0.12)
  {
    at: 0.0,
    cameraPos: { x: 0.55, y: 0.14, z: 3.35 },
    cameraTarget: { x: 0.0, y: 0.08, z: 0.0 },
    cameraFov: 35,
    headsetPos: { x: 0.0, y: 0.05, z: 0.0 },
    headsetRot: { x: 0.04, y: -0.26, z: 0.0 },
  },
  // Stage 2: Colorway showcase (0.12 - 0.26)
  {
    at: 0.18,
    cameraPos: { x: -0.62, y: 0.18, z: 3.15 },
    cameraTarget: { x: -0.18, y: 0.08, z: 0.0 },
    cameraFov: 35,
    headsetPos: { x: 0.22, y: 0.06, z: 0.0 },
    headsetRot: { x: 0.06, y: 0.42, z: -0.02 },
  },
  // Stage 3: Macro zoom Digital Crown & Noise Control Button (0.26 - 0.44)
  {
    at: 0.34,
    cameraPos: { x: 1.32, y: 0.38, z: 0.98 },
    cameraTarget: { x: 0.65, y: 0.12, z: 0.16 },
    cameraFov: 30,
    headsetPos: { x: 0.06, y: 0.02, z: 0.0 },
    headsetRot: { x: 0.08, y: -0.45, z: 0.04 },
  },
  {
    at: 0.41,
    cameraPos: { x: 1.26, y: 0.34, z: 0.95 },
    cameraTarget: { x: 0.65, y: 0.12, z: 0.16 },
    cameraFov: 30,
    headsetPos: { x: 0.06, y: 0.02, z: 0.0 },
    headsetRot: { x: 0.07, y: -0.52, z: 0.04 },
  },
  // Stage 4: Acoustic Knit-Mesh Canopy & Inner "L"/"R" Cushion Macro (0.44 - 0.58)
  {
    at: 0.49,
    cameraPos: { x: -0.55, y: 0.98, z: 1.48 },
    cameraTarget: { x: -0.05, y: 0.58, z: 0.0 },
    cameraFov: 32,
    headsetPos: { x: -0.1, y: -0.04, z: 0.0 },
    headsetRot: { x: 0.34, y: 0.45, z: -0.05 },
  },
  {
    at: 0.55,
    cameraPos: { x: -0.92, y: -0.05, z: 1.24 },
    cameraTarget: { x: 0.38, y: -0.28, z: 0.02 },
    cameraFov: 30,
    headsetPos: { x: -0.14, y: 0.04, z: 0.0 },
    headsetRot: { x: 0.04, y: 0.72, z: 0.0 },
  },
  // Stage 5: Magnetic Cushion Detach & Snap-Back (0.58 - 0.72)
  {
    at: 0.65,
    cameraPos: { x: 0.16, y: -0.12, z: 2.75 },
    cameraTarget: { x: -0.1, y: -0.15, z: 0.0 },
    cameraFov: 36,
    headsetPos: { x: 0.18, y: 0.06, z: 0.0 },
    headsetRot: { x: 0.08, y: 0.12, z: 0.0 },
  },
  // Stage 6: Horizontal Exploded View (0.72 - 0.88)
  {
    at: 0.80,
    cameraPos: { x: 0.46, y: 0.02, z: 3.18 },
    cameraTarget: { x: 0.24, y: -0.18, z: 0.0 },
    cameraFov: 34,
    headsetPos: { x: -0.16, y: 0.08, z: 0.0 },
    headsetRot: { x: 0.05, y: -0.26, z: 0.0 },
  },
  // Stage 7: Smart Case Finale (0.88 - 1.00)
  {
    at: 0.90,
    cameraPos: { x: 0.28, y: 0.14, z: 3.58 },
    cameraTarget: { x: -0.18, y: -0.04, z: 0.0 },
    cameraFov: 35,
    headsetPos: { x: 0.22, y: 0.32, z: 0.0 },
    headsetRot: { x: 0.04, y: -0.12, z: 0.0 },
  },
  {
    at: 1.0,
    cameraPos: { x: 0.16, y: 0.08, z: 3.55 },
    cameraTarget: { x: -0.18, y: -0.08, z: 0.0 },
    cameraFov: 35,
    headsetPos: { x: 0.22, y: -0.02, z: 0.0 },
    headsetRot: { x: 0.02, y: -0.06, z: 0.0 },
  },
];

function sampleKeyframes(progress: number): {
  cameraPos: Vec3Tuple;
  cameraTarget: Vec3Tuple;
  cameraFov: number;
  headsetPos: Vec3Tuple;
  headsetRot: Vec3Tuple;
} {
  const p = clamp01(progress);
  if (p <= KEYFRAMES[0].at) {
    const k = KEYFRAMES[0];
    return {
      cameraPos: { ...k.cameraPos },
      cameraTarget: { ...k.cameraTarget },
      cameraFov: k.cameraFov,
      headsetPos: { ...k.headsetPos },
      headsetRot: { ...k.headsetRot },
    };
  }
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  if (p >= last.at) {
    return {
      cameraPos: { ...last.cameraPos },
      cameraTarget: { ...last.cameraTarget },
      cameraFov: last.cameraFov,
      headsetPos: { ...last.headsetPos },
      headsetRot: { ...last.headsetRot },
    };
  }

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (p >= a.at && p <= b.at) {
      const localT = smootherstep(a.at, b.at, p);
      return {
        cameraPos: lerpVec3(a.cameraPos, b.cameraPos, localT),
        cameraTarget: lerpVec3(a.cameraTarget, b.cameraTarget, localT),
        cameraFov: lerp(a.cameraFov, b.cameraFov, localT),
        headsetPos: lerpVec3(a.headsetPos, b.headsetPos, localT),
        headsetRot: lerpVec3(a.headsetRot, b.headsetRot, localT),
      };
    }
  }

  return {
    cameraPos: { ...last.cameraPos },
    cameraTarget: { ...last.cameraTarget },
    cameraFov: last.cameraFov,
    headsetPos: { ...last.headsetPos },
    headsetRot: { ...last.headsetRot },
  };
}

export function getActiveStageIndex(scrollProgress: number): number {
  const p = clamp01(scrollProgress);
  for (let i = 0; i < SCROLL_STAGES.length; i++) {
    const s = SCROLL_STAGES[i];
    if (p >= s.start && (p < s.end || i === SCROLL_STAGES.length - 1)) {
      return i;
    }
  }
  return 0;
}

export function computeChoreographyState(scrollProgress: number): ChoreographyState {
  const p = clamp01(scrollProgress);
  const sampled = sampleKeyframes(p);

  // Stage 2 auto-colorway index across 5 finishes (12% - 26%)
  const finishWindow = clamp01((p - 0.12) / 0.14);
  const autoColorwayIndex = Math.min(
    AIRPODS_COLORWAYS.length - 1,
    Math.floor(finishWindow * AIRPODS_COLORWAYS.length),
  );

  // Stage 3: Digital Crown spin + callouts (26% - 44%)
  const crownActivity = smoothstep(0.27, 0.33, p) * (1 - smoothstep(0.41, 0.45, p));
  const crownSpin = smoothstep(0.27, 0.44, p) * Math.PI * 3.2;
  const controlsCalloutOpacity =
    smoothstep(0.30, 0.34, p) * (1 - smoothstep(0.41, 0.445, p));

  // Stage 5: Cushion detach -> hold -> magnetic snap-back (58% - 72%)
  const detachIn = smootherstep(0.58, 0.635, p);
  const detachOut = smootherstep(0.675, 0.72, p);
  const cushionDetach = clamp01(detachIn * (1 - detachOut));

  // Stage 6: Horizontal Exploded View expand -> hold -> reassemble (72% - 88%)
  const explodeIn = smootherstep(0.72, 0.775, p);
  const explodeOut = smootherstep(0.835, 0.88, p);
  const explodeFactor = clamp01(explodeIn * (1 - explodeOut));
  const explodedCalloutOpacity =
    smoothstep(0.735, 0.765, p) * (1 - smoothstep(0.835, 0.865, p));

  // Stage 7: Smart Case Finale (88% - 100%)
  const cupSwivelFlat = smootherstep(0.875, 0.915, p);
  const smartCaseLift = smootherstep(0.885, 0.935, p);
  const smartCaseOpacity = smoothstep(0.875, 0.91, p);
  const headsetDropInCase = smootherstep(0.92, 0.968, p);
  const smartCaseFlapClose = smootherstep(0.958, 0.995, p);

  // Dynamic light azimuth sweeping specular reflections across anodized aluminum
  const keyLightAzimuth = 0.65 + p * Math.PI * 1.45 + crownActivity * 0.45;
  const rimLightAzimuth = -2.35 + p * Math.PI * 0.95;

  return {
    scrollProgress: p,
    stageIndex: getActiveStageIndex(p),
    cameraPos: sampled.cameraPos,
    cameraTarget: sampled.cameraTarget,
    cameraFov: sampled.cameraFov,
    headsetPos: sampled.headsetPos,
    headsetRot: sampled.headsetRot,
    keyLightAzimuth,
    rimLightAzimuth,
    crownSpin,
    cushionDetach,
    explodeFactor,
    cupSwivelFlat,
    smartCaseLift,
    smartCaseOpacity,
    headsetDropInCase,
    smartCaseFlapClose,
    controlsCalloutOpacity,
    explodedCalloutOpacity,
    autoColorwayIndex,
  };
}

export function getColorwayById(id: ColorwayId) {
  return AIRPODS_COLORWAYS.find((c) => c.id === id) ?? AIRPODS_COLORWAYS[0];
}
