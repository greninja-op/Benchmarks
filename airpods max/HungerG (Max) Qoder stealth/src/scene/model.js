import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  createAcousticTexture,
  createCaseTextures,
  createGrilleTexture,
  createKnitTextures,
  createMicroNormalTexture,
} from './textures';

export const COLORWAYS = [
  { name: 'Silver', aluminum: '#d8d9da', textile: '#e7e7e4', case: '#d9dad8' },
  { name: 'Space Gray', aluminum: '#3f4143', textile: '#414345', case: '#414345' },
  { name: 'Sky Blue', aluminum: '#86a6bb', textile: '#aec4d0', case: '#86a6bb' },
  { name: 'Pink', aluminum: '#d9a7b1', textile: '#e6c1c8', case: '#d9a7b1' },
  { name: 'Green', aluminum: '#91a78d', textile: '#afbea7', case: '#91a78d' },
];

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function cupShellGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.55, -1.68);
  shape.bezierCurveTo(-1.04, -1.68, -1.28, -1.28, -1.3, -0.62);
  shape.bezierCurveTo(-1.34, 0.28, -1.26, 1.22, -0.91, 1.57);
  shape.bezierCurveTo(-0.58, 1.83, 0.58, 1.83, 0.91, 1.57);
  shape.bezierCurveTo(1.26, 1.22, 1.34, 0.28, 1.3, -0.62);
  shape.bezierCurveTo(1.28, -1.28, 1.04, -1.68, 0.55, -1.68);
  shape.quadraticCurveTo(0, -1.77, -0.55, -1.68);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.56,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.12,
    bevelThickness: 0.12,
    curveSegments: 28,
  });
  geometry.center();
  geometry.rotateY(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function domedCupFace(side, width = 2.32, height = 3.34, bulge = 0.18) {
  const rings = 22;
  const segments = 112;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const radius = ring / rings;
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const z = Math.sign(cosine) * Math.abs(cosine) ** 0.66 * width * 0.5 * radius;
      const y = Math.sign(sine) * Math.abs(sine) ** 0.76 * height * 0.5 * radius;
      const x = side * (0.425 + bulge * (1 - radius * radius));
      positions.push(x, y, z);
      uvs.push(0.5 + cosine * radius * 0.5, 0.5 + sine * radius * 0.5);
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * (segments + 1) + segment;
      const b = (ring + 1) * (segments + 1) + segment;
      const c = (ring + 1) * (segments + 1) + segment + 1;
      const d = ring * (segments + 1) + segment + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function cushionGeometry() {
  const around = 144;
  const cross = 24;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= around; i += 1) {
    const theta = (i / around) * Math.PI * 2;
    const cosine = Math.cos(theta);
    const sine = Math.sin(theta);
    const centerZ = Math.sign(cosine) * Math.abs(cosine) ** 0.72 * 1.11;
    const centerY = Math.sign(sine) * Math.abs(sine) ** 0.82 * 1.47;
    for (let j = 0; j <= cross; j += 1) {
      const phi = (j / cross) * Math.PI * 2;
      const radial = Math.cos(phi) * 0.34;
      positions.push(
        Math.sin(phi) * 0.43 + Math.cos(phi) * 0.06,
        centerY + Math.sign(sine) * Math.abs(sine) ** 0.82 * radial,
        centerZ + Math.sign(cosine) * Math.abs(cosine) ** 0.72 * radial,
      );
      uvs.push(i / around * 5, j / cross * 1.25);
    }
  }
  for (let i = 0; i < around; i += 1) {
    for (let j = 0; j < cross; j += 1) {
      const a = i * (cross + 1) + j;
      const b = (i + 1) * (cross + 1) + j;
      const c = (i + 1) * (cross + 1) + j + 1;
      const d = i * (cross + 1) + j + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function bandGeometry(curve, width = 0.74, thickness = 0.2) {
  const lengthSegments = 128;
  const crossSegments = 20;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= lengthSegments; i += 1) {
    const t = i / lengthSegments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    for (let j = 0; j <= crossSegments; j += 1) {
      const phi = (j / crossSegments) * Math.PI * 2;
      const cosine = Math.cos(phi);
      const sine = Math.sin(phi);
      const z = Math.sign(cosine) * Math.abs(cosine) ** 0.55 * width * 0.5;
      const n = Math.sign(sine) * Math.abs(sine) ** 0.55 * thickness * 0.5;
      positions.push(point.x + normal.x * n, point.y + normal.y * n, point.z + z);
      uvs.push(t * 7, j / crossSegments);
    }
  }
  for (let i = 0; i < lengthSegments; i += 1) {
    for (let j = 0; j < crossSegments; j += 1) {
      const a = i * (crossSegments + 1) + j;
      const b = (i + 1) * (crossSegments + 1) + j;
      const c = (i + 1) * (crossSegments + 1) + j + 1;
      const d = i * (crossSegments + 1) + j + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function plate(width, height, depth, radius = 0.18) {
  return new RoundedBoxGeometry(depth, height, width, 8, Math.min(radius, depth * 0.45));
}

function mesh(geometry, material, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function anchor(parent, name, position) {
  const object = new THREE.Object3D();
  object.position.set(...position);
  object.name = name;
  parent.add(object);
  return object;
}

function createChipTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#151719';
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = '#44484b';
  context.lineWidth = 3;
  context.strokeRect(12, 12, 232, 232);
  context.fillStyle = '#a7aaab';
  context.font = '500 74px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 128, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMaterials() {
  const knit = createKnitTextures();
  const caseTextures = createCaseTextures();
  const aluminumNormal = createMicroNormalTexture(7, 0.16);
  aluminumNormal.repeat.set(5, 5);
  const materials = {
    aluminum: new THREE.MeshPhysicalMaterial({
      color: COLORWAYS[0].aluminum,
      metalness: 0.92,
      roughness: 0.25,
      normalMap: aluminumNormal,
      normalScale: new THREE.Vector2(0.16, 0.16),
      clearcoat: 0.12,
      clearcoatRoughness: 0.32,
      envMapIntensity: 1.35,
    }),
    fabric: new THREE.MeshPhysicalMaterial({
      color: COLORWAYS[0].textile,
      map: knit.map,
      bumpMap: knit.bump,
      bumpScale: 0.038,
      roughness: 0.91,
      metalness: 0,
      sheen: 0.85,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.9,
      side: THREE.DoubleSide,
    }),
    canopy: new THREE.MeshPhysicalMaterial({
      color: COLORWAYS[0].textile,
      map: knit.map,
      bumpMap: knit.bump,
      bumpScale: 0.032,
      alphaMap: knit.alpha,
      alphaTest: 0.28,
      transparent: true,
      roughness: 0.9,
      sheen: 0.9,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.85,
      side: THREE.DoubleSide,
    }),
    chrome: new THREE.MeshPhysicalMaterial({
      color: '#e2e5e7',
      metalness: 1,
      roughness: 0.065,
      envMapIntensity: 2.1,
      clearcoat: 0.25,
      clearcoatRoughness: 0.06,
    }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#282b2d', metalness: 0.78, roughness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: '#111315', metalness: 0.12, roughness: 0.54 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#151719', metalness: 0, roughness: 0.84 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c9a35b', metalness: 0.88, roughness: 0.25 }),
    copper: new THREE.MeshStandardMaterial({ color: '#b76b3e', metalness: 0.82, roughness: 0.28 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#1c3b31', metalness: 0.22, roughness: 0.55 }),
    magnet: new THREE.MeshStandardMaterial({ color: '#41464a', metalness: 0.86, roughness: 0.24 }),
    diaphragm: new THREE.MeshStandardMaterial({ color: '#353a3e', metalness: 0.45, roughness: 0.36 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#152331', metalness: 0.2, roughness: 0.08, clearcoat: 1 }),
    case: new THREE.MeshPhysicalMaterial({
      color: COLORWAYS[0].case,
      map: caseTextures.map,
      normalMap: caseTextures.normal,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 0.79,
      metalness: 0,
      sheen: 0.5,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.9,
      envMapIntensity: 0.6,
    }),
    caseInner: new THREE.MeshStandardMaterial({ color: '#53575a', roughness: 0.96 }),
  };
  const grille = createGrilleTexture();
  materials.grille = new THREE.MeshStandardMaterial({
    map: grille.map,
    bumpMap: grille.bump,
    bumpScale: 0.025,
    metalness: 0.62,
    roughness: 0.38,
  });
  materials.acousticL = new THREE.MeshStandardMaterial({
    map: createAcousticTexture('L'),
    roughness: 0.88,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  materials.acousticL.map.wrapS = materials.acousticL.map.wrapT = THREE.ClampToEdgeWrapping;
  materials.acousticR = materials.acousticL.clone();
  materials.acousticR.map = createAcousticTexture('R');
  materials.acousticR.map.wrapS = materials.acousticR.map.wrapT = THREE.ClampToEdgeWrapping;
  materials.chip = new THREE.MeshStandardMaterial({ map: createChipTexture('H1'), roughness: 0.55, metalness: 0.22 });
  return materials;
}

function createCrown(materials) {
  const group = new THREE.Group();
  const dial = mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.17, 64), materials.aluminum);
  dial.rotation.z = Math.PI / 2;
  group.add(dial);
  const cap = mesh(new THREE.CylinderGeometry(0.208, 0.208, 0.018, 64), materials.aluminum, [0.095, 0, 0]);
  cap.rotation.z = Math.PI / 2;
  group.add(cap);
  const ridges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.018, 0.027), materials.aluminum, 56);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 56; i += 1) {
    const angle = (i / 56) * Math.PI * 2;
    dummy.position.set(0, Math.cos(angle) * 0.247, Math.sin(angle) * 0.247);
    dummy.rotation.set(angle, 0, 0);
    dummy.updateMatrix();
    ridges.setMatrixAt(i, dummy.matrix);
  }
  ridges.castShadow = true;
  group.add(ridges);
  return group;
}

function createDriver(materials) {
  const group = new THREE.Group();
  const frame = mesh(new THREE.TorusGeometry(0.84, 0.065, 12, 72), materials.darkMetal);
  frame.rotation.y = Math.PI / 2;
  group.add(frame);
  const profile = [
    new THREE.Vector2(0.02, 0.04),
    new THREE.Vector2(0.23, 0.07),
    new THREE.Vector2(0.5, 0.035),
    new THREE.Vector2(0.72, -0.03),
    new THREE.Vector2(0.78, -0.08),
    new THREE.Vector2(0.72, -0.13),
    new THREE.Vector2(0.5, -0.15),
    new THREE.Vector2(0.22, -0.1),
    new THREE.Vector2(0.02, -0.07),
  ];
  const diaphragm = mesh(new THREE.LatheGeometry(profile, 72), materials.diaphragm);
  diaphragm.rotation.z = -Math.PI / 2;
  group.add(diaphragm);
  const magnet = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.2, 64), materials.magnet, [0.18, 0, 0]);
  magnet.rotation.z = Math.PI / 2;
  group.add(magnet);
  const coil = mesh(new THREE.TorusGeometry(0.61, 0.032, 10, 64), materials.copper, [0.11, 0, 0]);
  coil.rotation.y = Math.PI / 2;
  group.add(coil);
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    group.add(mesh(new THREE.BoxGeometry(0.08, 0.055, 0.12), materials.gold, [
      -0.02,
      Math.cos(angle) * 0.75,
      Math.sin(angle) * 0.75,
    ]));
  }
  return group;
}

function createElectronics(materials) {
  const group = new THREE.Group();
  group.add(mesh(plate(0.82, 1.62, 0.08, 0.12), materials.pcb, [0, -0.18, 0]));
  group.add(mesh(plate(0.48, 0.48, 0.11, 0.035), materials.chip, [-0.085, 0.1, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.1, 0.25, 0.22), materials.black, [-0.08, -0.48, 0.1]));
  group.add(mesh(new THREE.BoxGeometry(0.1, 0.18, 0.16), materials.black, [-0.08, -0.48, -0.22]));
  for (let i = 0; i < 9; i += 1) {
    group.add(mesh(new THREE.BoxGeometry(0.025, 0.045, 0.075), materials.gold, [
      -0.06,
      -0.66 + i * 0.075,
      0.33,
    ]));
  }
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.01, 0.55, 0.18),
    new THREE.Vector3(0.05, 0.86, 0.28),
    new THREE.Vector3(0.1, 1.12, 0.08),
    new THREE.Vector3(0.03, 1.32, -0.12),
  ]);
  group.add(mesh(new THREE.TubeGeometry(cableCurve, 32, 0.025, 8, false), materials.copper));
  const sensor = mesh(plate(0.34, 0.3, 0.12, 0.045), materials.black, [-0.02, 0.72, -0.35]);
  group.add(sensor);
  const lens = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 24), materials.glass, [-0.1, 0.72, -0.35]);
  lens.rotation.z = Math.PI / 2;
  group.add(lens);
  return group;
}

function createCup(side, materials) {
  const cup = new THREE.Group();
  cup.position.set(side * 2.25, -0.63, 0);
  const shell = mesh(cupShellGeometry(), materials.aluminum);
  cup.add(shell);
  const rear = mesh(domedCupFace(side), materials.aluminum);
  cup.add(rear);
  const seam = mesh(plate(2.25, 3.15, 0.028, 0.56), materials.darkMetal, [side * 0.367, 0, 0]);
  cup.add(seam);

  for (const z of [-0.47, 0, 0.47]) {
    const vent = mesh(plate(0.34, 0.045, 0.055, 0.02), materials.black, [side * 0.08, -1.73, z]);
    cup.add(vent);
  }
  const microphone = mesh(plate(0.045, 0.29, 0.055, 0.022), materials.black, [side * 0.49, 0.63, 0.72]);
  cup.add(microphone);
  const lowerMic = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.035, 20), materials.black, [side * 0.32, -1.31, 0.87]);
  lowerMic.rotation.z = Math.PI / 2;
  cup.add(lowerMic);

  const baffle = mesh(plate(2.28, 3.05, 0.11, 0.53), materials.grille, [-side * 0.39, 0, 0]);
  cup.add(baffle);
  const acousticShape = roundedRectShape(1.93, 2.65, 0.66);
  const acousticGeometry = new THREE.ShapeGeometry(acousticShape, 36);
  const acousticPositions = acousticGeometry.getAttribute('position');
  const acousticUVs = acousticGeometry.getAttribute('uv');
  for (let i = 0; i < acousticPositions.count; i += 1) {
    acousticUVs.setXY(i, acousticPositions.getX(i) / 1.93 + 0.5, acousticPositions.getY(i) / 2.65 + 0.5);
  }
  const acoustic = mesh(
    acousticGeometry,
    side > 0 ? materials.acousticR : materials.acousticL,
    [-side * 0.465, 0, 0],
  );
  acoustic.rotation.y = Math.PI / 2;
  cup.add(acoustic);

  const magnetRing = new THREE.Group();
  magnetRing.position.x = -side * 0.49;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const magnet = mesh(new THREE.BoxGeometry(0.055, 0.105, 0.16), materials.gold, [
      0,
      Math.cos(angle) * 1.05,
      Math.sin(angle) * 0.79,
    ]);
    magnet.rotation.x = angle;
    magnetRing.add(magnet);
  }
  cup.add(magnetRing);

  const driver = createDriver(materials);
  driver.position.x = side * 0.08;
  cup.add(driver);
  const electronics = createElectronics(materials);
  electronics.position.set(side * 0.27, 0.05, 0);
  cup.add(electronics);

  const cushion = new THREE.Group();
  cushion.position.x = -side * 0.67;
  const cushionMesh = mesh(cushionGeometry(), materials.fabric);
  cushion.add(cushionMesh);
  const innerSeam = mesh(new THREE.TorusGeometry(0.86, 0.012, 6, 72), materials.fabric, [-side * 0.13, 0, 0]);
  innerSeam.rotation.y = Math.PI / 2;
  innerSeam.scale.set(1, 1.5, 1);
  cushion.add(innerSeam);
  cup.add(cushion);

  let crown = null;
  if (side > 0) {
    crown = createCrown(materials);
    crown.position.set(0.61, 1.2, 0.53);
    cup.add(crown);
    const buttonSeat = mesh(plate(0.38, 0.12, 0.31, 0.055), materials.darkMetal, [0.53, 1.55, -0.26]);
    cup.add(buttonSeat);
    const button = mesh(new THREE.CapsuleGeometry(0.09, 0.18, 8, 20), materials.aluminum, [0.59, 1.62, -0.26]);
    button.rotation.x = Math.PI / 2;
    cup.add(button);
  }

  const crownAnchor = anchor(cup, 'crown', [0.82, 1.25, 0.53]);
  const buttonAnchor = anchor(cup, 'noise', [0.79, 1.66, -0.26]);
  const cushionAnchor = anchor(cushion, 'cushion', [-side * 0.22, -0.35, 0.75]);
  const canopyAnchor = anchor(cup, 'cup-anchor', [0, 0, 0]);
  const driverAnchor = anchor(driver, 'driver', [side * 0.2, 0.15, 0.45]);
  const h1Anchor = anchor(electronics, 'h1', [side * 0.1, 0.12, 0.1]);
  const shellAnchor = anchor(shell, 'shell', [side * 0.38, 0.55, 0.45]);
  return { cup, shell, rear, baffle, acoustic, magnetRing, driver, electronics, cushion, crown, crownAnchor, buttonAnchor, cushionAnchor, driverAnchor, h1Anchor, shellAnchor };
}

function createHeadband(materials) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.25, 2.55, 0),
    new THREE.Vector3(-2.18, 3.25, 0),
    new THREE.Vector3(-1.42, 3.86, 0),
    new THREE.Vector3(0, 4.08, 0),
    new THREE.Vector3(1.42, 3.86, 0),
    new THREE.Vector3(2.18, 3.25, 0),
    new THREE.Vector3(2.25, 2.55, 0),
  ]);
  const leftFrameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.25, 2.35, 0),
    new THREE.Vector3(-2.15, 3.16, 0),
    new THREE.Vector3(-1.36, 3.72, 0),
    new THREE.Vector3(-0.72, 3.9, 0),
  ]);
  const rightFrameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.72, 3.9, 0),
    new THREE.Vector3(1.36, 3.72, 0),
    new THREE.Vector3(2.15, 3.16, 0),
    new THREE.Vector3(2.25, 2.35, 0),
  ]);
  group.add(mesh(new THREE.TubeGeometry(leftFrameCurve, 56, 0.065, 12, false), materials.chrome));
  group.add(mesh(new THREE.TubeGeometry(rightFrameCurve, 56, 0.065, 12, false), materials.chrome));
  const canopy = mesh(bandGeometry(curve), materials.canopy);
  group.add(canopy);
  const canopyAnchor = anchor(canopy, 'canopy', [0, 0.18, 0.38]);
  return { group, canopy, canopyAnchor };
}

function createArms(materials) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const sleeve = mesh(new RoundedBoxGeometry(0.5, 1.26, 0.66, 8, 0.22), materials.fabric, [side * 2.25, 2.34, 0]);
    sleeve.rotation.z = -side * 0.045;
    group.add(sleeve);
    const steel = mesh(new RoundedBoxGeometry(0.26, 1.32, 0.38, 8, 0.095), materials.chrome, [side * 2.25, 1.5, 0]);
    group.add(steel);
    const slider = mesh(new RoundedBoxGeometry(0.31, 0.42, 0.43, 8, 0.1), materials.chrome, [side * 2.25, 1.96, 0]);
    group.add(slider);
    const hinge = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.42, 48), materials.aluminum, [side * 2.25, 0.94, 0]);
    hinge.rotation.x = Math.PI / 2;
    group.add(hinge);
    const hingeCap = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 40), materials.chrome, [side * 2.25, 0.94, 0.23]);
    hingeCap.rotation.x = Math.PI / 2;
    group.add(hingeCap);
  }
  return group;
}

function caseShellGeometry(width, height, depth, bevel) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth * 0.78, -halfHeight);
  shape.bezierCurveTo(-halfWidth * 0.96, -halfHeight, -halfWidth * 1.04, -halfHeight * 0.62, -halfWidth * 1.02, 0);
  shape.bezierCurveTo(-halfWidth, halfHeight * 0.78, -halfWidth * 0.76, halfHeight * 0.98, -halfWidth * 0.42, halfHeight);
  shape.quadraticCurveTo(0, halfHeight * 0.84, halfWidth * 0.42, halfHeight);
  shape.bezierCurveTo(halfWidth * 0.76, halfHeight * 0.98, halfWidth, halfHeight * 0.78, halfWidth * 1.02, 0);
  shape.bezierCurveTo(halfWidth * 1.04, -halfHeight * 0.62, halfWidth * 0.96, -halfHeight, halfWidth * 0.78, -halfHeight);
  shape.quadraticCurveTo(0, -halfHeight * 1.12, -halfWidth * 0.78, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 8,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 28,
    steps: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function createSmartCase(materials) {
  const group = new THREE.Group();
  const body = mesh(caseShellGeometry(5.45, 2.72, 1.32, 0.2), materials.case, [0, -3.25, 0]);
  group.add(body);
  const inner = mesh(plate(5.04, 1.84, 0.08, 0.42), materials.caseInner, [0, -3.16, 0.84]);
  group.add(inner);
  const frontSeam = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.45, -3.92, 0.73),
    new THREE.Vector3(-2.62, -3.24, 0.81),
    new THREE.Vector3(-2.36, -2.52, 0.76),
    new THREE.Vector3(0, -2.16, 0.81),
    new THREE.Vector3(2.36, -2.52, 0.76),
    new THREE.Vector3(2.62, -3.24, 0.81),
    new THREE.Vector3(2.45, -3.92, 0.73),
  ], true);
  group.add(mesh(new THREE.TubeGeometry(frontSeam, 96, 0.012, 6, true), materials.caseInner));
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, -1.74, 0.96);
  const flap = mesh(caseShellGeometry(5.42, 2.58, 0.18, 0.08), materials.case, [0, -1.4, 0]);
  flapPivot.add(flap);
  const flapInner = mesh(plate(5.02, 2.38, 0.035, 0.4), materials.caseInner, [0, -1.4, -0.135]);
  flapPivot.add(flapInner);
  group.add(flapPivot);
  const claspSeam = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.35, -2.36, 0.98),
    new THREE.Vector3(-1.2, -2.27, 1.01),
    new THREE.Vector3(0, -2.31, 1.03),
    new THREE.Vector3(1.2, -2.27, 1.01),
    new THREE.Vector3(2.35, -2.36, 0.98),
  ]);
  group.add(mesh(new THREE.TubeGeometry(claspSeam, 64, 0.012, 6, false), materials.caseInner));
  const magnet = mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.025, 32), materials.chrome, [0, -3.12, 1.14]);
  magnet.rotation.x = Math.PI / 2;
  group.add(magnet);
  const caseAnchor = anchor(flap, 'case', [0, -1.1, 0.16]);
  return { group, inner, flapInner, flapPivot, caseAnchor };
}

export function createAirPodsMax() {
  const materials = createMaterials();
  const root = new THREE.Group();
  const headband = createHeadband(materials);
  const arms = createArms(materials);
  const left = createCup(-1, materials);
  const right = createCup(1, materials);
  const smartCase = createSmartCase(materials);
  root.add(headband.group, arms, left.cup, right.cup, smartCase.group);
  root.rotation.set(-0.025, -0.08, 0);

  const colorEntries = [
    { material: materials.aluminum, key: 'aluminum' },
    { material: materials.fabric, key: 'textile' },
    { material: materials.canopy, key: 'textile' },
    { material: materials.case, key: 'case' },
  ];
  const anchors = {
    crown: right.crownAnchor,
    noise: right.buttonAnchor,
    cushion: right.cushionAnchor,
    canopy: headband.canopyAnchor,
    driver: right.driverAnchor,
    h1: right.h1Anchor,
    shell: right.shellAnchor,
    case: smartCase.caseAnchor,
  };

  return {
    root,
    materials,
    headband,
    arms,
    left,
    right,
    smartCase,
    colorEntries,
    anchors,
    setColor(colorway) {
      for (const entry of colorEntries) {
        entry.material.color.set(colorway[entry.key]);
      }
    },
  };
}
