import * as THREE from 'three';

export interface ChoreographyPose {
  camPos: THREE.Vector3;
  camTarget: THREE.Vector3;
  fov: number;
  headsetPos: THREE.Vector3;
  headsetRot: THREE.Euler;
  crownRotation: number;
  detachAmount: number;
  detachSplay: number;
  explodeAmount: number;
  cupSwivelCase: number;
  smartCaseVisible: boolean;
  smartCaseY: number;
  smartCaseOpen: number;
  shadowOpacity: number;
  colorAutoProgress: number; // 0..4 continuous index across 5 finishes
  stageIndex: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

interface Keyframe {
  p: number;
  camPos: [number, number, number];
  camTarget: [number, number, number];
  fov: number;
  headsetPos: [number, number, number];
  headsetRot: [number, number, number];
}

// Smooth camera & hero pose keyframes spanning all 7 choreography stages (0.00 -> 1.00)
const KEYFRAMES: Keyframe[] = [
  // Stage 1: Hero Entrance (0.00 - 0.12)
  {
    p: 0.0,
    camPos: [0.42, 0.22, 4.45],
    camTarget: [0.0, 0.02, 0.0],
    fov: 34,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.04, -0.24, 0.0],
  },
  {
    p: 0.12,
    camPos: [0.0, 0.18, 4.18],
    camTarget: [0.0, 0.02, 0.0],
    fov: 34,
    headsetPos: [0.0, -0.16, 0.0],
    headsetRot: [0.02, 0.08, 0.0],
  },

  // Stage 2: Dynamic Colorway Morphing (0.12 - 0.26)
  {
    p: 0.19,
    camPos: [-0.95, 0.24, 3.92],
    camTarget: [0.0, -0.02, 0.0],
    fov: 33,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.05, 0.36, 0.0],
  },
  {
    p: 0.26,
    camPos: [0.58, 0.26, 3.65],
    camTarget: [0.15, -0.02, 0.0],
    fov: 32,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.04, -0.45, 0.0],
  },

  // Stage 3: Macro Zoom — Digital Crown & Noise Control Button (0.26 - 0.44)
  {
    p: 0.31,
    camPos: [0.62, 0.24, 2.04],
    camTarget: [0.39, -0.20, 0.74],
    fov: 26,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.14, -1.08, 0.02],
  },
  {
    p: 0.41,
    camPos: [0.68, 0.28, 1.94],
    camTarget: [0.40, -0.20, 0.75],
    fov: 25,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.16, -1.16, 0.025],
  },
  {
    p: 0.44,
    camPos: [0.15, 0.85, 2.35],
    camTarget: [0.05, 0.65, 0.05],
    fov: 30,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.18, -0.42, 0.0],
  },

  // Stage 4: Acoustic Knit-Mesh Canopy & Inner "L"/"R" Cushion Macro (0.44 - 0.58)
  {
    p: 0.50,
    camPos: [-0.88, 1.56, 2.02],
    camTarget: [0.0, 1.05, 0.0],
    fov: 30,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.12, 0.24, 0.0],
  },
  {
    p: 0.565,
    camPos: [-0.85, -0.42, 1.82],
    camTarget: [0.55, -0.54, -0.28],
    fov: 28,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.04, 0.48, 0.0],
  },

  // Stage 5: Magnetic Ear Cushion Detach & Snap-Back (0.58 - 0.72)
  {
    p: 0.61,
    camPos: [0.0, 0.14, 4.15],
    camTarget: [0.0, -0.22, 0.0],
    fov: 34,
    headsetPos: [0.0, -0.16, 0.0],
    headsetRot: [0.08, 0.0, 0.0],
  },
  {
    p: 0.69,
    camPos: [0.0, 0.14, 4.15],
    camTarget: [0.0, -0.22, 0.0],
    fov: 34,
    headsetPos: [0.0, -0.16, 0.0],
    headsetRot: [0.08, 0.0, 0.0],
  },
  {
    p: 0.72,
    camPos: [-0.22, -0.20, 3.85],
    camTarget: [-0.36, -0.42, -0.05],
    fov: 33,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.04, 1.65, 0.0],
  },

  // Stage 6: Engineering Exploded View (0.72 - 0.88)
  {
    p: 0.76,
    camPos: [-0.52, -0.44, 3.45],
    camTarget: [-0.62, -0.56, -0.14],
    fov: 32,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.03, Math.PI - 0.18, 0.0],
  },
  {
    p: 0.84,
    camPos: [-0.46, -0.42, 3.50],
    camTarget: [-0.60, -0.56, -0.14],
    fov: 32,
    headsetPos: [0.0, -0.18, 0.0],
    headsetRot: [0.03, Math.PI - 0.12, 0.0],
  },
  {
    p: 0.88,
    camPos: [0.0, 0.12, 4.35],
    camTarget: [0.0, -0.06, 0.0],
    fov: 34,
    headsetPos: [0.0, 0.34, 0.0],
    headsetRot: [0.0, 0.0, 0.0],
  },

  // Stage 7: Smart Case Finale (0.88 - 1.00)
  {
    p: 0.925,
    camPos: [0.0, 0.24, 4.55],
    camTarget: [0.0, -0.08, 0.0],
    fov: 34,
    headsetPos: [0.0, 0.56, 0.0],
    headsetRot: [0.0, 0.0, 0.0],
  },
  {
    p: 0.965,
    camPos: [0.0, 0.14, 4.35],
    camTarget: [0.0, -0.08, 0.0],
    fov: 34,
    headsetPos: [0.0, -0.10, 0.0],
    headsetRot: [0.0, 0.0, 0.0],
  },
  {
    p: 1.0,
    camPos: [0.0, 0.12, 4.18],
    camTarget: [0.0, -0.08, 0.0],
    fov: 33,
    headsetPos: [0.0, -0.10, 0.0],
    headsetRot: [0.0, 0.0, 0.0],
  },
];

export function evaluateChoreography(
  progress: number,
  timeSec: number,
  out: ChoreographyPose
): ChoreographyPose {
  const p = clamp01(progress);

  // Locate surrounding keyframes
  let idx = 0;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].p && p <= KEYFRAMES[i + 1].p) {
      idx = i;
      break;
    }
  }
  const k0 = KEYFRAMES[idx];
  const k1 = KEYFRAMES[Math.min(idx + 1, KEYFRAMES.length - 1)];
  const span = Math.max(0.0001, k1.p - k0.p);
  const t = smootherstep(0, 1, (p - k0.p) / span);

  out.camPos.set(
    THREE.MathUtils.lerp(k0.camPos[0], k1.camPos[0], t),
    THREE.MathUtils.lerp(k0.camPos[1], k1.camPos[1], t),
    THREE.MathUtils.lerp(k0.camPos[2], k1.camPos[2], t)
  );
  out.camTarget.set(
    THREE.MathUtils.lerp(k0.camTarget[0], k1.camTarget[0], t),
    THREE.MathUtils.lerp(k0.camTarget[1], k1.camTarget[1], t),
    THREE.MathUtils.lerp(k0.camTarget[2], k1.camTarget[2], t)
  );
  out.fov = THREE.MathUtils.lerp(k0.fov, k1.fov, t);

  // Subtle organic floating breath during hero & colorway views (fades to 0 during macro, explode, & Smart Case dock!)
  const floatEnvelope =
    1.0 -
    smoothstep(0.24, 0.30, p) +
    smoothstep(0.57, 0.61, p) * 0.25 * (1.0 - smoothstep(0.70, 0.74, p));
  const breathY = Math.sin(timeSec * 1.15) * 0.024 * clamp01(floatEnvelope);

  out.headsetPos.set(
    THREE.MathUtils.lerp(k0.headsetPos[0], k1.headsetPos[0], t),
    THREE.MathUtils.lerp(k0.headsetPos[1], k1.headsetPos[1], t) + breathY,
    THREE.MathUtils.lerp(k0.headsetPos[2], k1.headsetPos[2], t)
  );
  out.headsetRot.set(
    THREE.MathUtils.lerp(k0.headsetRot[0], k1.headsetRot[0], t),
    THREE.MathUtils.lerp(k0.headsetRot[1], k1.headsetRot[1], t),
    THREE.MathUtils.lerp(k0.headsetRot[2], k1.headsetRot[2], t)
  );

  // Stage 2: Smooth continuous colorway index across 5 finishes (0..4) between 12% and 26%
  const colorT = clamp01((p - 0.125) / (0.255 - 0.125));
  out.colorAutoProgress = colorT * 4.0;

  // Stage 3: Digital Crown smooth knurled dial spin (28% -> 43%)
  const crownT = smoothstep(0.28, 0.43, p);
  out.crownRotation = crownT * Math.PI * 3.4;

  // Stage 5: Magnetic ear cushion detach (58% -> 65%), hold (65% -> 67.5%), magnetic snap-back (67.5% -> 71.5%)
  const detachIn = smootherstep(0.585, 0.642, p);
  const detachSnapRaw = 1.0 - clamp01((p - 0.675) / 0.036);
  // Crisp magnetic pull-in snap curve on return!
  const detachOut = Math.pow(detachSnapRaw, 1.85);
  out.detachAmount = p < 0.66 ? detachIn : detachOut;

  // Slightly splay cups open toward the camera during Stage 5 so BOTH inner honeycomb grilles shine clearly
  const splayIn = smootherstep(0.575, 0.615, p);
  const splayOut = 1.0 - smootherstep(0.695, 0.725, p);
  out.detachSplay = Math.min(splayIn, splayOut);

  // Stage 6: 5-Layer Engineering Exploded View (73.5% -> 77.5% expand, hold until 83.5%, smoothly reassemble 83.5% -> 87.5%)
  const expIn = smootherstep(0.735, 0.778, p);
  const expOut = 1.0 - smootherstep(0.838, 0.876, p);
  out.explodeAmount = Math.min(expIn, expOut);

  // Stage 7: Smart Case Finale (88% -> 100%)
  out.cupSwivelCase = smootherstep(0.875, 0.918, p);
  const caseRise = smootherstep(0.885, 0.928, p);
  out.smartCaseVisible = p > 0.88;
  out.smartCaseY = THREE.MathUtils.lerp(-3.4, -0.35, caseRise);
  // Flap stays wide open while headphones descend (0.88 -> 0.962), then folds shut smoothly (0.962 -> 0.992)!
  out.smartCaseOpen = 1.0 - smootherstep(0.960, 0.992, p);

  // Fade ground contact shadow out during extreme macro & exploded views
  const shadowMacroFade = 1.0 - smoothstep(0.27, 0.32, p) + smoothstep(0.56, 0.61, p);
  const shadowExpFade = 1.0 - smoothstep(0.72, 0.76, p) + smoothstep(0.87, 0.91, p);
  out.shadowOpacity = 0.52 * clamp01(shadowMacroFade) * clamp01(shadowExpFade);

  // Active stage index (0..6)
  if (p < 0.12) out.stageIndex = 0;
  else if (p < 0.26) out.stageIndex = 1;
  else if (p < 0.44) out.stageIndex = 2;
  else if (p < 0.58) out.stageIndex = 3;
  else if (p < 0.72) out.stageIndex = 4;
  else if (p < 0.88) out.stageIndex = 5;
  else out.stageIndex = 6;

  return out;
}
