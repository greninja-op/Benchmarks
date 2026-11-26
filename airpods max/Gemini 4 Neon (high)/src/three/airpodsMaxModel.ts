import * as THREE from 'three';
import type { ColorwaySpec } from '../types/showcase';
import type { ProceduralTextureSuite } from './proceduralTextures';
import { createSmartCase, type SmartCaseRig } from './smartCaseModel';

export interface EarCupAssembly {
  side: 'left' | 'right';
  swivelPivot: THREE.Group;
  tiltPivot: THREE.Group;
  // 5 Exploded / Interactive Layers (local X is outward/inward axis of the cup!)
  // For right cup (+X side): outward = +X, inward (toward head/cushion) = -X
  // For left cup (-X side):  outward = -X, inward (toward head/cushion) = +X
  shellLayer: THREE.Group;
  electronicsLayer: THREE.Group;
  driverLayer: THREE.Group;
  baffleLayer: THREE.Group;
  cushionLayer: THREE.Group;
  crownSpinner?: THREE.Group;
}

export interface AirPodsMaxRig {
  root: THREE.Group;
  headsetGroup: THREE.Group;
  leftCup: EarCupAssembly;
  rightCup: EarCupAssembly;
  smartCase: SmartCaseRig;
  contactShadow: THREE.Mesh;
  anchors: Record<string, THREE.Object3D>;
  materials: {
    aluminum: THREE.MeshPhysicalMaterial;
    aluminumAccent: THREE.MeshStandardMaterial;
    chrome: THREE.MeshPhysicalMaterial;
    darkChrome: THREE.MeshStandardMaterial;
    headbandSilicone: THREE.MeshStandardMaterial;
    canopyMesh: THREE.MeshStandardMaterial;
    cushionFabric: THREE.MeshStandardMaterial;
    innerMeshL: THREE.MeshStandardMaterial;
    innerMeshR: THREE.MeshStandardMaterial;
    baffleMat: THREE.MeshStandardMaterial;
  };
  applyBlendedColorway: (a: ColorwaySpec, b: ColorwaySpec, t: number) => void;
  setCrownRotation: (radians: number) => void;
  setCushionDetach: (amount01: number) => void;
  setExplodeAmount: (amount01: number) => void;
  setCupSwivelForCase: (swivel01: number) => void;
  dispose: () => void;
}

/**
 * Superellipse / stadium radial distance helper (authentic AirPods Max cup silhouette, n = 2.68)
 */
function superellipsePoint(
  theta: number,
  halfW: number,
  halfH: number,
  n = 2.68
): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const p = 2 / n;
  const x = Math.sign(c) * Math.pow(Math.abs(c), p) * halfW;
  const y = Math.sign(s) * Math.pow(Math.abs(s), p) * halfH;
  return [x, y];
}

/**
 * Builds a high-segment, hollow, G2-continuous sculpted anodized aluminum ear cup shell.
 * Cup local frame:
 *  - Y = vertical tall axis (height ≈ 1.02)
 *  - Z = front-to-back axis (width ≈ 0.80)
 *  - X = thickness axis: outer pillowed dome bulges toward +X (sign = +1), inner open cavity faces -X!
 */
function createAluminumShellGeometry(
  halfZ = 0.40,
  halfY = 0.515,
  depth = 0.245,
  segU = 96
): THREE.BufferGeometry {
  // Profile rings from inner cavity back wall -> inner rim lip -> rolled outer edge -> pillowed dome apex
  // Each ring is [radialScale, xPos]
  const profile: [number, number][] = [
    // Inner hollow recess floor (visible during Stage 6 exploded view!)
    [0.01, depth * 0.68],
    [0.45, depth * 0.66],
    [0.76, depth * 0.54],
    [0.86, depth * 0.28],
    [0.89, -0.02],
    // Inner machined mounting chamfer flange
    [0.935, -0.045],
    [0.972, -0.032],
    // Rolled side edge transitioning smoothly onto the pillowed outer dome
    [0.996, 0.015],
    [1.002, 0.068],
    [0.992, 0.122],
    [0.962, 0.168],
    [0.905, 0.205],
    [0.815, 0.232],
    [0.685, 0.249],
    [0.515, 0.259],
    [0.320, 0.264],
    [0.140, 0.266],
    [0.002, 0.267],
  ];

  const rings = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ir = 0; ir < rings; ir++) {
    const [radScale, xBase] = profile[ir];
    const v = ir / (rings - 1);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const theta = u * Math.PI * 2;
      const [z, y] = superellipsePoint(theta, halfZ * radScale, halfY * radScale, 2.68);
      // Subtle organic pillowing so the outer dome feels milled from solid billet aluminum
      positions.push(xBase, y, z);
      uvs.push(u * 2.0, v * 2.0);
    }
  }

  const stride = segU + 1;
  for (let ir = 0; ir < rings - 1; ir++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = ir * stride + iu;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
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
 * Builds the plush diamond-knit memory-foam ear cushion as a continuous closed stadium-torus pillow.
 * Local frame: sits along -X relative to the aluminum cup inner rim (extends from x = 0 to x = -0.255).
 */
function createEarCushionGeometry(
  outerZ = 0.418,
  outerY = 0.532,
  innerZ = 0.195,
  innerY = 0.285,
  thickness = 0.248,
  segU = 96,
  segV = 34
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const phi = v * Math.PI * 2; // cross-section angle around the memory-foam bolster
    // Cross-section shape: slightly flatter back mounting face (x ≈ 0), full plush rounded crown toward the ear (x ≈ -thickness)
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);

    // 0 = inner cavity wall, 1 = outer perimeter rim
    const radialMix = 0.5 + 0.5 * cosP;
    const curZ = THREE.MathUtils.lerp(innerZ, outerZ, radialMix);
    const curY = THREE.MathUtils.lerp(innerY, outerY, radialMix);

    // Asymmetric plush pillow profile along X
    const xPos =
      sinP >= 0
        ? -thickness * (0.48 + 0.52 * Math.pow(sinP, 0.82))
        : -thickness * (0.48 - 0.46 * Math.pow(-sinP, 0.72));

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const theta = u * Math.PI * 2;
      const [z, y] = superellipsePoint(theta, curZ, curY, 2.62);
      positions.push(xPos, y, z);
      uvs.push(u * 2.4, v * 1.2);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
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
 * Builds a flat superellipse plate (used for inner acoustic L/R mesh, baffle base, and magnetic flange)
 */
function createSuperellipsePlateGeometry(
  halfZ: number,
  halfY: number,
  n = 2.65,
  segs = 72
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const theta = (i / segs) * Math.PI * 2;
    const [z, y] = superellipsePoint(theta, halfZ, halfY, n);
    if (i === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  }
  const geo = new THREE.ShapeGeometry(shape, 1);
  // Normalize UVs cleanly to [0..1] so the knitted "L" / "R" sits dead-center!
  const pos = geo.attributes.position;
  const uvArr = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    uvArr[i * 2] = px / (halfZ * 2) + 0.5;
    uvArr[i * 2 + 1] = py / (halfY * 2) + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  // Rotate so plate faces along -X (inner side of cup)
  geo.rotateY(-Math.PI * 0.5);
  return geo;
}

/**
 * Builds an annular superellipse ring (for magnetic attachment lip, inner bezel steps, structural frame)
 */
function createSuperellipseRingGeometry(
  outerZ: number,
  outerY: number,
  innerZ: number,
  innerY: number,
  depth: number,
  n = 2.65,
  segs = 64
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [z, y] = superellipsePoint(t, outerZ, outerY, n);
    if (i === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  }
  const hole = new THREE.Path();
  for (let i = segs; i >= 0; i--) {
    const t = (i / segs) * Math.PI * 2;
    const [z, y] = superellipsePoint(t, innerZ, innerY, n);
    if (i === segs) hole.moveTo(z, y);
    else hole.lineTo(z, y);
  }
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(Math.PI * 0.5);
  return geo;
}

/**
 * Builds the iconic AirPods Max headband:
 * - Twin curved silicone-wrapped stainless rails that flare wide across the top arch
 *   to suspend the breathable knit-mesh canopy, then merge smoothly into cylindrical sleeves
 * - True see-through perforated knit-mesh canopy stretched cleanly between the rails
 * - Polished mirror-chrome telescoping sleeves & curved stainless-steel stems
 */
function buildHeadbandAssembly(
  headbandMat: THREE.MeshStandardMaterial,
  canopyMat: THREE.MeshStandardMaterial,
  chromeMat: THREE.MeshPhysicalMaterial,
  canopyAnchor: THREE.Object3D,
  disposables: THREE.BufferGeometry[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'HeadbandAssembly';

  // Iconic AirPods Max arch path helper: t ∈ [-1, 1] from Left sleeve bottom to Right sleeve bottom
  const archPoint = (t: number, zSign: number): THREE.Vector3 => {
    const angle = t * Math.PI * 0.535; // slightly past 90° so legs curve gently inward at bottom
    const rx = 0.855;
    const ry = 0.885;
    const x = Math.sin(angle) * rx;
    const y = 0.56 + Math.cos(angle) * ry;

    // Width spread of the canopy rails: widest across crown apex (half-depth ≈ 0.145),
    // tapering smoothly into the cylindrical headband sleeves (half-depth → 0) near |t| > 0.62
    const canopySpread = Math.pow(Math.max(0, Math.cos(t * Math.PI * 0.78)), 1.35);
    const z = zSign * canopySpread * 0.155;
    return new THREE.Vector3(x, y, z);
  };

  // 1. Front & Back twin silicone-clad arch rails
  for (const zSign of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    const samples = 64;
    for (let i = 0; i <= samples; i++) {
      const t = -1 + (i / samples) * 2;
      pts.push(archPoint(t, zSign));
    }
    const curve = new THREE.CatmullRomCurve3(pts);

    // Variable-radius custom tube (thicker cylindrical sleeves near ends, sleek tapered rails across canopy!)
    const segU = 72;
    const segV = 18;
    const frames = curve.computeFrenetFrames(segU, false);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const t = -1 + u * 2;
      const absT = Math.abs(t);
      const center = curve.getPointAt(u);
      const N = frames.normals[iu];
      const B = frames.binormals[iu];

      // Sleek slender arch rail over the canopy (r ≈ 0.040), smoothly swelling into plush cylindrical sleeves (r ≈ 0.068)
      const sleeveBlend = THREE.MathUtils.smoothstep(absT, 0.52, 0.78);
      const radius = THREE.MathUtils.lerp(0.041, 0.068, sleeveBlend);

      for (let iv = 0; iv <= segV; iv++) {
        const v = iv / segV;
        const a = v * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const vx = center.x + (N.x * ca + B.x * sa) * radius;
        const vy = center.y + (N.y * ca + B.y * sa) * radius;
        const vz = center.z + (N.z * ca + B.z * sa) * radius;
        positions.push(vx, vy, vz);
        uvs.push(u * 4, v);
      }
    }

    const stride = segV + 1;
    for (let iu = 0; iu < segU; iu++) {
      for (let iv = 0; iv < segV; iv++) {
        const a = iu * stride + iv;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        // Outward-facing normals (+N = B x T) along Frenet tube frame
        indices.push(a, b, c, b, d, c);
      }
    }

    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    railGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    railGeo.setIndex(indices);
    railGeo.computeVertexNormals();
    disposables.push(railGeo);

    const railMesh = new THREE.Mesh(railGeo, headbandMat);
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    group.add(railMesh);
  }

  // 2. Suspended Breathable Perforated Knit-Mesh Canopy spanning seamlessly between front & rear rails
  const buildCanopySurface = () => {
    const segU = 64;
    const segV = 16;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const t = -0.66 + u * 1.32; // spans cleanly between the sleeve junctions
      const pFront = archPoint(t, 1);
      const pBack = archPoint(t, -1);

      for (let iv = 0; iv <= segV; iv++) {
        const v = iv / segV; // 0 = back rail, 1 = front rail
        const pos = new THREE.Vector3().lerpVectors(pBack, pFront, v);
        // Subtle convex hammock saddle dome along canopy center for organic tension
        const dome = Math.sin(v * Math.PI) * 0.022 * Math.cos(t * Math.PI * 0.72);
        // Offset gently along radial outward normal of the arch
        const angle = t * Math.PI * 0.535;
        pos.x += Math.sin(angle) * dome;
        pos.y += Math.cos(angle) * dome;

        positions.push(pos.x, pos.y, pos.z);
        uvs.push(u, v);
      }
    }

    const stride = segV + 1;
    for (let iu = 0; iu < segU; iu++) {
      for (let iv = 0; iv < segV; iv++) {
        const a = iu * stride + iv;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        // Outward-facing normals (+N = B x T) along Frenet tube frame
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    disposables.push(geo);

    const mesh = new THREE.Mesh(geo, canopyMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  group.add(buildCanopySurface());

  // Place canopy 3D anchor cleanly at top apex
  canopyAnchor.position.set(0, 1.44, 0);
  group.add(canopyAnchor);

  // 3. Left & Right Mirror-Chrome Sleeve Collars & Telescoping Stainless-Steel Arms
  for (const sideSign of [-1, 1]) {
    const sleeveEnd = archPoint(sideSign * 1.0, 0);
    const tangent = archPoint(sideSign * 1.0, 0)
      .sub(archPoint(sideSign * 0.96, 0))
      .normalize();

    // Precision mirror-chrome collar ring capping the bottom of the silicone headband sleeve
    const collarGeo = new THREE.CylinderGeometry(0.068, 0.066, 0.044, 32);
    disposables.push(collarGeo);
    const collar = new THREE.Mesh(collarGeo, chromeMat);
    collar.position.copy(sleeveEnd);
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tangent);
    collar.castShadow = true;
    group.add(collar);

    // Smooth curved telescoping stainless-steel rod descending into the ear cup pivot socket
    const stemStart = sleeveEnd.clone().addScaledVector(tangent, 0.01);
    const stemMid = new THREE.Vector3(sideSign * 0.835, 0.295, 0);
    const stemEnd = new THREE.Vector3(sideSign * 0.80, 0.145, 0);

    const stemCurve = new THREE.CatmullRomCurve3([stemStart, stemMid, stemEnd]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 28, 0.031, 24, false);
    disposables.push(stemGeo);
    const stem = new THREE.Mesh(stemGeo, chromeMat);
    stem.castShadow = true;
    group.add(stem);

    // Lower chrome ball-joint yoke collar entering the top cup recess
    const ballGeo = new THREE.SphereGeometry(0.041, 24, 24);
    disposables.push(ballGeo);
    const ball = new THREE.Mesh(ballGeo, chromeMat);
    ball.position.copy(stemEnd);
    group.add(ball);
  }

  return group;
}

/**
 * Builds the ultra-detailed Digital Crown (48 radial knurled ridges + chamfered top cap + recessed collar)
 */
function buildDigitalCrown(
  aluminumMat: THREE.MeshPhysicalMaterial,
  accentMat: THREE.MeshStandardMaterial,
  darkChromeMat: THREE.MeshStandardMaterial,
  disposables: THREE.BufferGeometry[]
): { root: THREE.Group; spinner: THREE.Group } {
  const root = new THREE.Group();
  root.name = 'DigitalCrownGroup';

  // Dark machined recessed socket ring flush in the aluminum shell
  const socketGeo = new THREE.TorusGeometry(0.067, 0.0085, 16, 48);
  socketGeo.rotateX(Math.PI * 0.5);
  disposables.push(socketGeo);
  const socket = new THREE.Mesh(socketGeo, darkChromeMat);
  socket.position.y = 0.004;
  root.add(socket);

  // Rotating dial assembly
  const spinner = new THREE.Group();
  spinner.name = 'DigitalCrownSpinner';
  root.add(spinner);

  // Main machined crown cylinder drum
  const drumGeo = new THREE.CylinderGeometry(0.059, 0.061, 0.042, 48);
  disposables.push(drumGeo);
  const drum = new THREE.Mesh(drumGeo, aluminumMat);
  drum.position.y = 0.021;
  drum.castShadow = true;
  spinner.add(drum);

  // Chamfered top crown ring
  const topBevelGeo = new THREE.TorusGeometry(0.0565, 0.0045, 14, 48);
  topBevelGeo.rotateX(Math.PI * 0.5);
  disposables.push(topBevelGeo);
  const topBevel = new THREE.Mesh(topBevelGeo, aluminumMat);
  topBevel.position.y = 0.0415;
  spinner.add(topBevel);

  // Subtle matte anodized top disc insert (authentic contrast visible in 1000227210.jpg!)
  const capGeo = new THREE.CylinderGeometry(0.053, 0.053, 0.004, 48);
  disposables.push(capGeo);
  const cap = new THREE.Mesh(capGeo, accentMat);
  cap.position.y = 0.0425;
  spinner.add(cap);

  // 48 individually instanced micro-knurled radial ridges around the perimeter!
  const knurlCount = 48;
  const ridgeGeo = new THREE.CylinderGeometry(0.0024, 0.0024, 0.036, 8);
  disposables.push(ridgeGeo);
  const knurls = new THREE.InstancedMesh(ridgeGeo, aluminumMat, knurlCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < knurlCount; i++) {
    const a = (i / knurlCount) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 0.0602, 0.021, Math.sin(a) * 0.0602);
    dummy.rotation.set(0, -a, 0);
    dummy.updateMatrix();
    knurls.setMatrixAt(i, dummy.matrix);
  }
  knurls.instanceMatrix.needsUpdate = true;
  knurls.castShadow = true;
  spinner.add(knurls);

  return { root, spinner };
}

/**
 * Builds the flush oval Noise Control pill button with crisp beveled seating
 */
function buildNoiseControlButton(
  aluminumMat: THREE.MeshPhysicalMaterial,
  darkChromeMat: THREE.MeshStandardMaterial,
  disposables: THREE.BufferGeometry[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'NoiseControlButton';

  const makePillShape = (halfLen: number, radius: number) => {
    const s = new THREE.Shape();
    s.absarc(-halfLen, 0, radius, Math.PI * 0.5, Math.PI * 1.5, false);
    s.absarc(halfLen, 0, radius, -Math.PI * 0.5, Math.PI * 0.5, false);
    s.closePath();
    return s;
  };

  // Recessed micro-gap dark bezel
  const bezelGeo = new THREE.ExtrudeGeometry(makePillShape(0.044, 0.024), {
    depth: 0.008,
    bevelEnabled: false,
    curveSegments: 20,
  });
  bezelGeo.rotateX(-Math.PI * 0.5);
  disposables.push(bezelGeo);
  const bezel = new THREE.Mesh(bezelGeo, darkChromeMat);
  group.add(bezel);

  // Flush beveled anodized aluminum button cap
  const btnGeo = new THREE.ExtrudeGeometry(makePillShape(0.038, 0.0185), {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.0045,
    bevelSize: 0.0035,
    bevelSegments: 4,
    curveSegments: 20,
  });
  btnGeo.rotateX(-Math.PI * 0.5);
  disposables.push(btnGeo);
  const btn = new THREE.Mesh(btnGeo, aluminumMat);
  btn.position.y = 0.004;
  btn.castShadow = true;
  group.add(btn);

  return group;
}

/**
 * Builds a single high-detail Ear Cup with all 5 interactive/exploded layers!
 * Constructed in canonical Right-Cup orientation (+X = outer aluminum dome, -X = ear cushion),
 * and mirrored cleanly for the Left Cup while keeping inner L/R acoustic meshes non-flipped.
 */
function buildEarCupAssembly(
  side: 'left' | 'right',
  materials: AirPodsMaxRig['materials'],
  textures: ProceduralTextureSuite,
  anchors: Record<string, THREE.Object3D>,
  disposables: THREE.BufferGeometry[]
): EarCupAssembly {
  const isRight = side === 'right';
  const sign = isRight ? 1 : -1;

  // Swivel pivot sits directly below the telescoping chrome stem ball-joint
  const swivelPivot = new THREE.Group();
  swivelPivot.name = `CupSwivel_${side}`;
  swivelPivot.position.set(sign * 0.80, 0.145, 0);

  // Resting inward ergonomic tilt (~18° inward V-taper matching 1000227209.jpg!)
  const tiltPivot = new THREE.Group();
  tiltPivot.name = `CupTilt_${side}`;
  tiltPivot.rotation.z = -sign * 0.305;
  swivelPivot.add(tiltPivot);

  // Cup center offset downward from top hinge pivot
  const cupOrigin = new THREE.Group();
  cupOrigin.position.set(0, -0.525, 0);
  // Mirror left cup cleanly around Y so local +X ALWAYS points outward and local -X points inward!
  if (!isRight) {
    cupOrigin.rotation.y = Math.PI;
  }
  tiltPivot.add(cupOrigin);

  // Shared internal technical materials (matte dark engineering polymers, brushed steel, copper flex, PCB)
  const internalBlackMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c21,
    roughness: 0.48,
    metalness: 0.25,
  });
  const internalDarkMatte = new THREE.MeshStandardMaterial({
    color: 0x121418,
    roughness: 0.68,
    metalness: 0.15,
  });
  const copperFlexMat = new THREE.MeshStandardMaterial({
    color: 0xc27a48,
    roughness: 0.28,
    metalness: 0.88,
  });
  const pcbMat = new THREE.MeshStandardMaterial({
    map: textures.pcbMap,
    roughnessMap: textures.pcbRoughness,
    roughness: 0.55,
    metalness: 0.35,
  });
  const driverConeMat = new THREE.MeshStandardMaterial({
    color: 0x22252b,
    roughness: 0.42,
    metalness: 0.3,
  });
  const neodymiumMat = new THREE.MeshPhysicalMaterial({
    color: 0xd0d5de,
    metalness: 0.96,
    roughness: 0.14,
  });

  // =========================================================================
  // LAYER 0: OUTER ANODIZED ALUMINUM SHELL + CONTROLS + INTERNAL CHASSIS RING
  // =========================================================================
  const shellLayer = new THREE.Group();
  shellLayer.name = `ShellLayer_${side}`;
  cupOrigin.add(shellLayer);

  const shellGeo = createAluminumShellGeometry();
  disposables.push(shellGeo);
  const shellMesh = new THREE.Mesh(shellGeo, materials.aluminum);
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  shellLayer.add(shellMesh);

  // Recessed glossy pivot-stem socket at the top apex of the aluminum shell
  const stemSocketGeo = new THREE.CylinderGeometry(0.056, 0.048, 0.032, 32);
  disposables.push(stemSocketGeo);
  const stemSocket = new THREE.Mesh(stemSocketGeo, materials.darkChrome);
  stemSocket.position.set(0.065, 0.505, 0);
  shellLayer.add(stemSocket);

  // Internal matte-black CNC structural frame & copper flex wire (revealed in Stage 6 Exploded View!)
  const chassisRingGeo = createSuperellipseRingGeometry(0.34, 0.45, 0.22, 0.33, 0.042, 2.65, 56);
  disposables.push(chassisRingGeo);
  const chassisRing = new THREE.Mesh(chassisRingGeo, internalBlackMat);
  chassisRing.position.set(0.06, 0, 0);
  shellLayer.add(chassisRing);

  const copperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.42, 0.02),
    new THREE.Vector3(0.09, 0.24, 0.25),
    new THREE.Vector3(0.09, -0.05, 0.27),
    new THREE.Vector3(0.08, -0.34, 0.18),
  ]);
  const copperGeo = new THREE.TubeGeometry(copperCurve, 32, 0.0085, 8, false);
  disposables.push(copperGeo);
  shellLayer.add(new THREE.Mesh(copperGeo, copperFlexMat));

  // Microphone acoustic slit helper (matches 1000227209.jpg & 1000227210.jpg!)
  const addMicSlit = (x: number, y: number, z: number, rx: number, ry: number, rz: number, len = 0.072) => {
    const slitGeo = new THREE.CapsuleGeometry(0.0085, len, 6, 12);
    disposables.push(slitGeo);
    const slit = new THREE.Mesh(slitGeo, materials.darkChrome);
    slit.position.set(x, y, z);
    slit.rotation.set(rx, ry, rz);
    shellLayer.add(slit);
  };

  // Upper-front mic slit (below Digital Crown on right cup, mirrored on left)
  addMicSlit(0.07, 0.315, isRight ? 0.342 : -0.342, 0.55 * sign, 0, 0, 0.055);
  // Lower-front twin acoustic mic vents
  addMicSlit(0.07, -0.37, isRight ? 0.312 : -0.312, -0.62 * sign, 0, 0, 0.065);
  addMicSlit(0.095, -0.455, isRight ? 0.205 : -0.205, -1.05 * sign, 0, 0, 0.042);
  // Rear upper mic vent
  addMicSlit(0.07, 0.29, isRight ? -0.346 : 0.346, -0.52 * sign, 0, 0, 0.052);

  let crownSpinner: THREE.Group | undefined;
  if (isRight) {
    // Bottom USB-C / Lightning port bezel + tiny status LED pinhole
    const portGeo = new THREE.CapsuleGeometry(0.015, 0.055, 8, 14);
    portGeo.rotateX(Math.PI * 0.5);
    disposables.push(portGeo);
    const port = new THREE.Mesh(portGeo, materials.darkChrome);
    port.position.set(0.085, -0.512, 0.0);
    shellLayer.add(port);

    const ledGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.01, 14);
    disposables.push(ledGeo);
    const led = new THREE.Mesh(ledGeo, materials.darkChrome);
    led.position.set(0.085, -0.511, 0.082);
    shellLayer.add(led);

    // Precision Digital Crown perched on the upper-front (+Z) shoulder of the right ear cup!
    const crown = buildDigitalCrown(
      materials.aluminum,
      materials.aluminumAccent,
      materials.darkChrome,
      disposables
    );
    crown.root.position.set(0.072, 0.468, 0.192);
    crown.root.rotation.set(0.42, 0, -0.14);
    shellLayer.add(crown.root);
    crownSpinner = crown.spinner;

    // 3D anchor socket locked directly to the top of the Digital Crown
    const crownAnchor = new THREE.Object3D();
    crownAnchor.position.set(0, 0.046, 0);
    crown.root.add(crownAnchor);
    anchors.crownAnchor = crownAnchor;

    // Precision Noise Control button on the upper-back (-Z) shoulder of the right ear cup!
    const noiseBtn = buildNoiseControlButton(
      materials.aluminum,
      materials.darkChrome,
      disposables
    );
    noiseBtn.position.set(0.074, 0.478, -0.185);
    noiseBtn.rotation.set(-0.38, Math.PI * 0.5, -0.10);
    shellLayer.add(noiseBtn);

    // 3D anchor socket locked directly to the Noise Control button
    const noiseBtnAnchor = new THREE.Object3D();
    noiseBtnAnchor.position.set(0, 0.022, 0);
    noiseBtn.add(noiseBtnAnchor);
    anchors.noiseBtnAnchor = noiseBtnAnchor;

    // Exploded View Anchor 0: Outer Aluminum Shell
    const expShellAnchor = new THREE.Object3D();
    expShellAnchor.position.set(0.24, 0.34, 0.0);
    shellLayer.add(expShellAnchor);
    anchors.explodedShellAnchor = expShellAnchor;
  }

  // =========================================================================
  // LAYER 1: INTERNAL H1 LOGIC BOARD, BATTERY CELLS & SENSOR ASSEMBLY
  // =========================================================================
  const electronicsLayer = new THREE.Group();
  electronicsLayer.name = `ElectronicsLayer_${side}`;
  cupOrigin.add(electronicsLayer);

  // Dual contoured black battery/enclosure modules (matching 1000227213.jpg!)
  const battLeftGeo = new THREE.BoxGeometry(0.068, 0.34, 0.145);
  disposables.push(battLeftGeo);
  const battLeft = new THREE.Mesh(battLeftGeo, internalBlackMat);
  battLeft.position.set(0.04, 0.04, 0.12);
  electronicsLayer.add(battLeft);

  const battRightGeo = new THREE.BoxGeometry(0.062, 0.25, 0.155);
  disposables.push(battRightGeo);
  const battRight = new THREE.Mesh(battRightGeo, internalDarkMatte);
  battRight.position.set(0.04, 0.02, -0.115);
  electronicsLayer.add(battRight);

  // Curved lower Apple H1 Logic Board PCB with gold traces & "H1" package
  const pcbGeo = new THREE.BoxGeometry(0.028, 0.26, 0.34);
  disposables.push(pcbGeo);
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  pcbMesh.position.set(0.015, -0.16, 0.0);
  electronicsLayer.add(pcbMesh);

  // Internal Digital Crown & Switch Actuator mechanism perched at top of electronics stack
  const actuatorGeo = new THREE.CylinderGeometry(0.042, 0.046, 0.065, 20);
  disposables.push(actuatorGeo);
  const act1 = new THREE.Mesh(actuatorGeo, materials.chrome);
  act1.position.set(0.035, 0.36, 0.13);
  electronicsLayer.add(act1);
  const act2 = new THREE.Mesh(actuatorGeo, internalBlackMat);
  act2.position.set(0.035, 0.34, -0.12);
  act2.scale.set(0.85, 0.85, 0.85);
  electronicsLayer.add(act2);

  // Flex cable harness connecting H1 board to top sensor cluster
  const flexCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, -0.26, 0.14),
    new THREE.Vector3(0.02, -0.32, 0.0),
    new THREE.Vector3(0.02, -0.25, -0.14),
    new THREE.Vector3(0.03, 0.26, -0.14),
  ]);
  const flexGeo = new THREE.TubeGeometry(flexCurve, 28, 0.012, 8, false);
  disposables.push(flexGeo);
  electronicsLayer.add(new THREE.Mesh(flexGeo, internalDarkMatte));

  if (isRight) {
    const expH1Anchor = new THREE.Object3D();
    expH1Anchor.position.set(0.02, -0.24, 0.0);
    electronicsLayer.add(expH1Anchor);
    anchors.explodedH1Anchor = expH1Anchor;
  }

  // =========================================================================
  // LAYER 2: 40MM CUSTOM DYNAMIC DRIVER & DUAL-NEODYMIUM RING MAGNET
  // =========================================================================
  const driverLayer = new THREE.Group();
  driverLayer.name = `DriverLayer_${side}`;
  cupOrigin.add(driverLayer);

  // Outer precision acoustic driver basket flange
  const basketGeo = new THREE.CylinderGeometry(0.245, 0.255, 0.032, 48);
  basketGeo.rotateZ(Math.PI * 0.5);
  disposables.push(basketGeo);
  const basket = new THREE.Mesh(basketGeo, internalBlackMat);
  basket.position.set(-0.015, 0, 0);
  driverLayer.add(basket);

  // Dual-neodymium machined metallic ring magnet housing (back of driver)
  const magnetGeo = new THREE.CylinderGeometry(0.145, 0.165, 0.058, 40);
  magnetGeo.rotateZ(Math.PI * 0.5);
  disposables.push(magnetGeo);
  const magnet = new THREE.Mesh(magnetGeo, neodymiumMat);
  magnet.position.set(0.02, 0, 0);
  driverLayer.add(magnet);

  // Pleated acoustic surround torus ring (front of 40mm driver)
  const surroundGeo = new THREE.TorusGeometry(0.188, 0.024, 18, 48);
  surroundGeo.rotateY(Math.PI * 0.5);
  disposables.push(surroundGeo);
  const surround = new THREE.Mesh(surroundGeo, driverConeMat);
  surround.position.set(-0.032, 0, 0);
  driverLayer.add(surround);

  // Custom acoustic diaphragm dome
  const domeGeo = new THREE.SphereGeometry(0.165, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.42);
  domeGeo.rotateZ(Math.PI * 0.5);
  domeGeo.scale(0.45, 1.0, 1.0);
  disposables.push(domeGeo);
  const dome = new THREE.Mesh(domeGeo, driverConeMat);
  dome.position.set(-0.024, 0, 0);
  driverLayer.add(dome);

  // Center metallic dust cap
  const dustCapGeo = new THREE.SphereGeometry(0.068, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
  dustCapGeo.rotateZ(Math.PI * 0.5);
  dustCapGeo.scale(0.35, 1.0, 1.0);
  disposables.push(dustCapGeo);
  const dustCap = new THREE.Mesh(dustCapGeo, neodymiumMat);
  dustCap.position.set(-0.044, 0, 0);
  driverLayer.add(dustCap);

  if (isRight) {
    const expDriverAnchor = new THREE.Object3D();
    expDriverAnchor.position.set(-0.015, 0.25, 0.0);
    driverLayer.add(expDriverAnchor);
    anchors.explodedDriverAnchor = expDriverAnchor;
  }

  // =========================================================================
  // LAYER 3: INNER ACOUSTIC BAFFLE, HONEYCOMB PERFORATED GRILLE & MAGNET PINS
  // =========================================================================
  const baffleLayer = new THREE.Group();
  baffleLayer.name = `BaffleLayer_${side}`;
  cupOrigin.add(baffleLayer);

  // Main matte sculpted baffle mounting plate (visible immediately when cushion detaches in Stage 5!)
  const bafflePlateGeo = createSuperellipsePlateGeometry(0.355, 0.465, 2.65, 64);
  disposables.push(bafflePlateGeo);
  const bafflePlate = new THREE.Mesh(bafflePlateGeo, materials.baffleMat);
  bafflePlate.position.set(-0.036, 0, 0);
  bafflePlate.receiveShadow = true;
  baffleLayer.add(bafflePlate);

  // Raised molded perimeter magnetic collar ring (sits cleanly inside aluminum rim)
  const baffleLipGeo = createSuperellipseRingGeometry(0.362, 0.472, 0.265, 0.365, 0.045, 2.65, 64);
  disposables.push(baffleLipGeo);
  const baffleLip = new THREE.Mesh(baffleLipGeo, materials.baffleMat);
  baffleLip.position.set(-0.024, 0, 0);
  baffleLayer.add(baffleLip);

  // Recessed inner speaker cavity wall (molded acoustic chamber)
  const chamberGeo = createSuperellipseRingGeometry(0.27, 0.37, 0.22, 0.31, 0.072, 2.65, 56);
  disposables.push(chamberGeo);
  const chamber = new THREE.Mesh(chamberGeo, internalBlackMat);
  chamber.position.set(0.015, 0, 0);
  baffleLayer.add(chamber);

  // Authentic Honeycomb Perforated Speaker Grille (~59 circular dark apertures matching 1000227217.jpg!)
  const holePositions: [number, number][] = [];
  const spacing = 0.052;
  for (let row = -5; row <= 5; row++) {
    const y = row * spacing * 0.866;
    const cols = 4;
    for (let col = -cols; col <= cols; col++) {
      const z = (col + (Math.abs(row) % 2 === 1 ? 0.5 : 0)) * spacing;
      // Keep holes neatly inside an oval stadium footprint
      const norm = Math.pow(Math.abs(z) / 0.168, 2.4) + Math.pow(Math.abs(y) / 0.245, 2.4);
      if (norm <= 0.96) {
        holePositions.push([z, y]);
      }
    }
  }
  const holeGeo = new THREE.CylinderGeometry(0.0165, 0.0165, 0.012, 16);
  holeGeo.rotateZ(Math.PI * 0.5);
  disposables.push(holeGeo);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x090a0d });
  const holesMesh = new THREE.InstancedMesh(holeGeo, holeMat, holePositions.length);
  const dummy = new THREE.Object3D();
  holePositions.forEach(([z, y], idx) => {
    dummy.position.set(-0.039, y, z);
    dummy.updateMatrix();
    holesMesh.setMatrixAt(idx, dummy.matrix);
  });
  holesMesh.instanceMatrix.needsUpdate = true;
  baffleLayer.add(holesMesh);

  // 4 Precision Magnetic Alignment Pins + Optical Ear-Detection Sensor Window around the baffle flange
  const pinGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.016, 14);
  pinGeo.rotateZ(Math.PI * 0.5);
  disposables.push(pinGeo);
  const pinCoords: [number, number][] = [
    [0.21, 0.34],
    [-0.21, 0.34],
    [0.21, -0.34],
    [-0.21, -0.34],
  ];
  pinCoords.forEach(([z, y]) => {
    const pin = new THREE.Mesh(pinGeo, materials.chrome);
    pin.position.set(-0.044, y, z);
    baffleLayer.add(pin);
  });

  // Glossy black optical position sensor pill inside the baffle rim
  const optGeo = new THREE.CapsuleGeometry(0.012, 0.042, 6, 12);
  disposables.push(optGeo);
  const optSensor = new THREE.Mesh(optGeo, materials.darkChrome);
  optSensor.position.set(-0.041, 0.0, 0.218);
  baffleLayer.add(optSensor);

  if (isRight) {
    const expBaffleAnchor = new THREE.Object3D();
    expBaffleAnchor.position.set(-0.04, -0.32, 0.0);
    baffleLayer.add(expBaffleAnchor);
    anchors.explodedBaffleAnchor = expBaffleAnchor;
  }

  // =========================================================================
  // LAYER 4: MAGNETIC KNIT-MESH MEMORY-FOAM EAR CUSHION + INNER "L"/"R" MESH
  // =========================================================================
  const cushionLayer = new THREE.Group();
  cushionLayer.name = `CushionLayer_${side}`;
  cupOrigin.add(cushionLayer);

  const cushionGeo = createEarCushionGeometry();
  disposables.push(cushionGeo);
  const cushionMesh = new THREE.Mesh(cushionGeo, materials.cushionFabric);
  cushionMesh.position.set(-0.025, 0, 0);
  cushionMesh.castShadow = true;
  cushionMesh.receiveShadow = true;
  cushionLayer.add(cushionMesh);

  // Inner recessed acoustic mesh plate displaying the subtle darker-weave knitted "L" / "R"!
  const innerMeshGeo = createSuperellipsePlateGeometry(0.24, 0.335, 2.55, 56);
  disposables.push(innerMeshGeo);
  const innerMat = isRight ? materials.innerMeshR : materials.innerMeshL;
  const innerMeshPlate = new THREE.Mesh(innerMeshGeo, innerMat);
  innerMeshPlate.position.set(-0.072, 0, 0);
  // Flip UV horizontally on mirrored left cup so "L" reads right-way-round!
  if (!isRight) {
    innerMeshPlate.scale.set(1, 1, -1);
  }
  cushionLayer.add(innerMeshPlate);

  // Back-side magnetic attachment flange ring (clearly visible in Stage 5 detach & Stage 6 exploded view!)
  const magFlangeGeo = createSuperellipseRingGeometry(0.355, 0.465, 0.23, 0.33, 0.022, 2.62, 64);
  disposables.push(magFlangeGeo);
  const magFlange = new THREE.Mesh(magFlangeGeo, internalBlackMat);
  magFlange.position.set(-0.022, 0, 0);
  cushionLayer.add(magFlange);

  // Inner acoustic bridge back-plate of cushion (matches the sculpted rear of cushion in 1000227213.jpg)
  const backBridgeGeo = createSuperellipsePlateGeometry(0.235, 0.335, 2.55, 52);
  backBridgeGeo.rotateY(Math.PI); // face +X (toward baffle)
  disposables.push(backBridgeGeo);
  const backBridge = new THREE.Mesh(backBridgeGeo, materials.cushionFabric);
  backBridge.position.set(-0.056, 0, 0);
  cushionLayer.add(backBridge);

  if (isRight) {
    const expCushionAnchor = new THREE.Object3D();
    expCushionAnchor.position.set(-0.22, 0.26, 0.0);
    cushionLayer.add(expCushionAnchor);
    anchors.explodedCushionAnchor = expCushionAnchor;

    const cushionMeshAnchor = new THREE.Object3D();
    cushionMeshAnchor.position.set(-0.08, 0.0, 0.0);
    cushionLayer.add(cushionMeshAnchor);
    anchors.cushionMeshAnchor = cushionMeshAnchor;
  }

  return {
    side,
    swivelPivot,
    tiltPivot,
    shellLayer,
    electronicsLayer,
    driverLayer,
    baffleLayer,
    cushionLayer,
    crownSpinner,
  };
}

export function createAirPodsMaxRig(
  textures: ProceduralTextureSuite,
  initialColorway: ColorwaySpec
): AirPodsMaxRig {
  const root = new THREE.Group();
  root.name = 'AirPodsMaxShowcaseRoot';

  const headsetGroup = new THREE.Group();
  headsetGroup.name = 'AirPodsMaxHeadset';
  root.add(headsetGroup);

  const disposables: THREE.BufferGeometry[] = [];
  const anchors: Record<string, THREE.Object3D> = {};

  // =========================================================================
  // PHYSICALLY-BASED MATERIALS (REAL-TIME COLORWAY INTERPOLATION READY)
  // =========================================================================
  const aluminum = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialColorway.aluminum),
    metalness: 0.92,
    roughness: 0.24,
    roughnessMap: textures.aluminumRoughness,
    normalMap: textures.aluminumNormal,
    normalScale: new THREE.Vector2(0.14, 0.14),
    clearcoat: 0.12,
    clearcoatRoughness: 0.35,
    envMapIntensity: 1.35,
  });

  const aluminumAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.aluminumAccent),
    metalness: 0.82,
    roughness: 0.36,
    normalMap: textures.aluminumNormal,
    normalScale: new THREE.Vector2(0.1, 0.1),
  });

  const chrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xf4f6fa),
    metalness: 1.0,
    roughness: 0.05,
    clearcoat: 0.3,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.65,
  });

  const darkChrome = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x16181d),
    metalness: 0.85,
    roughness: 0.22,
  });

  const headbandSilicone = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.headbandSilicone),
    metalness: 0.03,
    roughness: 0.58,
    normalMap: textures.smartCaseNormal,
    normalScale: new THREE.Vector2(0.08, 0.08),
  });

  const canopyMesh = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.canopyMesh),
    map: textures.canopyMap,
    normalMap: textures.canopyNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    alphaMap: textures.canopyAlpha,
    transparent: true,
    alphaTest: 0.38,
    roughness: 0.82,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const cushionFabric = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.cushionFabric),
    map: textures.cushionMap,
    normalMap: textures.cushionNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.cushionRoughness,
    roughness: 0.9,
    metalness: 0.02,
  });

  const innerMeshL = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.innerAcousticMesh),
    map: textures.innerMeshL,
    normalMap: textures.innerMeshNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const innerMeshR = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.innerAcousticMesh),
    map: textures.innerMeshR,
    normalMap: textures.innerMeshNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const baffleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialColorway.baffleTone),
    metalness: 0.35,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });

  const materials = {
    aluminum,
    aluminumAccent,
    chrome,
    darkChrome,
    headbandSilicone,
    canopyMesh,
    cushionFabric,
    innerMeshL,
    innerMeshR,
    baffleMat,
  };

  // Build Headband + Suspended Perforated Canopy + Chrome Telescoping Arms
  const canopyAnchor = new THREE.Object3D();
  anchors.canopyAnchor = canopyAnchor;
  const headband = buildHeadbandAssembly(
    headbandSilicone,
    canopyMesh,
    chrome,
    canopyAnchor,
    disposables
  );
  headsetGroup.add(headband);

  // Build Left & Right Ear Cup Assemblies
  const leftCup = buildEarCupAssembly('left', materials, textures, anchors, disposables);
  const rightCup = buildEarCupAssembly('right', materials, textures, anchors, disposables);
  headsetGroup.add(leftCup.swivelPivot, rightCup.swivelPivot);

  // Center headset vertically around Y = 0
  headsetGroup.position.set(0, -0.18, 0);

  // Build Color-Matched Smart Case (initially parked softly below frame, rises cleanly in Stage 7)
  const smartCase = createSmartCase(textures);
  smartCase.root.scale.set(1.0, 0.92, 1.0);
  smartCase.root.position.set(0, -4.2, 0);
  smartCase.root.visible = false;
  root.add(smartCase.root);

  // Subtle Real-Time Studio Contact Shadow Plane beneath the headset
  const shadowGeo = new THREE.PlaneGeometry(3.8, 2.6);
  shadowGeo.rotateX(-Math.PI * 0.5);
  disposables.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.set(0, -1.26, 0);
  root.add(contactShadow);

  // Pre-allocated temp colors for zero-GC 60fps PBR colorway morphing
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  const lerpMatColor = (mat: { color: THREE.Color }, hexA: string, hexB: string, t: number) => {
    tmpA.set(hexA);
    tmpB.set(hexB);
    mat.color.copy(tmpA).lerp(tmpB, t);
  };

  const applyBlendedColorway = (a: ColorwaySpec, b: ColorwaySpec, t: number) => {
    lerpMatColor(aluminum, a.aluminum, b.aluminum, t);
    lerpMatColor(aluminumAccent, a.aluminumAccent, b.aluminumAccent, t);
    lerpMatColor(headbandSilicone, a.headbandSilicone, b.headbandSilicone, t);
    lerpMatColor(canopyMesh, a.canopyMesh, b.canopyMesh, t);
    lerpMatColor(cushionFabric, a.cushionFabric, b.cushionFabric, t);
    lerpMatColor(innerMeshL, a.innerAcousticMesh, b.innerAcousticMesh, t);
    lerpMatColor(innerMeshR, a.innerAcousticMesh, b.innerAcousticMesh, t);
    lerpMatColor(baffleMat, a.baffleTone, b.baffleTone, t);
    lerpMatColor(smartCase.outerMaterial, a.smartCaseOuter, b.smartCaseOuter, t);
    lerpMatColor(smartCase.innerMaterial, a.smartCaseInner, b.smartCaseInner, t);
  };

  const setCrownRotation = (radians: number) => {
    if (rightCup.crownSpinner) {
      rightCup.crownSpinner.rotation.y = radians;
    }
  };

  // Stage 5: Both magnetic ear cushions unseat cleanly along their local inward normals (-X in cupOrigin)
  let currentDetach = 0;
  let currentExplode = 0;

  const updateLayerOffsets = () => {
    // Combine Stage 5 magnetic cushion detach with Stage 6 full 5-layer horizontal explosion
    const e = currentExplode;
    const d = currentDetach;

    // Right cup (Hero exploded cup — spreads into dramatic 5-layer Apple engineering stack!)
    rightCup.shellLayer.position.x = e * 0.62;
    rightCup.electronicsLayer.position.x = e * 0.24;
    rightCup.driverLayer.position.x = -e * 0.14;
    rightCup.baffleLayer.position.x = -e * 0.52;
    rightCup.cushionLayer.position.x = -(d * 0.44 + e * 0.96);

    // Subtle synchronized detach/separation on Left cup as well
    leftCup.shellLayer.position.x = e * 0.12;
    leftCup.electronicsLayer.position.x = e * 0.04;
    leftCup.driverLayer.position.x = -e * 0.04;
    leftCup.baffleLayer.position.x = -e * 0.10;
    leftCup.cushionLayer.position.x = -(d * 0.44 + e * 0.18);

    // Subtle lift on cushions during Stage 5 detach so the magnetic snap feels physically alive
    rightCup.cushionLayer.position.y = d * 0.04;
    leftCup.cushionLayer.position.y = d * 0.04;
  };

  const setCushionDetach = (amount01: number) => {
    currentDetach = Math.max(0, Math.min(1, amount01));
    updateLayerOffsets();
  };

  const setExplodeAmount = (amount01: number) => {
    currentExplode = Math.max(0, Math.min(1, amount01));
    updateLayerOffsets();
  };

  // Stage 7: Swivel both ear cups flat (90°) so aluminum domes face forward (+Z) and slide into the Smart Case!
  const setCupSwivelForCase = (swivel01: number) => {
    const s = Math.max(0, Math.min(1, swivel01));
    // Right cup (+X) rotates -90° around Y so +X outer aluminum faces +Z front!
    // Left cup (-X) rotates +90° around Y so -X outer aluminum faces +Z front!
    rightCup.swivelPivot.rotation.y = -s * Math.PI * 0.5;
    leftCup.swivelPivot.rotation.y = s * Math.PI * 0.5;

    // Flatten ergonomic inward tilt so both cups nestle snugly side-by-side inside the twin-lobe Smart Case
    rightCup.tiltPivot.rotation.z = -THREE.MathUtils.lerp(0.305, 0.055, s);
    leftCup.tiltPivot.rotation.z = THREE.MathUtils.lerp(0.305, 0.055, s);

    // Gently draw cups slightly inward along X as they swivel flat so they fit the exact twin-lobe contour
    rightCup.swivelPivot.position.x = THREE.MathUtils.lerp(0.80, 0.53, s);
    leftCup.swivelPivot.position.x = -THREE.MathUtils.lerp(0.80, 0.53, s);
  };

  return {
    root,
    headsetGroup,
    leftCup,
    rightCup,
    smartCase,
    contactShadow,
    anchors,
    materials,
    applyBlendedColorway,
    setCrownRotation,
    setCushionDetach,
    setExplodeAmount,
    setCupSwivelForCase,
    dispose: () => {
      disposables.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      shadowMat.dispose();
      smartCase.dispose();
    },
  };
}
