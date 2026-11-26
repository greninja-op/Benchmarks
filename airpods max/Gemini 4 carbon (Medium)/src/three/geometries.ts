import * as THREE from 'three';

/**
 * Evaluates a C2-smooth rounded rectangle / stadium perimeter point and outward 2D normal.
 * Matches the Apple AirPods Max 83.4mm x 105.8mm ear cup planform silhouette.
 */
export function sampleRoundedRectPerimeter(
  u: number, // [0, 1) around perimeter
  halfW: number,
  halfH: number,
  radius: number
): { x: number; y: number; nx: number; ny: number } {
  const r = Math.min(radius, halfW - 0.001, halfH - 0.001);
  const straightX = Math.max(0, (halfW - r) * 2);
  const straightY = Math.max(0, (halfH - r) * 2);
  const arcLen = 0.5 * Math.PI * r;
  const totalLen = 2 * straightX + 2 * straightY + 4 * arcLen;

  let s = (((u % 1) + 1) % 1) * totalLen;

  // Segment 0: Right vertical straight (bottom-to-top)
  if (s < straightY) {
    const t = s / (straightY || 1);
    return {
      x: halfW,
      y: -(halfH - r) + t * straightY,
      nx: 1,
      ny: 0,
    };
  }
  s -= straightY;

  // Segment 1: Top-Right corner arc (0 -> PI/2)
  if (s < arcLen) {
    const a = (s / arcLen) * (Math.PI * 0.5);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return {
      x: halfW - r + r * ca,
      y: halfH - r + r * sa,
      nx: ca,
      ny: sa,
    };
  }
  s -= arcLen;

  // Segment 2: Top horizontal straight (right-to-left)
  if (s < straightX) {
    const t = s / (straightX || 1);
    return {
      x: halfW - r - t * straightX,
      y: halfH,
      nx: 0,
      ny: 1,
    };
  }
  s -= straightX;

  // Segment 3: Top-Left corner arc (PI/2 -> PI)
  if (s < arcLen) {
    const a = Math.PI * 0.5 + (s / arcLen) * (Math.PI * 0.5);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return {
      x: -(halfW - r) + r * ca,
      y: halfH - r + r * sa,
      nx: ca,
      ny: sa,
    };
  }
  s -= arcLen;

  // Segment 4: Left vertical straight (top-to-bottom)
  if (s < straightY) {
    const t = s / (straightY || 1);
    return {
      x: -halfW,
      y: halfH - r - t * straightY,
      nx: -1,
      ny: 0,
    };
  }
  s -= straightY;

  // Segment 5: Bottom-Left corner arc (PI -> 3PI/2)
  if (s < arcLen) {
    const a = Math.PI + (s / arcLen) * (Math.PI * 0.5);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return {
      x: -(halfW - r) + r * ca,
      y: -(halfH - r) + r * sa,
      nx: ca,
      ny: sa,
    };
  }
  s -= arcLen;

  // Segment 6: Bottom horizontal straight (left-to-right)
  if (s < straightX) {
    const t = s / (straightX || 1);
    return {
      x: -(halfW - r) + t * straightX,
      y: -halfH,
      nx: 0,
      ny: -1,
    };
  }
  s -= straightX;

  // Segment 7: Bottom-Right corner arc (3PI/2 -> 2PI)
  const a = Math.PI * 1.5 + Math.min(1, s / (arcLen || 1)) * (Math.PI * 0.5);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return {
    x: halfW - r + r * ca,
    y: -(halfH - r) + r * sa,
    nx: ca,
    ny: sa,
  };
}

/**
 * Builds the hollow CNC-style anodized aluminum ear cup unibody shell.
 * Local coordinates:
 *   X: cup width (-halfW .. +halfW)
 *   Y: cup height (-halfH .. +halfH)
 *   Z: 0 at inner cushion mating rim -> +depth at outer domed back face!
 * Including interior cavity wall thickness so Stage 6 Exploded View reveals a true hollow shell.
 */
export function createEarCupShellGeometry(
  halfW = 0.82,
  halfH = 1.04,
  cornerR = 0.58,
  depth = 0.54
): THREE.BufferGeometry {
  const radialSegs = 112;

  // Profile knots: [scaleFactor, zCoord] from inner cavity center -> inner wall -> lip -> outer belly -> outer dome center
  const profile: Array<[number, number]> = [];

  // 1. Outer dome center (s = 0, z = depth) to outer shoulder -> rim lip (z = 0)
  const outerSteps = 26;
  for (let i = 0; i <= outerSteps; i++) {
    const t = i / outerSteps; // 0 = outer dome apex, 1 = rim lip
    let s: number;
    let z: number;
    if (t < 0.86) {
      // Smooth continuous G2 super-ellipsoidal dome from apex to widest belly
      const u = t / 0.86; // 0 .. 1
      s = Math.pow(u, 0.88);
      const dome = Math.pow(Math.max(0, 1 - Math.pow(u, 2.35)), 0.48);
      z = 0.13 + (depth - 0.13) * dome;
    } else {
      // Subtle inward chamfered lip from belly (z=0.13, s=1.0) to rim mating edge (z=0, s=0.955)
      const w = (t - 0.86) / 0.14; // 0 .. 1
      s = 1.0 - 0.045 * (w * w);
      z = 0.13 * (1 - w);
    }
    profile.push([s, z]);
  }

  // 2. Wrap around rim lip into hollow interior wall for authentic CNC unibody depth
  const wallThickness = 0.055;
  profile.push([0.925, -0.005]);
  profile.push([0.91, 0.03]);
  const innerSteps = 10;
  for (let i = 1; i <= innerSteps; i++) {
    const u = 1 - i / innerSteps; // 0.9 -> 0
    const s = 0.91 * u;
    const dome = Math.pow(Math.max(0, 1 - Math.pow(u, 2.2)), 0.5);
    const z = 0.05 + (depth - wallThickness - 0.05) * dome;
    profile.push([s, z]);
  }

  const ringCount = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const perimeterSamples = [];
  for (let j = 0; j <= radialSegs; j++) {
    perimeterSamples.push(sampleRoundedRectPerimeter(j / radialSegs, halfW, halfH, cornerR));
  }

  for (let i = 0; i < ringCount; i++) {
    const [scale, z] = profile[i];
    const v = i / (ringCount - 1);
    for (let j = 0; j <= radialSegs; j++) {
      const p = perimeterSamples[j];
      // Blend toward slightly softer roundness near center apex so pole has zero pinching
      const px = p.x * scale;
      const py = p.y * scale;
      positions.push(px, py, z);
      uvs.push(j / radialSegs, v);
    }
  }

  const stride = radialSegs + 1;
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      // Winding so outer surface normals point +Z / outward
      indices.push(a, d, b);
      indices.push(d, c, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the plump memory-foam woven ear cushion swept seamlessly along the stadium contour.
 * Local coordinates:
 *   Sits on the inward side of the cup: Z goes from 0 (mating plane with cup) to -0.38 (cushion face against ear).
 */
export function createEarCushionGeometry(
  midHalfW = 0.62,
  midHalfH = 0.84,
  midCornerR = 0.42,
  tubeHalfW = 0.205,
  tubeHalfDepth = 0.195
): THREE.BufferGeometry {
  const pathSegs = 112;
  const crossSegs = 36;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= pathSegs; i++) {
    const u = i / pathSegs;
    const pathPt = sampleRoundedRectPerimeter(u, midHalfW, midHalfH, midCornerR);

    for (let j = 0; j <= crossSegs; j++) {
      const v = j / crossSegs;
      const phi = v * Math.PI * 2; // around tube cross-section
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Asymmetric plump viscoelastic memory-foam profile:
      // Flatter on the cup-mating back (sinP > 0 => Z near 0), generously rounded toward the ear (sinP < 0 => Z near -0.38)
      const radialOffset = cosP * tubeHalfW * (sinP > 0 ? 0.94 : 1.04);
      let zOffset = -tubeHalfDepth + sinP * tubeHalfDepth;
      if (sinP > 0.35) {
        // Subtle flat seating shoulder where cushion meets magnetic frame
        zOffset = THREE.MathUtils.lerp(zOffset, -0.012, Math.pow((sinP - 0.35) / 0.65, 1.6) * 0.45);
      }

      const vx = pathPt.x + pathPt.nx * radialOffset;
      const vy = pathPt.y + pathPt.ny * radialOffset;
      const vz = zOffset;

      positions.push(vx, vy, vz);
      uvs.push(u, v);
    }
  }

  const stride = crossSegs + 1;
  for (let i = 0; i < pathSegs; i++) {
    for (let j = 0; j < crossSegs; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a flat rounded-stadium plate or ring (used for inner L/R acoustic scrim, baffle plates,
 * rear magnetic cushion frame, and internal structural brackets).
 */
export function createStadiumPlateGeometry(
  halfW: number,
  halfH: number,
  cornerR: number,
  thickness = 0.02
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const segs = 72;
  for (let i = 0; i <= segs; i++) {
    const p = sampleRoundedRectPerimeter(i / segs, halfW, halfH, cornerR);
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: Math.min(0.008, thickness * 0.35),
    bevelSize: Math.min(0.008, thickness * 0.35),
    bevelSegments: 3,
    curveSegments: 24,
  });

  // Normalize planar UVs [0..1] for clean texture mapping (e.g., L/R mesh & honeycomb grille)
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const sizeX = bb.max.x - bb.min.x || 1;
  const sizeY = bb.max.y - bb.min.y || 1;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - bb.min.x) / sizeX, (pos.getY(i) - bb.min.y) / sizeY);
  }
  uv.needsUpdate = true;
  geo.center();
  return geo;
}

/**
 * Creates a stadium ring (outer stadium minus inner stadium cutout) for magnetic carrier rings,
 * internal CNC structural frames, and acoustic gaskets.
 */
export function createStadiumRingGeometry(
  outerHalfW: number,
  outerHalfH: number,
  outerR: number,
  innerHalfW: number,
  innerHalfH: number,
  innerR: number,
  depth = 0.035,
  bevel = 0.008
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const segs = 72;
  for (let i = 0; i <= segs; i++) {
    const p = sampleRoundedRectPerimeter(i / segs, outerHalfW, outerHalfH, outerR);
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  }
  shape.closePath();

  const hole = new THREE.Path();
  for (let i = segs; i >= 0; i--) {
    const p = sampleRoundedRectPerimeter(i / segs, innerHalfW, innerHalfH, innerR);
    if (i === segs) hole.moveTo(p.x, p.y);
    else hole.lineTo(p.x, p.y);
  }
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
}

/**
 * Evaluates a point along the iconic AirPods Max headband arch for t in [-1, +1].
 * t = -1: Left sleeve bottom ferrule
 * t =  0: Top center crown apex
 * t = +1: Right sleeve bottom ferrule
 */
export function sampleHeadbandArch(t: number): {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
} {
  // Angle from -0.56*PI to +0.56*PI gives the authentic horseshoe silhouette
  const maxAngle = Math.PI * 0.535;
  const theta = t * maxAngle;
  const archHalfWidth = 1.32;
  const archBaseY = 0.98;
  const archRadiusY = 1.54;

  const x = Math.sin(theta) * archHalfWidth;
  // Slightly taller parabolic-elliptical crown matching 4.22.11 PM (2).jpeg
  const y = archBaseY + Math.cos(theta) * archRadiusY;

  const dx = Math.cos(theta) * archHalfWidth * maxAngle;
  const dy = -Math.sin(theta) * archRadiusY * maxAngle;
  const tangent = new THREE.Vector3(dx, dy, 0).normalize();
  // Outward radial normal in XY plane
  const normal = new THREE.Vector3(-dy, dx, 0).normalize();

  return {
    pos: new THREE.Vector3(x, y, 0),
    tangent,
    normal,
  };
}

/**
 * Builds the split arched headband frame + saddle-dipped breathable knit-mesh canopy!
 * Reference: 4.22.11 PM (2).jpeg & 4.22.12 PM.jpeg
 * - Side sleeves for |t| in [0.50, 1.0] are solid cylindrical silicone tubes
 * - At |t| = 0.50 ("yoke transition"), each sleeve smoothly bifurcates into front & back curved rails
 * - Between t in [-0.52, +0.52], the perforated knit canopy stretches between the front & back rails
 *   with a realistic downward saddle belly so the mesh is clearly visible under the top arch!
 */
export function createHeadbandGeometries(): {
  frameGeometry: THREE.BufferGeometry;
  canopyGeometry: THREE.BufferGeometry;
} {
  // Build left sleeve, right sleeve, front upper rail, rear upper rail as smooth high-seg tubes, then merge
  const buildSweptTube = (
    tStart: number,
    tEnd: number,
    steps: number,
    zOffsetFn: (t: number) => number,
    yNormalOffsetFn: (t: number) => number,
    radiusFn: (t: number) => [number, number] // [radialXY, radialZ]
  ): THREE.BufferGeometry => {
    const radialSegs = 28;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const t = THREE.MathUtils.lerp(tStart, tEnd, u);
      const { pos, normal } = sampleHeadbandArch(t);
      const zOff = zOffsetFn(t);
      const nOff = yNormalOffsetFn(t);
      const [rXY, rZ] = radiusFn(t);

      const center = pos.clone().addScaledVector(normal, nOff);
      center.z += zOff;

      for (let j = 0; j <= radialSegs; j++) {
        const v = j / radialSegs;
        const a = v * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);

        const vx = center.x + normal.x * ca * rXY;
        const vy = center.y + normal.y * ca * rXY;
        const vz = center.z + sa * rZ;

        positions.push(vx, vy, vz);
        uvs.push(u, v);
      }
    }

    const stride = radialSegs + 1;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        const c = (i + 1) * stride + (j + 1);
        const d = i * stride + (j + 1);
        indices.push(a, d, b);
        indices.push(d, c, b);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const splitT = 0.52;
  const maxRailZ = 0.215;

  // Front & Rear split rails across the entire arch [-1, +1] that merge seamlessly into the side sleeves!
  // Wait: making front & rear tubes merge smoothly into z=0 for |t| > splitT creates an unbroken organic Y-yoke!
  const railSpread = (t: number): number => {
    const at = Math.abs(t);
    if (at >= splitT) return 0;
    const w = Math.cos((at / splitT) * (Math.PI * 0.5));
    return maxRailZ * Math.pow(w, 0.72);
  };

  const railRadius = (t: number): [number, number] => {
    const at = Math.abs(t);
    if (at >= splitT) {
      return [0.088, 0.092];
    }
    const blend = Math.pow(at / splitT, 2.2);
    const rXY = THREE.MathUtils.lerp(0.048, 0.088, blend);
    const rZ = THREE.MathUtils.lerp(0.046, 0.092, blend);
    return [rXY, rZ];
  };

  // Slight upward crown lift on the outer rails so the canopy hangs cleanly inside them
  const railNormalLift = (t: number): number => {
    const at = Math.abs(t);
    if (at >= splitT) return 0;
    return 0.038 * Math.cos((at / splitT) * (Math.PI * 0.5));
  };

  const frontRail = buildSweptTube(-1, 1, 96, (t) => +railSpread(t), railNormalLift, railRadius);
  const rearRail = buildSweptTube(-1, 1, 96, (t) => -railSpread(t), railNormalLift, railRadius);

  // Merge frontRail and rearRail into frameGeometry
  const frameGeometry = mergeBufferGeometriesSimple([frontRail, rearRail]);

  // Build saddle-curved breathable knit-mesh canopy suspended between frontRail & rearRail for t in [-splitT, +splitT]
  const uSteps = 72;
  const vSteps = 28;
  const cPos: number[] = [];
  const cUvs: number[] = [];
  const cIdx: number[] = [];

  for (let i = 0; i <= uSteps; i++) {
    const u = i / uSteps;
    const t = THREE.MathUtils.lerp(-splitT * 0.97, splitT * 0.97, u);
    const { pos, normal } = sampleHeadbandArch(t);
    const zHalf = railSpread(t) * 0.97;
    const edgeLift = railNormalLift(t);
    const archCenterFactor = Math.cos((Math.abs(t) / splitT) * (Math.PI * 0.5));

    for (let j = 0; j <= vSteps; j++) {
      const v = j / vSteps; // 0 = rear rail, 0.5 = center crown, 1 = front rail
      const s = v * 2 - 1; // -1 .. +1
      const z = s * zHalf;

      // Saddle profile: edges meet the front/rear rails; center dips slightly inward (-normal)
      // so from front view (4.22.11 PM (2).jpeg) the perforated mesh band is unmistakably visible!
      const bellyDip = (1 - s * s) * 0.095 * archCenterFactor;
      const nOffset = edgeLift - bellyDip;

      const vx = pos.x + normal.x * nOffset;
      const vy = pos.y + normal.y * nOffset;
      cPos.push(vx, vy, z);
      cUvs.push(u, v);
    }
  }

  const cStride = vSteps + 1;
  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * cStride + j;
      const b = (i + 1) * cStride + j;
      const c = (i + 1) * cStride + (j + 1);
      const d = i * cStride + (j + 1);
      cIdx.push(a, b, d);
      cIdx.push(b, c, d);
    }
  }

  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  canopyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(cUvs, 2));
  canopyGeometry.setIndex(cIdx);
  canopyGeometry.computeVertexNormals();

  return { frameGeometry, canopyGeometry };
}

/**
 * Builds the contoured dual-lobe AirPods Max Smart Case (reference 4.22.12 PM.jpeg)
 * + articulated magnetic front saddle flap!
 *
 * Key authentic details from 4.22.12 PM.jpeg:
 * 1. Dual contoured lobes wrapping left & right flat-swiveled ear cups, pinched cleanly at X = 0 center valley
 * 2. Characteristic flared soft-touch side wings on outer left & right edges
 * 3. Open top collar so the headband and chrome stems exit cleanly
 * 4. Curved bottom outer crescent cutouts where the bottom rims of the anodized aluminum cups peek through!
 * 5. Articulated magnetic front flap with rounded bottom corners & perimeter stitch crease
 */
export function createSmartCaseGeometries(): {
  caseBodyGeometry: THREE.BufferGeometry;
  caseFlapGeometry: THREE.BufferGeometry;
  flapCreaseGeometry: THREE.BufferGeometry;
} {
  const uSegs = 128; // around perimeter in XZ
  const vSegs = 56;  // from bottom seam (v=0) to top open rim (v=1)

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Build continuous double-pouch wrap surface with wall thickness via DoubleSide / rolled lip
  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs; // 0 = bottom, 1 = top opening
    const yBase = THREE.MathUtils.lerp(-1.12, 0.96, v);

    // Side wing flare peaks slightly below mid-height (matching 4.22.12 PM.jpeg silhouette!)
    const wingFlare = Math.sin(Math.pow(v, 0.82) * Math.PI);

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const phi = u * Math.PI * 2; // 0 = +X right wing, PI/2 = +Z front, PI = -X left wing, 3PI/2 = -Z back
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Horizontal X span: wider at mid-wing, rounded inward at top & bottom
      const xSpan = 1.78 * Math.pow(wingFlare, 0.34) + 0.36;
      let x = cosP * xSpan;

      // Center bridge valley pinch around x = 0 (cosP near 0)
      const centerProximity = Math.exp(-Math.pow(cosP * 3.4, 2));

      // Bottom contour: twin rounded lobes with center arch notch & outer crescent cutouts!
      // At bottom (v near 0), y lifts up at center (x=0) to form the twin-lobe saddle bottom,
      // AND lifts up along the outer lower crescents so the bottom of the aluminum cups peek out!
      const centerBottomArch = centerProximity * 0.42 * Math.pow(1 - v, 1.8);

      // Outer lower crescent cutout (around |cosP| in [0.35..0.92] at bottom) matching 4.22.12 PM.jpeg!
      const lobeDist = Math.abs(Math.abs(cosP) - 0.64);
      const crescentMask = Math.max(0, 1 - Math.pow(lobeDist / 0.34, 2));
      const frontBackMask = 0.55 + 0.45 * Math.abs(sinP);
      const bottomCrescentCutout = crescentMask * frontBackMask * 0.28 * Math.pow(Math.max(0, 1 - v * 2.4), 1.5);

      // Top rim dips slightly over the outer shoulders matching 4.22.12 PM.jpeg
      const topShoulderCurve = -0.32 * Math.pow(Math.abs(cosP), 1.9) * Math.pow(v, 1.6);

      const y = yBase + centerBottomArch + bottomCrescentCutout + topShoulderCurve;

      // Depth Z: hugs the flat-swiveled ear cups + cushions (`total thickness ~ 0.92`), pinched inward at X=0 center crease
      // and pinched to a crisp seam at outer wings (|cosP| -> 1) and bottom edge (v -> 0)
      const pouchBelly = Math.pow(Math.sin(v * Math.PI), 0.42);
      const wingPinch = Math.pow(Math.max(0, 1 - Math.pow(cosP, 4)), 0.55);
      const centerPinch = 1 - 0.58 * centerProximity;
      const halfDepth = 0.56 * pouchBelly * wingPinch * centerPinch + 0.035;

      const z = sinP * halfDepth;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = uSegs + 1;
  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * stride + iu;
      const b = (iv + 1) * stride + iu;
      const c = (iv + 1) * stride + (iu + 1);
      const d = iv * stride + (iu + 1);
      indices.push(a, d, b);
      indices.push(d, c, b);
    }
  }

  const caseBodyGeometry = new THREE.BufferGeometry();
  caseBodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  caseBodyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  caseBodyGeometry.setIndex(indices);
  caseBodyGeometry.computeVertexNormals();

  // Articulated Magnetic Front Saddle Flap!
  // Hinged at local (0, 0, 0) along the top bridge (world Y ~ +0.96, Z ~ +0.26)
  // Extends downward in -Y (`height = 1.06`, `halfW = 0.88`, generous bottom corner radius `0.30`)
  const flapW = 0.88;
  const flapH = 1.08;
  const botR = 0.30;

  const flapShape = new THREE.Shape();
  flapShape.moveTo(-flapW, 0);
  flapShape.lineTo(flapW, 0);
  flapShape.lineTo(flapW, -(flapH - botR));
  flapShape.absarc(flapW - botR, -(flapH - botR), botR, 0, -Math.PI * 0.5, true);
  flapShape.lineTo(-(flapW - botR), -flapH);
  flapShape.absarc(-(flapW - botR), -(flapH - botR), botR, -Math.PI * 0.5, -Math.PI, true);
  flapShape.lineTo(-flapW, 0);

  const caseFlapGeometry = new THREE.ExtrudeGeometry(flapShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 4,
    curveSegments: 28,
  });

  // Subtle curved contour along X & Y so the flap hugs the front saddle of the case cleanly
  const fPos = caseFlapGeometry.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const fx = fPos.getX(i);
    const fy = fPos.getY(i); // 0 down to -1.08
    const fz = fPos.getZ(i);
    const tDown = Math.abs(fy) / flapH;
    // Curve slightly forward over the upper bridge then tuck neatly toward the center crease
    const saddleZ = Math.sin(tDown * Math.PI) * 0.14 + (fx * fx) * 0.08 * tDown;
    fPos.setZ(i, fz + saddleZ);
  }
  caseFlapGeometry.computeVertexNormals();

  // Subtle inset perimeter border line on the front of the magnetic flap (exact detail in 4.22.12 PM.jpeg!)
  const inset = 0.055;
  const iW = flapW - inset;
  const iH = flapH - inset;
  const iR = botR - inset * 0.8;
  const creasePts: THREE.Vector3[] = [];
  const addArc = (cx: number, cy: number, r: number, a0: number, a1: number, steps: number) => {
    for (let s = 0; s <= steps; s++) {
      const a = THREE.MathUtils.lerp(a0, a1, s / steps);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      const tDown = Math.abs(py) / flapH;
      const pz = 0.057 + Math.sin(tDown * Math.PI) * 0.14 + (px * px) * 0.08 * tDown;
      creasePts.push(new THREE.Vector3(px, py, pz));
    }
  };
  creasePts.push(new THREE.Vector3(iW, -0.02, 0.058));
  addArc(iW - iR, -(iH - iR), iR, 0, -Math.PI * 0.5, 14);
  addArc(-(iW - iR), -(iH - iR), iR, -Math.PI * 0.5, -Math.PI, 14);
  creasePts.push(new THREE.Vector3(-iW, -0.02, 0.058));

  const creaseCurve = new THREE.CatmullRomCurve3(creasePts);
  const flapCreaseGeometry = new THREE.TubeGeometry(creaseCurve, 64, 0.007, 8, false);

  return { caseBodyGeometry, caseFlapGeometry, flapCreaseGeometry };
}

function mergeBufferGeometriesSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  for (const g of geos) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;
    const idx = g.getIndex();

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
      else uvs.push(0, 0);
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + vertexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices.push(i + vertexOffset);
      }
    }
    vertexOffset += pos.count;
    g.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}
