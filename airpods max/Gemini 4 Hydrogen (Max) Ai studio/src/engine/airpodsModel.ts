import * as THREE from 'three';
import { AIRPODS_COLORWAYS, type AirPodsColorway } from '../data/airpodsSpec';
import type { ChoreographyState } from './choreography';
import type { ProceduralTexturePack } from './textures';

export interface AirPodsAnchors {
  crown: THREE.Object3D;
  noiseButton: THREE.Object3D;
  micSlit: THREE.Object3D;
  expShell: THREE.Object3D;
  expElectronics: THREE.Object3D;
  expDriver: THREE.Object3D;
  expBaffle: THREE.Object3D;
  expCushion: THREE.Object3D;
}

export interface AirPodsRig {
  root: THREE.Group;
  headsetGroup: THREE.Group;
  smartCaseGroup: THREE.Group;
  smartCaseFlapPivot: THREE.Group;
  leftCupSwivel: THREE.Group;
  rightCupSwivel: THREE.Group;
  crownSpinGroup: THREE.Group;
  anchors: AirPodsAnchors;
  applyColorway: (target: AirPodsColorway, blendAlpha: number) => void;
  applyChoreography: (state: ChoreographyState) => void;
  dispose: () => void;
}

/**
 * Evaluates a smooth squircle (superellipse) radial distance for angle theta.
 */
function squirclePoint(
  theta: number,
  rx: number,
  ry: number,
  exponent = 3.2,
): { x: number; y: number } {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const sgnX = ct >= 0 ? 1 : -1;
  const sgnY = st >= 0 ? 1 : -1;
  const ax = Math.abs(ct);
  const ay = Math.abs(st);
  const denom = Math.pow(Math.pow(ax, exponent) + Math.pow(ay, exponent), 1 / exponent);
  return {
    x: (sgnX * ax * rx) / denom,
    y: (sgnY * ay * ry) / denom,
  };
}

/**
 * Builds the iconic rounded-rectangle (squircle) anodized aluminum ear cup shell
 * as a continuous parametric surface with smooth domed outer face and chamfered inner lip.
 * Cup lies in YZ plane (height along Y, depth along Z), facing outward along +X (thickness along X).
 */
function createSquircleCupShellGeometry(
  rx = 0.34,
  ry = 0.44,
  depth = 0.21,
  dir: 1 | -1 = 1,
): THREE.BufferGeometry {
  const uSegs = 72;
  const vSegs = 28;

  // Profile curve from outer center (rScale=0, x=depth) -> rim -> inner lip (rScale=0.84, x=0)
  const profile: { rScale: number; x: number }[] = [];
  for (let i = 0; i <= vSegs; i++) {
    const t = i / vSegs;
    if (t < 0.42) {
      const s = t / 0.42;
      const rScale = s * 0.88;
      const dome = Math.cos(s * Math.PI * 0.5);
      const x = depth * (0.86 + 0.14 * dome);
      profile.push({ rScale, x });
    } else if (t < 0.72) {
      const s = (t - 0.42) / 0.30;
      const angle = s * Math.PI * 0.5;
      const rScale = 0.88 + 0.12 * Math.sin(angle);
      const x = depth * (0.50 + 0.36 * Math.cos(angle));
      profile.push({ rScale, x });
    } else if (t < 0.92) {
      const s = (t - 0.72) / 0.20;
      const rScale = 1.0 - 0.03 * s;
      const x = depth * (0.50 * (1 - s));
      profile.push({ rScale, x });
    } else {
      const s = (t - 0.92) / 0.08;
      const rScale = 0.97 - 0.13 * s;
      const x = 0.014 * Math.sin(s * Math.PI * 0.5);
      profile.push({ rScale, x });
    }
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= vSegs; iv++) {
    const { rScale, x } = profile[iv];
    const vCoord = iv / vSegs;
    for (let iu = 0; iu <= uSegs; iu++) {
      const theta = (iu / uSegs) * Math.PI * 2;
      const sq = squirclePoint(theta, rx, ry, 3.2);
      const py = sq.y * rScale;
      const pz = sq.x * rScale;
      positions.push(x * dir, py, pz);
      uvs.push(iu / uSegs, vCoord);
    }
  }

  const stride = uSegs + 1;
  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      if (dir === 1) {
        // Outward normal (+X on outer dome)
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        // Mirrored (-X on outer dome)
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds the plush contoured squircle torus memory-foam ear cushion.
 * Lies in YZ plane, extending inward along -X (from x=0 down to x=-cushionDepth).
 */
function createSquircleCushionGeometry(
  rx = 0.34,
  ry = 0.44,
  tubeRx = 0.092,
  tubeDepth = 0.145,
  dir: 1 | -1 = 1,
): THREE.BufferGeometry {
  const uSegs = 72;
  const vSegs = 28;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ringRx = rx - tubeRx * 0.72;
  const ringRy = ry - tubeRx * 0.72;

  for (let iu = 0; iu <= uSegs; iu++) {
    const theta = (iu / uSegs) * Math.PI * 2;
    const center = squirclePoint(theta, ringRx, ringRy, 3.2);
    const next = squirclePoint(theta + 0.01, ringRx, ringRy, 3.2);
    const prev = squirclePoint(theta - 0.01, ringRx, ringRy, 3.2);
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tLen = Math.hypot(tx, ty) || 1;
    const outZ = ty / tLen;
    const outY = -tx / tLen;

    for (let iv = 0; iv <= vSegs; iv++) {
      const phi = (iv / vSegs) * Math.PI * 2;
      const radial = Math.cos(phi) * tubeRx;
      // Slight overlap (+0.012) into aluminum lip so cushion seats flush with zero air gap
      const axial = (Math.sin(phi) - 0.76) * 0.5 * tubeDepth;

      const py = center.y + outY * radial;
      const pz = center.x + outZ * radial;
      const px = axial * dir;

      positions.push(px, py, pz);
      uvs.push(iu / uSegs, iv / vSegs);
    }
  }

  const stride = vSegs + 1;
  for (let iu = 0; iu < uSegs; iu++) {
    for (let iv = 0; iv < vSegs; iv++) {
      const a = iu * stride + iv;
      const b = a + 1;
      const c = (iu + 1) * stride + iv;
      const d = c + 1;
      if (dir === 1) {
        indices.push(a, c, b);
        indices.push(b, c, d);
      } else {
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds a flat squircle plate in the YZ plane facing inward (-dir along X),
 * with upright UVs so "L" and "R" text always reads upright.
 */
function createSquirclePlateGeometry(
  rx: number,
  ry: number,
  dir: 1 | -1 = 1,
  segments = 48,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const p = squirclePoint(theta, rx, ry, 3.2);
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  }
  const geom = new THREE.ShapeGeometry(shape, 1);
  const pos = geom.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const rawU = pos.getX(i) / (rx * 2) + 0.5;
    uvs[i * 2] = dir === 1 ? 1 - rawU : rawU;
    uvs[i * 2 + 1] = pos.getY(i) / (ry * 2) + 0.5;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  // Face -X for Right Cup (dir = 1) or +X for Left Cup (dir = -1)
  geom.rotateY(dir === 1 ? -Math.PI / 2 : Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds a hollow squircle ring (magnetic cushion mounting flange) so the inner L/R scrim stays completely unobstructed.
 */
function createSquircleRingGeometry(
  outerRx: number,
  outerRy: number,
  innerRx: number,
  innerRy: number,
  dir: 1 | -1 = 1,
  segments = 48,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const p = squirclePoint(theta, outerRx, outerRy, 3.2);
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  }
  const hole = new THREE.Path();
  for (let i = segments; i >= 0; i--) {
    const theta = (i / segments) * Math.PI * 2;
    const p = squirclePoint(theta, innerRx, innerRy, 3.2);
    if (i === segments) hole.moveTo(p.x, p.y);
    else hole.lineTo(p.x, p.y);
  }
  shape.holes.push(hole);

  const geom = new THREE.ShapeGeometry(shape, 1);
  geom.rotateY(dir === 1 ? -Math.PI / 2 : Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds the curved breathable knit-mesh canopy spanning smoothly between the front & back headband rails.
 */
function createHeadbandCanopyGeometry(
  frontCurve: THREE.Curve<THREE.Vector3>,
  backCurve: THREE.Curve<THREE.Vector3>,
  uSegs = 48,
  vSegs = 10,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iu = 0; iu <= uSegs; iu++) {
    const u = iu / uSegs;
    const pf = frontCurve.getPointAt(u);
    const pb = backCurve.getPointAt(u);
    // Subtle downward hammock sag in the middle of the canopy
    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs;
      const x = THREE.MathUtils.lerp(pf.x, pb.x, v);
      const yBase = THREE.MathUtils.lerp(pf.y, pb.y, v);
      const z = THREE.MathUtils.lerp(pf.z, pb.z, v);
      const archFactor = Math.sin(u * Math.PI);
      const sag = Math.sin(v * Math.PI) * 0.018 * archFactor;
      positions.push(x, yBase - sag, z);
      uvs.push(u, v);
    }
  }

  const stride = vSegs + 1;
  for (let iu = 0; iu < uSegs; iu++) {
    for (let iv = 0; iv < vSegs; iv++) {
      const a = iu * stride + iv;
      const b = a + 1;
      const c = (iu + 1) * stride + iv;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds the contoured Smart Case outer body with exact symmetrical crescent cutouts at the bottom
 * where the anodized aluminum ear cups peek through (`1000227208.jpg`).
 */
function createSmartCaseShellGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Contoured Smart Case enveloping swiveled ear cups with symmetrical bottom crescent cutouts
  shape.moveTo(-1.04, 0.04);
  shape.bezierCurveTo(-1.04, 0.34, -0.78, 0.48, -0.44, 0.48);
  shape.lineTo(0.44, 0.48);
  shape.bezierCurveTo(0.78, 0.48, 1.04, 0.34, 1.04, 0.04);
  shape.bezierCurveTo(1.01, -0.28, 0.78, -0.52, 0.46, -0.52);
  // Right cup bottom crescent arc peeking out
  shape.bezierCurveTo(0.24, -0.52, 0.09, -0.34, 0.0, -0.25);
  // Center seam dip
  shape.bezierCurveTo(-0.09, -0.34, -0.24, -0.52, -0.46, -0.52);
  shape.bezierCurveTo(-0.78, -0.52, -1.01, -0.28, -1.04, 0.04);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.40,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 2,
    bevelSize: 0.05,
    bevelThickness: 0.055,
    curveSegments: 32,
  });
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

function createSmartCaseFlapGeometry(): THREE.BufferGeometry {
  const w = 0.84;
  const h = 0.46;
  const r = 0.15;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, -(h - r));
  shape.quadraticCurveTo(w / 2, -h, w / 2 - r, -h);
  shape.lineTo(-w / 2 + r, -h);
  shape.quadraticCurveTo(-w / 2, -h, -w / 2, -(h - r));
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    curveSegments: 20,
  });
  geom.computeVertexNormals();
  return geom;
}

function createPillButtonGeometry(length = 0.092, width = 0.042, depth = 0.024): THREE.BufferGeometry {
  const r = width / 2;
  const half = (length - width) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, r);
  shape.lineTo(half, r);
  shape.absarc(half, 0, r, Math.PI / 2, -Math.PI / 2, true);
  shape.lineTo(-half, -r);
  shape.absarc(-half, 0, r, -Math.PI / 2, Math.PI / 2, true);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.005,
    bevelThickness: 0.006,
    curveSegments: 16,
  });
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

export function buildAirPodsMaxRig(
  textures: ProceduralTexturePack,
  initialColorway: AirPodsColorway = AIRPODS_COLORWAYS[0],
): AirPodsRig {
  const disposables: { dispose: () => void }[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // --- Shared PBR Materials ---
  const aluminumMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialColorway.aluminum),
      metalness: 0.92,
      roughness: 0.25,
      roughnessMap: textures.aluminumRoughness,
      normalMap: textures.aluminumNormal,
      normalScale: new THREE.Vector2(0.18, 0.18),
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.25,
    }),
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f4f6f9'),
      metalness: 1.0,
      roughness: 0.06,
      envMapIntensity: 1.45,
    }),
  );

  const headbandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColorway.headband),
      metalness: 0.04,
      roughness: 0.62,
      normalMap: textures.smartCaseNormal,
      normalScale: new THREE.Vector2(0.12, 0.12),
    }),
  );

  const canopyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialColorway.canopy),
      map: textures.canopyColorAo,
      alphaMap: textures.canopyAlpha,
      normalMap: textures.canopyNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.86,
      metalness: 0.0,
      sheen: 0.5,
      sheenRoughness: 0.75,
    }),
  );

  const cushionMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialColorway.cushion),
      map: textures.cushionColorAo,
      normalMap: textures.cushionNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: textures.cushionRoughness,
      roughness: 0.92,
      metalness: 0.0,
      sheen: 0.65,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color('#ffffff'),
    }),
  );

  const innerMeshLMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColorway.innerMesh),
      map: textures.innerMeshL,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
  );

  const innerMeshRMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColorway.innerMesh),
      map: textures.innerMeshR,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
  );

  const bafflePlateMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      map: textures.baffleColor,
      normalMap: textures.baffleNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.56,
      metalness: 0.14,
      side: THREE.DoubleSide,
    }),
  );

  const darkChassisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1c1e22'),
      roughness: 0.45,
      metalness: 0.25,
    }),
  );

  const matteChamberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColorway.baffleRing),
      roughness: 0.58,
      metalness: 0.12,
    }),
  );

  const copperTraceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b87946'),
      metalness: 0.85,
      roughness: 0.28,
    }),
  );

  const pcbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      map: textures.pcbColor,
      roughness: 0.42,
      metalness: 0.35,
    }),
  );

  const driverConeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      map: textures.driverConeColor,
      normalMap: textures.driverConeNormal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.48,
      metalness: 0.18,
      side: THREE.DoubleSide,
    }),
  );

  const smartCaseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColorway.smartCase),
      normalMap: textures.smartCaseNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughness: 0.78,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
    }),
  );

  const smartCaseLiningMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2a2c31'),
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
    }),
  );

  // --- Root Scene Hierarchy ---
  const root = new THREE.Group();
  const headsetGroup = new THREE.Group();
  root.add(headsetGroup);

  // --- 1. Headband Assembly ---
  const headbandGroup = new THREE.Group();
  headsetGroup.add(headbandGroup);

  // Front & back structural arch rails that converge cleanly into the left/right sleeves
  const frontRailPts = [
    new THREE.Vector3(-0.73, 0.31, 0.015),
    new THREE.Vector3(-0.68, 0.56, 0.055),
    new THREE.Vector3(-0.46, 0.81, 0.135),
    new THREE.Vector3(0.0, 0.92, 0.16),
    new THREE.Vector3(0.46, 0.81, 0.135),
    new THREE.Vector3(0.68, 0.56, 0.055),
    new THREE.Vector3(0.73, 0.31, 0.015),
  ];
  const backRailPts = frontRailPts.map((v) => new THREE.Vector3(v.x, v.y, -v.z));

  const frontRailCurve = new THREE.CatmullRomCurve3(frontRailPts);
  const backRailCurve = new THREE.CatmullRomCurve3(backRailPts);

  const frontRailGeo = trackGeo(new THREE.TubeGeometry(frontRailCurve, 64, 0.036, 18, false));
  const backRailGeo = trackGeo(new THREE.TubeGeometry(backRailCurve, 64, 0.036, 18, false));
  const frontRailMesh = new THREE.Mesh(frontRailGeo, headbandMat);
  const backRailMesh = new THREE.Mesh(backRailGeo, headbandMat);
  frontRailMesh.castShadow = true;
  backRailMesh.castShadow = true;
  headbandGroup.add(frontRailMesh, backRailMesh);

  // Lower padded sleeve wraps merging both rails into a single solid grip on left & right
  [-1, 1].forEach((side) => {
    const sleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.73, 0.30, 0),
      new THREE.Vector3(side * 0.70, 0.46, 0),
      new THREE.Vector3(side * 0.64, 0.62, 0),
    ]);
    const sleeveGeo = trackGeo(new THREE.TubeGeometry(sleeveCurve, 24, 0.054, 20, false));
    const sleeveMesh = new THREE.Mesh(sleeveGeo, headbandMat);
    sleeveMesh.castShadow = true;
    headbandGroup.add(sleeveMesh);

    // Chrome collar ring at base of headband sleeve
    const collarGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.052, 0.048, 32));
    const collarMesh = new THREE.Mesh(collarGeo, chromeMat);
    collarMesh.position.set(side * 0.733, 0.285, 0);
    collarMesh.rotation.z = side * -0.14;
    collarMesh.castShadow = true;
    headbandGroup.add(collarMesh);

    // Mirror-polished telescoping stainless steel arm
    const armGeo = trackGeo(new THREE.CylinderGeometry(0.023, 0.023, 0.16, 24));
    const armMesh = new THREE.Mesh(armGeo, chromeMat);
    armMesh.position.set(side * 0.742, 0.195, 0);
    armMesh.rotation.z = side * -0.09;
    armMesh.castShadow = true;
    headbandGroup.add(armMesh);
  });

  // Breathable open-knit canopy mesh spanning between the front & back rails
  const canopyGeo = trackGeo(createHeadbandCanopyGeometry(frontRailCurve, backRailCurve, 56, 10));
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.castShadow = false;
  headbandGroup.add(canopyMesh);

  // --- 2. Shared Geometries for Ear Cups (distinct L & R winding so zero negative-scale culling) ---
  const rightShellGeo = trackGeo(createSquircleCupShellGeometry(0.34, 0.44, 0.21, 1));
  const leftShellGeo = trackGeo(createSquircleCupShellGeometry(0.34, 0.44, 0.21, -1));
  const rightCushionGeo = trackGeo(createSquircleCushionGeometry(0.34, 0.44, 0.092, 0.145, 1));
  const leftCushionGeo = trackGeo(createSquircleCushionGeometry(0.34, 0.44, 0.092, 0.145, -1));
  const rightBaffleGeo = trackGeo(createSquirclePlateGeometry(0.285, 0.385, 1, 48));
  const leftBaffleGeo = trackGeo(createSquirclePlateGeometry(0.285, 0.385, -1, 48));
  const rightInnerMeshGeo = trackGeo(createSquirclePlateGeometry(0.245, 0.345, 1, 48));
  const leftInnerMeshGeo = trackGeo(createSquirclePlateGeometry(0.245, 0.345, -1, 48));
  const rightMagnetRingGeo = trackGeo(
    createSquircleRingGeometry(0.305, 0.405, 0.242, 0.342, 1, 48),
  );
  const leftMagnetRingGeo = trackGeo(
    createSquircleRingGeometry(0.305, 0.405, 0.242, 0.342, -1, 48),
  );
  const ventSlotGeo = trackGeo(createPillButtonGeometry(0.058, 0.012, 0.015));

  // Swivel yokes attach to bottom of telescoping arms
  const leftCupSwivel = new THREE.Group();
  leftCupSwivel.position.set(-0.748, 0.115, 0);
  headsetGroup.add(leftCupSwivel);

  const rightCupSwivel = new THREE.Group();
  rightCupSwivel.position.set(0.748, 0.115, 0);
  headsetGroup.add(rightCupSwivel);

  // Sub-groups for animations
  let leftCushionGroup!: THREE.Group;
  let rightCushionGroup!: THREE.Group;
  let rightShellGroup!: THREE.Group;
  let rightElectronicsGroup!: THREE.Group;
  let rightDriverGroup!: THREE.Group;
  let rightBaffleGroup!: THREE.Group;
  let crownSpinGroup!: THREE.Group;

  // Anchor markers for 2D projection
  const crownAnchor = new THREE.Object3D();
  const noiseAnchor = new THREE.Object3D();
  const micAnchor = new THREE.Object3D();
  const expShellAnchor = new THREE.Object3D();
  const expElectronicsAnchor = new THREE.Object3D();
  const expDriverAnchor = new THREE.Object3D();
  const expBaffleAnchor = new THREE.Object3D();
  const expCushionAnchor = new THREE.Object3D();

  const buildEarCup = (isRight: boolean) => {
    const swivel = isRight ? rightCupSwivel : leftCupSwivel;
    const dir = isRight ? 1 : -1;

    // Ergonomic inward tilt toward listener's jaw (~13 deg)
    const cupTilt = new THREE.Group();
    cupTilt.position.set(-dir * 0.085, -0.40, 0);
    cupTilt.rotation.z = dir * -0.22;
    swivel.add(cupTilt);

    // Layer 1: Outer Anodized Aluminum Shell Group
    const shellGroup = new THREE.Group();
    cupTilt.add(shellGroup);

    // Chrome ball-hinge yoke stem aligning seamlessly from telescoping arm into cup top socket
    const yokePinGeo = trackGeo(new THREE.CylinderGeometry(0.020, 0.021, 0.088, 20));
    const yokePin = new THREE.Mesh(yokePinGeo, chromeMat);
    yokePin.position.set(dir * 0.015, 0.446, 0);
    yokePin.rotation.z = dir * 0.14;
    shellGroup.add(yokePin);

    const ballJoint = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.024, 18, 18)),
      chromeMat,
    );
    ballJoint.position.set(dir * 0.024, 0.415, 0);
    shellGroup.add(ballJoint);

    const shellMesh = new THREE.Mesh(isRight ? rightShellGeo : leftShellGeo, aluminumMat);
    shellMesh.castShadow = true;
    shellMesh.receiveShadow = true;
    shellGroup.add(shellMesh);

    // Recessed dark yoke socket collar flush with top shoulder
    const socketGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.034, 0.016, 24));
    const socketMesh = new THREE.Mesh(socketGeo, darkChassisMat);
    socketMesh.position.set(dir * 0.030, 0.408, 0);
    shellGroup.add(socketMesh);

    // Twin bottom acoustic vents + upper microphone slits
    const ventPositions = [
      { x: dir * 0.09, y: -0.428, z: 0.06, rx: Math.PI / 2, ry: 0, rz: 0 },
      { x: dir * 0.09, y: -0.428, z: -0.06, rx: Math.PI / 2, ry: 0, rz: 0 },
      { x: dir * 0.08, y: 0.365, z: 0.165, rx: 0, ry: Math.PI / 2, rz: 0.4 },
    ];
    ventPositions.forEach((vp) => {
      const vent = new THREE.Mesh(ventSlotGeo, darkChassisMat);
      vent.position.set(vp.x, vp.y, vp.z);
      vent.rotation.set(vp.rx, vp.ry, vp.rz);
      shellGroup.add(vent);
    });

    // Inner dark structural chassis frame + copper flex ribbon (visible when exploded)
    const chassisRingGeo = trackGeo(new THREE.TorusGeometry(0.24, 0.022, 12, 48));
    const chassisRing = new THREE.Mesh(chassisRingGeo, darkChassisMat);
    chassisRing.rotation.y = Math.PI / 2;
    chassisRing.scale.set(1.25, 0.96, 1);
    chassisRing.position.set(dir * 0.04, 0, 0);
    shellGroup.add(chassisRing);

    const copperRibbonGeo = trackGeo(new THREE.BoxGeometry(0.012, 0.18, 0.022));
    const copperRibbon = new THREE.Mesh(copperRibbonGeo, copperTraceMat);
    copperRibbon.position.set(dir * 0.055, 0.22, -0.08);
    shellGroup.add(copperRibbon);

    // Right Ear Cup Hardware Controls (Digital Crown, Noise Control Button, Mic Slit)
    if (isRight) {
      rightShellGroup = shellGroup;

      // Mic slit below Digital Crown on outer-front shoulder
      const micSlit = new THREE.Mesh(ventSlotGeo, darkChassisMat);
      micSlit.position.set(0.165, 0.215, 0.285);
      micSlit.rotation.set(0.18, 0.65, 0.48);
      shellGroup.add(micSlit);
      micAnchor.position.set(0.175, 0.215, 0.295);
      shellGroup.add(micAnchor);

      // Digital Crown Assembly seated proudly on the curved upper-front shoulder
      const crownBase = new THREE.Group();
      crownBase.position.set(0.162, 0.342, 0.198);
      crownBase.rotation.set(0.55, 0.08, -0.58);
      shellGroup.add(crownBase);

      // Recessed crown seat collar
      const seatGeo = trackGeo(new THREE.CylinderGeometry(0.050, 0.054, 0.014, 32));
      const seatMesh = new THREE.Mesh(seatGeo, darkChassisMat);
      seatMesh.position.y = 0.002;
      crownBase.add(seatMesh);

      // Rotating Digital Crown dial + 36 radial knurled ridges
      crownSpinGroup = new THREE.Group();
      crownSpinGroup.position.y = 0.022;
      crownBase.add(crownSpinGroup);

      const crownBodyGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.026, 36));
      const crownBody = new THREE.Mesh(crownBodyGeo, aluminumMat);
      crownSpinGroup.add(crownBody);

      const crownTopCapGeo = trackGeo(new THREE.CylinderGeometry(0.039, 0.042, 0.006, 32));
      const crownTopCap = new THREE.Mesh(crownTopCapGeo, aluminumMat);
      crownTopCap.position.y = 0.015;
      crownSpinGroup.add(crownTopCap);

      // Instanced radial knurling ridges around Digital Crown perimeter
      const ridgeCount = 36;
      const ridgeGeo = trackGeo(new THREE.BoxGeometry(0.0032, 0.024, 0.0045));
      const ridgeInstanced = new THREE.InstancedMesh(ridgeGeo, aluminumMat, ridgeCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < ridgeCount; i++) {
        const a = (i / ridgeCount) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 0.0445, 0, Math.sin(a) * 0.0445);
        dummy.rotation.set(0, -a, 0);
        dummy.updateMatrix();
        ridgeInstanced.setMatrixAt(i, dummy.matrix);
      }
      ridgeInstanced.instanceMatrix.needsUpdate = true;
      ridgeInstanced.computeBoundingSphere();
      crownSpinGroup.add(ridgeInstanced);

      crownAnchor.position.set(0, 0.028, 0);
      crownBase.add(crownAnchor);

      // Noise Control Oval Pill Button seated flush along upper-rear shoulder
      const noiseGroup = new THREE.Group();
      noiseGroup.position.set(0.168, 0.398, -0.020);
      noiseGroup.rotation.set(-0.08, 0.14, -0.52);
      shellGroup.add(noiseGroup);

      const noiseBezelGeo = trackGeo(createPillButtonGeometry(0.098, 0.044, 0.014));
      const noiseBezel = new THREE.Mesh(noiseBezelGeo, darkChassisMat);
      noiseBezel.rotation.x = Math.PI / 2;
      noiseGroup.add(noiseBezel);

      const noiseBtnGeo = trackGeo(createPillButtonGeometry(0.084, 0.034, 0.016));
      const noiseBtn = new THREE.Mesh(noiseBtnGeo, aluminumMat);
      noiseBtn.rotation.x = Math.PI / 2;
      noiseBtn.position.y = 0.008;
      noiseGroup.add(noiseBtn);

      noiseAnchor.position.set(0, 0.022, 0);
      noiseGroup.add(noiseAnchor);

      // Exploded View Layer 1 Anchor
      expShellAnchor.position.set(0.18, 0.0, 0.0);
      shellGroup.add(expShellAnchor);

      // --- Layer 2: H1 Logic Board, Battery & Sensor Assembly (Right Cup Exploded) ---
      rightElectronicsGroup = new THREE.Group();
      cupTilt.add(rightElectronicsGroup);

      const battA = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.048, 0.25, 0.12)),
        darkChassisMat,
      );
      battA.position.set(0.02, 0.02, 0.09);
      const battB = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.048, 0.21, 0.11)),
        darkChassisMat,
      );
      battB.position.set(0.02, 0.0, -0.08);

      // Curved lower logic PCB
      const pcbShape = new THREE.Shape();
      pcbShape.absarc(0, 0, 0.25, Math.PI * 1.1, Math.PI * 1.9, false);
      pcbShape.absarc(0, 0, 0.18, Math.PI * 1.9, Math.PI * 1.1, true);
      const pcbGeo = trackGeo(
        new THREE.ExtrudeGeometry(pcbShape, { depth: 0.018, bevelEnabled: false }),
      );
      pcbGeo.rotateY(Math.PI / 2);
      const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
      pcbMesh.position.set(0.01, -0.06, 0);

      // H1 silicon shield & top encoder switch sub-assembly
      const h1Shield = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.022, 0.095, 0.095)),
        chromeMat,
      );
      h1Shield.position.set(0.045, 0.05, 0.02);

      const crownActuator = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.028, 0.032, 0.045, 16)),
        chromeMat,
      );
      crownActuator.position.set(0.02, 0.30, 0.11);

      rightElectronicsGroup.add(battA, battB, pcbMesh, h1Shield, crownActuator);
      expElectronicsAnchor.position.set(0.02, 0.26, 0.0);
      rightElectronicsGroup.add(expElectronicsAnchor);

      // --- Layer 3: 40mm Custom Dynamic Driver & Dual-Neodymium Ring Magnet ---
      rightDriverGroup = new THREE.Group();
      cupTilt.add(rightDriverGroup);

      const basketGeo = trackGeo(new THREE.CylinderGeometry(0.185, 0.165, 0.042, 40, 1, true));
      basketGeo.rotateZ(Math.PI / 2);
      const basketMesh = new THREE.Mesh(basketGeo, darkChassisMat);

      const magnetOuterGeo = trackGeo(new THREE.TorusGeometry(0.11, 0.026, 16, 40));
      magnetOuterGeo.rotateY(Math.PI / 2);
      const magnetOuter = new THREE.Mesh(magnetOuterGeo, darkChassisMat);
      magnetOuter.position.x = 0.018;

      const voiceCoilGeo = trackGeo(new THREE.TorusGeometry(0.065, 0.011, 12, 32));
      voiceCoilGeo.rotateY(Math.PI / 2);
      const voiceCoil = new THREE.Mesh(voiceCoilGeo, copperTraceMat);
      voiceCoil.position.x = 0.005;

      const coneGeo = trackGeo(new THREE.CircleGeometry(0.175, 48));
      coneGeo.rotateY(-Math.PI / 2);
      const coneMesh = new THREE.Mesh(coneGeo, driverConeMat);
      coneMesh.position.x = -0.016;

      rightDriverGroup.add(basketMesh, magnetOuter, voiceCoil, coneMesh);
      expDriverAnchor.position.set(0.0, 0.0, 0.0);
      rightDriverGroup.add(expDriverAnchor);
    }

    // --- Layer 4: Acoustic Baffle Chamber & Perforated Grille ---
    const baffleGroup = new THREE.Group();
    cupTilt.add(baffleGroup);
    if (isRight) {
      rightBaffleGroup = baffleGroup;
    }

    // Flared inner acoustic housing rim
    const chamberWallGeo = trackGeo(
      new THREE.CylinderGeometry(0.24, 0.19, 0.09, 36, 1, true),
    );
    chamberWallGeo.rotateZ(Math.PI / 2);
    const chamberWall = new THREE.Mesh(chamberWallGeo, matteChamberMat);
    chamberWall.position.set(dir * 0.045, 0, 0);
    baffleGroup.add(chamberWall);

    // Contoured perforated speaker grille plate recessed inside aluminum lip
    const bafflePlate = new THREE.Mesh(
      isRight ? rightBaffleGeo : leftBaffleGeo,
      bafflePlateMat,
    );
    bafflePlate.position.set(dir * 0.018, 0, 0);
    baffleGroup.add(bafflePlate);

    // 4 magnetic alignment pin dimples around the baffle flange
    const pinGeo = trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 16));
    pinGeo.rotateZ(Math.PI / 2);
    [
      [0.24, 0.18],
      [-0.24, 0.18],
      [0.24, -0.18],
      [-0.24, -0.18],
    ].forEach(([py, pz]) => {
      const pin = new THREE.Mesh(pinGeo, chromeMat);
      pin.position.set(dir * 0.014, py, pz);
      baffleGroup.add(pin);
    });

    if (isRight) {
      expBaffleAnchor.position.set(-0.02, 0.25, 0.0);
      baffleGroup.add(expBaffleAnchor);
    }

    // --- Layer 5: Magnetic Knit-Mesh Ear Cushion & Inner "L"/"R" Mesh ---
    const cushionGroup = new THREE.Group();
    cupTilt.add(cushionGroup);
    if (isRight) rightCushionGroup = cushionGroup;
    else leftCushionGroup = cushionGroup;

    const cushionMesh = new THREE.Mesh(
      isRight ? rightCushionGeo : leftCushionGeo,
      cushionMat,
    );
    cushionMesh.castShadow = true;
    cushionMesh.receiveShadow = true;
    cushionGroup.add(cushionMesh);

    // Dark magnetic mounting flange on the back of the cushion (visible on detach!)
    const flangeMesh = new THREE.Mesh(
      isRight ? rightMagnetRingGeo : leftMagnetRingGeo,
      darkChassisMat,
    );
    flangeMesh.position.set(dir * 0.004, 0, 0);
    cushionGroup.add(flangeMesh);

    // Inner woven acoustic mesh scrim displaying "L" or "R"
    const innerScrim = new THREE.Mesh(
      isRight ? rightInnerMeshGeo : leftInnerMeshGeo,
      isRight ? innerMeshRMat : innerMeshLMat,
    );
    innerScrim.position.set(-dir * 0.016, 0, 0);
    cushionGroup.add(innerScrim);

    if (isRight) {
      expCushionAnchor.position.set(-0.08, 0.0, 0.0);
      cushionGroup.add(expCushionAnchor);
    }
  };

  buildEarCup(false);
  buildEarCup(true);

  // --- 3. Smart Case Group (Contoured Microfiber + Articulated Magnetic Flap) ---
  const smartCaseGroup = new THREE.Group();
  smartCaseGroup.visible = false;
  root.add(smartCaseGroup);

  const smartCaseShellGeo = trackGeo(createSmartCaseShellGeometry());
  const smartCaseShell = new THREE.Mesh(smartCaseShellGeo, smartCaseMat);
  smartCaseShell.castShadow = true;
  smartCaseShell.receiveShadow = true;
  smartCaseGroup.add(smartCaseShell);

  // Dark microfiber interior lining visible inside top mouth
  const liningGeo = trackGeo(new THREE.BoxGeometry(1.76, 0.06, 0.30));
  const liningMesh = new THREE.Mesh(liningGeo, smartCaseLiningMat);
  liningMesh.position.set(0, 0.45, 0);
  smartCaseGroup.add(liningMesh);

  // Articulated magnetic front flap hinged at top center seam
  const smartCaseFlapPivot = new THREE.Group();
  smartCaseFlapPivot.position.set(0, 0.49, 0.21);
  smartCaseGroup.add(smartCaseFlapPivot);

  const flapGeo = trackGeo(createSmartCaseFlapGeometry());
  const flapMesh = new THREE.Mesh(flapGeo, smartCaseMat);
  flapMesh.castShadow = true;
  smartCaseFlapPivot.add(flapMesh);

  // Scratch Color objects for GC-free colorway interpolation
  const currentAluminum = new THREE.Color(initialColorway.aluminum);
  const currentHeadband = new THREE.Color(initialColorway.headband);
  const currentCanopy = new THREE.Color(initialColorway.canopy);
  const currentCushion = new THREE.Color(initialColorway.cushion);
  const currentInnerMesh = new THREE.Color(initialColorway.innerMesh);
  const currentBaffleRing = new THREE.Color(initialColorway.baffleRing);
  const currentSmartCase = new THREE.Color(initialColorway.smartCase);

  const targetAluminum = new THREE.Color();
  const targetHeadband = new THREE.Color();
  const targetCanopy = new THREE.Color();
  const targetCushion = new THREE.Color();
  const targetInnerMesh = new THREE.Color();
  const targetBaffleRing = new THREE.Color();
  const targetSmartCase = new THREE.Color();

  const applyColorway = (target: AirPodsColorway, blendAlpha: number) => {
    targetAluminum.set(target.aluminum);
    targetHeadband.set(target.headband);
    targetCanopy.set(target.canopy);
    targetCushion.set(target.cushion);
    targetInnerMesh.set(target.innerMesh);
    targetBaffleRing.set(target.baffleRing);
    targetSmartCase.set(target.smartCase);

    currentAluminum.lerp(targetAluminum, blendAlpha);
    currentHeadband.lerp(targetHeadband, blendAlpha);
    currentCanopy.lerp(targetCanopy, blendAlpha);
    currentCushion.lerp(targetCushion, blendAlpha);
    currentInnerMesh.lerp(targetInnerMesh, blendAlpha);
    currentBaffleRing.lerp(targetBaffleRing, blendAlpha);
    currentSmartCase.lerp(targetSmartCase, blendAlpha);

    aluminumMat.color.copy(currentAluminum);
    headbandMat.color.copy(currentHeadband);
    canopyMat.color.copy(currentCanopy);
    cushionMat.color.copy(currentCushion);
    innerMeshLMat.color.copy(currentInnerMesh);
    innerMeshRMat.color.copy(currentInnerMesh);
    matteChamberMat.color.copy(currentBaffleRing);
    smartCaseMat.color.copy(currentSmartCase);
  };

  const applyChoreography = (state: ChoreographyState) => {
    // Stage 3: Digital Crown spin
    crownSpinGroup.rotation.y = state.crownSpin;

    // Stage 5 & 6: Cushion Detach + Horizontal Exploded View
    const detachOffset = state.cushionDetach * 0.42;
    const exp = state.explodeFactor;

    // Left cushion only detaches during Stage 5
    leftCushionGroup.position.set(detachOffset, 0, state.cushionDetach * 0.14);
    leftCushionGroup.rotation.y = -state.cushionDetach * 0.28;

    // Right cup explodes horizontally across 5 clean, evenly spaced layers in Stage 6!
    // Outer shell shifts outward (+X), internal layers step inward (-X)
    rightShellGroup.position.set(exp * 0.58, 0, 0);
    rightElectronicsGroup.position.set(exp * 0.24, 0, 0);
    rightDriverGroup.position.set(-exp * 0.08, 0, 0);
    rightBaffleGroup.position.set(-exp * 0.38, 0, 0);

    // Right cushion combines Stage 5 detach & Stage 6 outermost exploded offset
    rightCushionGroup.position.set(
      -detachOffset - exp * 0.70,
      0,
      state.cushionDetach * 0.14,
    );
    rightCushionGroup.rotation.y = state.cushionDetach * 0.28;

    // Internal layers sit snugly inside the cup shell normally, and reveal cleanly on explosion
    const internalVisible = exp > 0.015;
    rightElectronicsGroup.visible = internalVisible;
    rightDriverGroup.visible = internalVisible;

    // Stage 7: Ear Cups Swivel Flat + Glide into Smart Case + Magnetic Flap Closes
    const swivelAngle = state.cupSwivelFlat * (Math.PI * 0.5);
    leftCupSwivel.rotation.y = swivelAngle;
    rightCupSwivel.rotation.y = -swivelAngle;

    // Smart Case lifts smoothly from below, headset drops cleanly inside
    const caseVisible = state.smartCaseOpacity > 0.01;
    smartCaseGroup.visible = caseVisible;
    smartCaseMat.opacity = state.smartCaseOpacity;
    smartCaseLiningMat.opacity = state.smartCaseOpacity;

    // Smart Case sits at y = -0.30 when docked
    const caseY = THREE.MathUtils.lerp(-1.35, -0.30, state.smartCaseLift);
    smartCaseGroup.position.set(0, caseY, 0);
    smartCaseGroup.rotation.y = state.headsetRot.y;

    // Headset drops down so cups seat inside Smart Case pockets with bottom crescent rims peeking cleanly
    const headsetDropY = THREE.MathUtils.lerp(
      state.headsetPos.y,
      -0.01,
      state.headsetDropInCase,
    );
    headsetGroup.position.set(state.headsetPos.x, headsetDropY, state.headsetPos.z);
    headsetGroup.rotation.set(state.headsetRot.x, state.headsetRot.y, state.headsetRot.z);

    // Also shift Smart Case X with headsetPos.x so they stay aligned
    smartCaseGroup.position.x = state.headsetPos.x;

    // Magnetic flap opens up (`-1.45 rad`) when receiving headset, then folds shut (`0.02 rad`)
    const flapAngle = THREE.MathUtils.lerp(-1.45, 0.01, state.smartCaseFlapClose);
    smartCaseFlapPivot.rotation.x = flapAngle;
  };

  return {
    root,
    headsetGroup,
    smartCaseGroup,
    smartCaseFlapPivot,
    leftCupSwivel,
    rightCupSwivel,
    crownSpinGroup,
    anchors: {
      crown: crownAnchor,
      noiseButton: noiseAnchor,
      micSlit: micAnchor,
      expShell: expShellAnchor,
      expElectronics: expElectronicsAnchor,
      expDriver: expDriverAnchor,
      expBaffle: expBaffleAnchor,
      expCushion: expCushionAnchor,
    },
    applyColorway,
    applyChoreography,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
