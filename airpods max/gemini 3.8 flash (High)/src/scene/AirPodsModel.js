import * as THREE from 'three';
import {
  createBeadBlastedNormalMap,
  createCanopyTextures,
  createCushionTextures,
  createAcousticMeshTexture,
  createSpeakerBaffleTexture,
  createSmartCaseNormalMap
} from './ProceduralTextures.js';
import { COLORWAYS } from './Colorways.js';

/**
 * Creates the rounded squircle shape of the AirPods Max ear cup.
 */
function createCupShape(width = 0.88, height = 1.15, radius = 0.32) {
  const shape = new THREE.Shape();
  const w2 = width / 2;
  const h2 = height / 2;
  const r = radius;

  shape.moveTo(-w2 + r, -h2);
  shape.lineTo(w2 - r, -h2);
  shape.quadraticCurveTo(w2, -h2, w2, -h2 + r);
  shape.lineTo(w2, h2 - r);
  shape.quadraticCurveTo(w2, h2, w2 - r, h2);
  shape.lineTo(-w2 + r, h2);
  shape.quadraticCurveTo(-w2, h2, -w2, h2 - r);
  shape.lineTo(-w2, -h2 + r);
  shape.quadraticCurveTo(-w2, -h2, -w2 + r, -h2);

  return shape;
}

/**
 * Builds the knurled Digital Crown with 42 individual radial milled teeth.
 */
function createDigitalCrown(aluminumMaterial, chromeMaterial) {
  const crownGroup = new THREE.Group();
  crownGroup.name = 'digitalCrown';

  // Base inner cylinder
  const baseGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.055, 32);
  const baseMesh = new THREE.Mesh(baseGeo, aluminumMaterial);
  baseMesh.castShadow = true;
  crownGroup.add(baseMesh);

  // Recessed top cap
  const capGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.008, 32);
  const capMesh = new THREE.Mesh(capGeo, chromeMaterial);
  capMesh.position.y = 0.028;
  crownGroup.add(capMesh);

  // 42 Radial knurled teeth around the perimeter
  const numTeeth = 42;
  const toothGeo = new THREE.BoxGeometry(0.004, 0.052, 0.007);
  for (let i = 0; i < numTeeth; i++) {
    const angle = (i / numTeeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, chromeMaterial);
    tooth.position.x = Math.cos(angle) * 0.053;
    tooth.position.z = Math.sin(angle) * 0.053;
    tooth.rotation.y = -angle;
    crownGroup.add(tooth);
  }

  return crownGroup;
}

/**
 * Builds the flush oval Noise Control button.
 */
function createNoiseControlButton(material, bezelMaterial) {
  const buttonGroup = new THREE.Group();
  buttonGroup.name = 'noiseButton';

  // Outer bezel recess
  const bezelShape = new THREE.Shape();
  const bw = 0.14;
  const bh = 0.048;
  const br = 0.022;
  bezelShape.moveTo(-bw / 2 + br, -bh / 2);
  bezelShape.lineTo(bw / 2 - br, -bh / 2);
  bezelShape.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, -bh / 2 + br);
  bezelShape.lineTo(bw / 2, bh / 2 - br);
  bezelShape.quadraticCurveTo(bw / 2, bh / 2, bw / 2 - br, bh / 2);
  bezelShape.lineTo(-bw / 2 + br, bh / 2);
  bezelShape.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh / 2 - br);
  bezelShape.lineTo(-bw / 2, -bh / 2 + br);
  bezelShape.quadraticCurveTo(-bw / 2, -bh / 2, -bw / 2 + br, -bh / 2);

  const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.003,
    bevelThickness: 0.003
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMaterial);
  bezelMesh.rotation.x = Math.PI / 2;
  buttonGroup.add(bezelMesh);

  // Inner button pill
  const btnShape = new THREE.Shape();
  const pw = 0.126;
  const ph = 0.038;
  const pr = 0.018;
  btnShape.moveTo(-pw / 2 + pr, -ph / 2);
  btnShape.lineTo(pw / 2 - pr, -ph / 2);
  btnShape.quadraticCurveTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + pr);
  btnShape.lineTo(pw / 2, ph / 2 - pr);
  btnShape.quadraticCurveTo(pw / 2, ph / 2, pw / 2 - pr, ph / 2);
  btnShape.lineTo(-pw / 2 + pr, ph / 2);
  btnShape.quadraticCurveTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - pr);
  btnShape.lineTo(-pw / 2, -ph / 2 + pr);
  btnShape.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + pr, -ph / 2);

  const btnGeo = new THREE.ExtrudeGeometry(btnShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.005
  });
  const btnMesh = new THREE.Mesh(btnGeo, material);
  btnMesh.rotation.x = Math.PI / 2;
  btnMesh.position.y = 0.004;
  buttonGroup.add(btnMesh);

  return buttonGroup;
}

/**
 * Builds the 40mm dynamic driver assembly (for Exploded View).
 */
function createDriverAssembly(materials) {
  const driverGroup = new THREE.Group();
  driverGroup.name = 'driverAssembly';

  // Outer ring chassis
  const ringGeo = new THREE.TorusGeometry(0.24, 0.024, 16, 48);
  const ringMesh = new THREE.Mesh(ringGeo, materials.driverMetal);
  driverGroup.add(ringMesh);

  // Dual-neodymium central motor magnet
  const magnetGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32);
  const magnetMesh = new THREE.Mesh(magnetGeo, materials.neodymium);
  magnetMesh.rotation.x = Math.PI / 2;
  driverGroup.add(magnetMesh);

  // Copper voice coil ring
  const coilGeo = new THREE.TorusGeometry(0.125, 0.012, 12, 36);
  const coilMesh = new THREE.Mesh(coilGeo, materials.copper);
  driverGroup.add(coilMesh);

  // Acoustic dynamic dome diaphragm
  const domeGeo = new THREE.SphereGeometry(0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.38);
  const domeMesh = new THREE.Mesh(domeGeo, materials.diaphragm);
  domeMesh.rotation.x = -Math.PI / 2;
  domeMesh.scale.z = 0.3;
  driverGroup.add(domeMesh);

  // Spider suspension ring
  const spiderGeo = new THREE.RingGeometry(0.13, 0.23, 32);
  const spiderMesh = new THREE.Mesh(spiderGeo, materials.spider);
  driverGroup.add(spiderMesh);

  return driverGroup;
}

/**
 * Builds Apple H1 Chip & Logic Board Assembly (for Exploded View).
 */
function createH1LogicAssembly(materials) {
  const logicGroup = new THREE.Group();
  logicGroup.name = 'h1LogicAssembly';

  // Main curved PCB substrate
  const pcbShape = createCupShape(0.68, 0.88, 0.24);
  const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, {
    depth: 0.012,
    bevelEnabled: false
  });
  const pcbMesh = new THREE.Mesh(pcbGeo, materials.pcb);
  pcbMesh.position.z = -0.006;
  logicGroup.add(pcbMesh);

  // Apple H1 Chip Processor
  const h1Geo = new THREE.BoxGeometry(0.16, 0.16, 0.018);
  const h1Mesh = new THREE.Mesh(h1Geo, materials.h1Chip);
  h1Mesh.position.set(-0.08, 0.12, 0.01);
  logicGroup.add(h1Mesh);

  // Audio Power Management IC
  const pmicGeo = new THREE.BoxGeometry(0.11, 0.09, 0.015);
  const pmicMesh = new THREE.Mesh(pmicGeo, materials.chipMat);
  pmicMesh.position.set(0.12, 0.15, 0.01);
  logicGroup.add(pmicMesh);

  // Optical In-Ear Proximity Sensor
  const sensorGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.022, 16);
  const sensorMesh = new THREE.Mesh(sensorGeo, materials.sensor);
  sensorMesh.rotation.x = Math.PI / 2;
  sensorMesh.position.set(0, -0.18, 0.012);
  logicGroup.add(sensorMesh);

  // Flex ribbon cable connector
  const cableGeo = new THREE.BoxGeometry(0.045, 0.28, 0.006);
  const cableMesh = new THREE.Mesh(cableGeo, materials.flexCable);
  cableMesh.position.set(0.18, -0.05, 0.01);
  logicGroup.add(cableMesh);

  // Battery enclosure cell (for right cup)
  const batGeo = new THREE.BoxGeometry(0.24, 0.38, 0.06);
  const batMesh = new THREE.Mesh(batGeo, materials.battery);
  batMesh.position.set(-0.06, -0.1, 0.025);
  logicGroup.add(batMesh);

  return logicGroup;
}

/**
 * Main Factory: Builds the Complete Photorealistic AirPods Max + Smart Case Model.
 */
export function buildAirPodsMaxModel(renderer) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'airPodsMaxRoot';

  // 1. Procedural Textures
  const beadBlastedNormal = createBeadBlastedNormalMap(512);
  const canopyTex = createCanopyTextures(512);
  const cushionNormal = createCushionTextures(512);
  const acousticLeftTex = createAcousticMeshTexture('L', '#222326', 'rgba(255,255,255,0.22)');
  const acousticRightTex = createAcousticMeshTexture('R', '#222326', 'rgba(255,255,255,0.22)');
  const speakerBaffleTex = createSpeakerBaffleTexture(1024);
  const smartCaseNormal = createSmartCaseNormalMap(512);

  // 2. Initial Colors (Silver default)
  const initialColors = COLORWAYS.silver;

  // 3. Materials Library
  const materials = {
    aluminum: new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColors.aluminum),
      metalness: 0.92,
      roughness: 0.24,
      normalMap: beadBlastedNormal,
      normalScale: new THREE.Vector2(0.35, 0.35)
    }),
    aluminumTranslucent: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialColors.aluminum),
      metalness: 0.88,
      roughness: 0.22,
      transmission: 0.0, // animated to 0.75 in exploded view
      transparent: true,
      opacity: 1.0,
      ior: 1.45
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      metalness: 1.0,
      roughness: 0.05
    }),
    headbandSleeve: new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColors.canopy),
      metalness: 0.08,
      roughness: 0.45
    }),
    canopyMesh: new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColors.canopy),
      map: canopyTex.albedo,
      alphaMap: canopyTex.alpha,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.12,
      depthWrite: false
    }),
    cushionFabric: new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColors.cushion),
      roughness: 0.72,
      metalness: 0.10,
      normalMap: cushionNormal,
      normalScale: new THREE.Vector2(0.7, 0.7)
    }),
    acousticMeshLeft: new THREE.MeshStandardMaterial({
      map: acousticLeftTex,
      roughness: 0.85,
      metalness: 0.05
    }),
    acousticMeshRight: new THREE.MeshStandardMaterial({
      map: acousticRightTex,
      roughness: 0.85,
      metalness: 0.05
    }),
    bafflePlate: new THREE.MeshStandardMaterial({
      map: speakerBaffleTex,
      roughness: 0.42,
      metalness: 0.45
    }),
    smartCase: new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColors.case),
      roughness: 0.65,
      metalness: 0.08,
      normalMap: smartCaseNormal,
      normalScale: new THREE.Vector2(0.4, 0.4)
    }),
    smartCaseInterior: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1f2124'),
      roughness: 0.82,
      metalness: 0.02
    }),
    // Internal driver materials
    driverMetal: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#888c94'),
      metalness: 0.95,
      roughness: 0.18
    }),
    neodymium: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#222428'),
      metalness: 0.98,
      roughness: 0.12
    }),
    copper: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b86532'),
      metalness: 0.95,
      roughness: 0.22
    }),
    diaphragm: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#d4d8e0'),
      metalness: 0.2,
      roughness: 0.15,
      transmission: 0.35,
      transparent: true,
      opacity: 0.85
    }),
    spider: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d98c47'),
      roughness: 0.8,
      metalness: 0.05
    }),
    pcb: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1c2e22'), // Apple deep stealth green-black PCB
      roughness: 0.45,
      metalness: 0.25
    }),
    h1Chip: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18191c'),
      roughness: 0.22,
      metalness: 0.45
    }),
    chipMat: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#222326'),
      roughness: 0.35,
      metalness: 0.3
    }),
    sensor: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a1525'),
      roughness: 0.1,
      metalness: 0.8
    }),
    flexCable: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#947137'), // polyimide flex cable tone
      roughness: 0.3,
      metalness: 0.6
    }),
    battery: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#26282b'),
      roughness: 0.35,
      metalness: 0.65
    }),
    darkPlastic: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1b1c1e'),
      roughness: 0.5,
      metalness: 0.1
    })
  };

  // 4. Headband & Telescoping Stems
  const headbandGroup = new THREE.Group();
  headbandGroup.name = 'headbandGroup';

  // Dual Stainless Steel Spring Bows
  const bowRadius = 1.15;
  const bowCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.74, 0.75, 0.05),
    new THREE.Vector3(-0.55, 1.35, 0.05),
    new THREE.Vector3(0, 1.58, 0.05),
    new THREE.Vector3(0.55, 1.35, 0.05),
    new THREE.Vector3(0.74, 0.75, 0.05)
  ]);
  const bowCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.74, 0.75, -0.05),
    new THREE.Vector3(-0.55, 1.35, -0.05),
    new THREE.Vector3(0, 1.58, -0.05),
    new THREE.Vector3(0.55, 1.35, -0.05),
    new THREE.Vector3(0.74, 0.75, -0.05)
  ]);

  const bowGeo1 = new THREE.TubeGeometry(bowCurve1, 64, 0.016, 16, false);
  const bowGeo2 = new THREE.TubeGeometry(bowCurve2, 64, 0.016, 16, false);
  const bowMesh1 = new THREE.Mesh(bowGeo1, materials.chrome);
  const bowMesh2 = new THREE.Mesh(bowGeo2, materials.chrome);
  bowMesh1.castShadow = true;
  bowMesh2.castShadow = true;
  headbandGroup.add(bowMesh1, bowMesh2);

  // Soft-Touch Headband Sleeves (left & right silicone grips)
  const sleeveCurveL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.74, 0.75, 0),
    new THREE.Vector3(-0.62, 1.18, 0),
    new THREE.Vector3(-0.45, 1.42, 0)
  ]);
  const sleeveGeoL = new THREE.TubeGeometry(sleeveCurveL, 32, 0.075, 24, false);
  const sleeveMeshL = new THREE.Mesh(sleeveGeoL, materials.headbandSleeve);
  sleeveMeshL.scale.set(1, 1, 0.75);
  sleeveMeshL.castShadow = true;

  const sleeveCurveR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.45, 1.42, 0),
    new THREE.Vector3(0.62, 1.18, 0),
    new THREE.Vector3(0.74, 0.75, 0)
  ]);
  const sleeveGeoR = new THREE.TubeGeometry(sleeveCurveR, 32, 0.075, 24, false);
  const sleeveMeshR = new THREE.Mesh(sleeveGeoR, materials.headbandSleeve);
  sleeveMeshR.scale.set(1, 1, 0.75);
  sleeveMeshR.castShadow = true;
  headbandGroup.add(sleeveMeshL, sleeveMeshR);

  // Breathable Knit-Mesh Canopy (Suspended mesh ribbon spanning the top arch)
  const canopyCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.52, 1.35, 0),
    new THREE.Vector3(-0.30, 1.50, 0),
    new THREE.Vector3(0, 1.56, 0),
    new THREE.Vector3(0.30, 1.50, 0),
    new THREE.Vector3(0.52, 1.35, 0)
  ]);
  const canopyPoints = canopyCurve.getPoints(48);
  const canopyWidth = 0.26;
  const canopyGeo = new THREE.PlaneGeometry(canopyWidth, 1.0, 16, 48);
  // Deform plane to follow canopyCurve
  const pos = canopyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vIdx = Math.floor(i / 17);
    const uIdx = i % 17;
    const pt = canopyPoints[vIdx] || canopyPoints[canopyPoints.length - 1];
    const uOffset = (uIdx / 16 - 0.5) * canopyWidth;
    pos.setXYZ(i, pt.x, pt.y - 0.02, pt.z + uOffset);
  }
  canopyGeo.computeVertexNormals();
  const canopyMesh = new THREE.Mesh(canopyGeo, materials.canopyMesh);
  headbandGroup.add(canopyMesh);

  // Telescoping Chrome Extension Rods (Slide out of the sleeves into cup pivot)
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.38, 24);

  const leftRodGroup = new THREE.Group();
  leftRodGroup.name = 'leftRodGroup';
  leftRodGroup.position.set(-0.76, 0.62, 0);
  leftRodGroup.rotation.z = 0.20;
  const leftRodMesh = new THREE.Mesh(rodGeo, materials.chrome);
  leftRodGroup.add(leftRodMesh);

  // Stem Swivel Joint Collar (Apple's stainless steel cylindrical pivot joint)
  const collarGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.052, 28);
  const collarMeshL = new THREE.Mesh(collarGeo, materials.chrome);
  collarMeshL.position.y = -0.19;
  leftRodGroup.add(collarMeshL);

  const rightRodGroup = new THREE.Group();
  rightRodGroup.name = 'rightRodGroup';
  rightRodGroup.position.set(0.76, 0.62, 0);
  rightRodGroup.rotation.z = -0.20;
  const rightRodMesh = new THREE.Mesh(rodGeo, materials.chrome);
  rightRodGroup.add(rightRodMesh);

  const collarMeshR = new THREE.Mesh(collarGeo, materials.chrome);
  collarMeshR.position.y = -0.19;
  rightRodGroup.add(collarMeshR);

  headbandGroup.add(leftRodGroup, rightRodGroup);
  rootGroup.add(headbandGroup);

  // 5. Ear Cups Construction
  const cupShape = createCupShape(0.88, 1.15, 0.32);
  const cupExtrudeSettings = {
    depth: 0.18,
    bevelEnabled: true,
    bevelSegments: 16,
    steps: 2,
    bevelSize: 0.08,
    bevelThickness: 0.09
  };

  // Left Ear Cup Hierarchy
  const leftCupPivot = new THREE.Group();
  leftCupPivot.name = 'leftCupPivot';
  leftCupPivot.position.set(-0.84, 0.28, 0);
  leftCupPivot.rotation.z = 0.16; // natural human ear tilt

  const leftCupShellGeo = new THREE.ExtrudeGeometry(cupShape, cupExtrudeSettings);
  leftCupShellGeo.center();
  const leftCupShell = new THREE.Mesh(leftCupShellGeo, materials.aluminum);
  leftCupShell.castShadow = true;
  leftCupShell.receiveShadow = true;
  leftCupPivot.add(leftCupShell);

  // Left Cup Acoustic Vent Slits (bottom)
  const ventGeo = new THREE.BoxGeometry(0.08, 0.012, 0.02);
  const leftVent = new THREE.Mesh(ventGeo, materials.darkPlastic);
  leftVent.position.set(0, -0.62, 0.02);
  leftCupPivot.add(leftVent);

  // Left Inner Baffle Plate
  const baffleGeo = new THREE.PlaneGeometry(0.78, 1.05);
  const leftBaffle = new THREE.Mesh(baffleGeo, materials.bafflePlate);
  leftBaffle.position.set(0, 0, 0.18);
  leftCupPivot.add(leftBaffle);

  // Left Cushion Assembly (Detachable in Stage 5)
  const leftCushionGroup = new THREE.Group();
  leftCushionGroup.name = 'leftCushionGroup';
  leftCushionGroup.position.set(0, 0, 0.20);

  // Cushion Memory Foam Torus / Rounded Rim
  const cushionShape = createCupShape(0.86, 1.12, 0.30);
  const cushionExtrude = {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 12,
    steps: 1,
    bevelSize: 0.05,
    bevelThickness: 0.05
  };
  const cushionGeo = new THREE.ExtrudeGeometry(cushionShape, cushionExtrude);
  cushionGeo.center();
  const leftCushionRing = new THREE.Mesh(cushionGeo, materials.cushionFabric);
  leftCushionRing.castShadow = true;
  leftCushionGroup.add(leftCushionRing);

  // Left Knitted 'L' Acoustic Fabric
  const innerMeshGeo = new THREE.PlaneGeometry(0.64, 0.88);
  const leftAcousticMesh = new THREE.Mesh(innerMeshGeo, materials.acousticMeshLeft);
  leftAcousticMesh.position.set(0, 0, 0.07);
  leftCushionGroup.add(leftAcousticMesh);

  // Left Magnetic Alignment Flange
  const flangeGeo = new THREE.BoxGeometry(0.76, 1.02, 0.01);
  const leftFlange = new THREE.Mesh(flangeGeo, materials.darkPlastic);
  leftFlange.position.set(0, 0, -0.06);
  leftCushionGroup.add(leftFlange);

  leftCupPivot.add(leftCushionGroup);
  rootGroup.add(leftCupPivot);

  // 6. Right Ear Cup Hierarchy (Contains Digital Crown, Noise Button & Exploded View layers)
  const rightCupPivot = new THREE.Group();
  rightCupPivot.name = 'rightCupPivot';
  rightCupPivot.position.set(0.84, 0.28, 0);
  rightCupPivot.rotation.z = -0.16;

  // Outer Aluminum Shell
  const rightCupShellGeo = new THREE.ExtrudeGeometry(cupShape, cupExtrudeSettings);
  rightCupShellGeo.center();
  const rightCupShell = new THREE.Mesh(rightCupShellGeo, materials.aluminumTranslucent);
  rightCupShell.castShadow = true;
  rightCupShell.receiveShadow = true;
  rightCupPivot.add(rightCupShell);

  // Precision Controls on Right Cup
  // Digital Crown (Knurled dial positioned on top perimeter)
  const digitalCrown = createDigitalCrown(materials.aluminum, materials.chrome);
  digitalCrown.position.set(0.18, 0.65, 0.04);
  digitalCrown.rotation.x = 0.35;
  digitalCrown.rotation.z = -0.45;
  rightCupPivot.add(digitalCrown);

  // Noise Control Button (Flush pill button forward of the crown)
  const noiseButton = createNoiseControlButton(materials.aluminum, materials.darkPlastic);
  noiseButton.position.set(-0.16, 0.66, 0.04);
  noiseButton.rotation.x = 0.35;
  noiseButton.rotation.z = 0.45;
  rightCupPivot.add(noiseButton);

  // Right Cup Microphone Slits & Lightning/USB-C Port
  const rightVent = new THREE.Mesh(ventGeo, materials.darkPlastic);
  rightVent.position.set(0, -0.62, 0.02);
  rightCupPivot.add(rightVent);

  const crownMic = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.01), materials.darkPlastic);
  crownMic.position.set(0.26, 0.52, 0.12);
  crownMic.rotation.z = -0.45;
  rightCupPivot.add(crownMic);

  // Exploded View Assembly Layers on Right Ear Cup
  // Organizes all 5 internal components for Stage 6 separation along the X-axis!
  const explodedGroup = new THREE.Group();
  explodedGroup.name = 'explodedGroup';

  // Layer 1: Internal Structural Die-Cast Frame
  const frameShape = createCupShape(0.76, 0.98, 0.26);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.015,
    bevelThickness: 0.015
  });
  frameGeo.center();
  const internalFrame = new THREE.Mesh(frameGeo, materials.darkPlastic);
  internalFrame.position.set(0, 0, 0.04);
  explodedGroup.add(internalFrame);

  // Layer 2: Apple H1 Logic Board & Electronics Assembly
  const h1Assembly = createH1LogicAssembly(materials);
  h1Assembly.position.set(0, 0, 0.08);
  explodedGroup.add(h1Assembly);

  // Layer 3: 40mm Dynamic Acoustic Driver Assembly
  const driverAssembly = createDriverAssembly(materials);
  driverAssembly.position.set(0, 0, 0.13);
  explodedGroup.add(driverAssembly);

  // Layer 4: Perforated Acoustic Baffle Plate
  const rightBaffle = new THREE.Mesh(baffleGeo, materials.bafflePlate);
  rightBaffle.position.set(0, 0, 0.18);
  explodedGroup.add(rightBaffle);

  // Layer 5: Right Cushion Assembly (Detachable in Stage 5, Exploded in Stage 6)
  const rightCushionGroup = new THREE.Group();
  rightCushionGroup.name = 'rightCushionGroup';
  rightCushionGroup.position.set(0, 0, 0.20);

  const rightCushionRing = new THREE.Mesh(cushionGeo, materials.cushionFabric);
  rightCushionRing.castShadow = true;
  rightCushionGroup.add(rightCushionRing);

  const rightAcousticMesh = new THREE.Mesh(innerMeshGeo, materials.acousticMeshRight);
  rightAcousticMesh.position.set(0, 0, 0.07);
  rightCushionGroup.add(rightAcousticMesh);

  const rightFlange = new THREE.Mesh(flangeGeo, materials.darkPlastic);
  rightFlange.position.set(0, 0, -0.06);
  rightCushionGroup.add(rightFlange);

  explodedGroup.add(rightCushionGroup);
  rightCupPivot.add(explodedGroup);
  rootGroup.add(rightCupPivot);

  // 7. Smart Case (Stage 7 Finale)
  // Contoured soft-touch microfiber shell with articulated magnetic flap
  const smartCaseGroup = new THREE.Group();
  smartCaseGroup.name = 'smartCaseGroup';
  smartCaseGroup.position.set(0, -2.8, 0); // starts lowered below view

  // Case Body (Two molded pouches cradling swiveled ear cups)
  const caseWidth = 2.45;
  const caseHeight = 1.35;
  const casePocketShape = new THREE.Shape();
  // Double-chamber contoured case profile
  casePocketShape.moveTo(-1.15, -0.55);
  casePocketShape.quadraticCurveTo(-1.25, 0.35, -0.45, 0.55);
  casePocketShape.quadraticCurveTo(0, 0.35, 0.45, 0.55);
  casePocketShape.quadraticCurveTo(1.25, 0.35, 1.15, -0.55);
  casePocketShape.quadraticCurveTo(0.65, -0.65, 0.0, -0.35);
  casePocketShape.quadraticCurveTo(-0.65, -0.65, -1.15, -0.55);

  const caseGeo = new THREE.ExtrudeGeometry(casePocketShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSegments: 12,
    bevelSize: 0.06,
    bevelThickness: 0.06
  });
  caseGeo.center();
  const caseBody = new THREE.Mesh(caseGeo, materials.smartCase);
  caseBody.castShadow = true;
  caseBody.receiveShadow = true;
  smartCaseGroup.add(caseBody);

  // Case Inner Lining Cavity (dark soft microfiber)
  const caseInnerGeo = new THREE.BoxGeometry(2.1, 1.05, 0.28);
  const caseInner = new THREE.Mesh(caseInnerGeo, materials.smartCaseInterior);
  caseInner.position.y = 0.05;
  smartCaseGroup.add(caseInner);

  // Articulated Magnetic Top Flap with Hinge
  const flapHingeGroup = new THREE.Group();
  flapHingeGroup.name = 'flapHingeGroup';
  flapHingeGroup.position.set(0, 0.58, -0.16); // Top hinge pivot

  const flapShape = new THREE.Shape();
  const fw = 0.95;
  const fh = 0.65;
  const fr = 0.16;
  flapShape.moveTo(-fw / 2 + fr, 0);
  flapShape.lineTo(fw / 2 - fr, 0);
  flapShape.quadraticCurveTo(fw / 2, 0, fw / 2, -fr);
  flapShape.lineTo(fw / 2, -fh + fr);
  flapShape.quadraticCurveTo(fw / 2, -fh, fw / 2 - fr, -fh);
  flapShape.lineTo(-fw / 2 + fr, -fh);
  flapShape.quadraticCurveTo(-fw / 2, -fh, -fw / 2, -fh + fr);
  flapShape.lineTo(-fw / 2, -fr);
  flapShape.quadraticCurveTo(-fw / 2, 0, -fw / 2 + fr, 0);

  const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: 0.012,
    bevelThickness: 0.012
  });
  const flapMesh = new THREE.Mesh(flapGeo, materials.smartCase);
  flapMesh.position.set(0, 0, 0.01);
  flapHingeGroup.add(flapMesh);

  // Magnetic closure clasp pill
  const claspGeo = new THREE.BoxGeometry(0.18, 0.04, 0.03);
  const claspMesh = new THREE.Mesh(claspGeo, materials.chrome);
  claspMesh.position.set(0, -0.52, 0.018);
  flapHingeGroup.add(claspMesh);

  // Start with flap flipped open backwards
  flapHingeGroup.rotation.x = -Math.PI * 0.65;
  smartCaseGroup.add(flapHingeGroup);

  rootGroup.add(smartCaseGroup);

  // 8. 3D Anchor Sockets for Screen Space Leader Lines
  const anchors = {
    digitalCrown,
    noiseButton,
    canopy: canopyMesh,
    cushionMesh: rightCushionRing,
    acousticDriver: driverAssembly,
    h1Chip: h1Assembly,
    speakerBaffle: rightBaffle,
    smartCase: smartCaseGroup
  };

  // 9. Exploded View Layer Definitions (relative offsets when expanded)
  const explodedLayers = [
    { mesh: rightCupShell, offsetX: -0.65, rotY: -0.2 },
    { mesh: internalFrame, offsetX: -0.28, rotY: 0 },
    { mesh: h1Assembly, offsetX: 0.12, rotY: 0.1 },
    { mesh: driverAssembly, offsetX: 0.52, rotY: 0 },
    { mesh: rightBaffle, offsetX: 0.95, rotY: 0 },
    { mesh: rightCushionGroup, offsetX: 1.45, rotY: 0.15 }
  ];

  // Helper method to dynamically switch colorway with smooth interpolation
  function setColorway(colorwayKey) {
    const colorway = COLORWAYS[colorwayKey] || COLORWAYS.silver;
    const aluColor = new THREE.Color(colorway.aluminum);
    const canopyColor = new THREE.Color(colorway.canopy);
    const cushionColor = new THREE.Color(colorway.cushion);
    const caseColor = new THREE.Color(colorway.case);

    materials.aluminum.color.copy(aluColor);
    materials.aluminumTranslucent.color.copy(aluColor);
    materials.headbandSleeve.color.copy(canopyColor);
    materials.canopyMesh.color.copy(canopyColor);
    materials.cushionFabric.color.copy(cushionColor);
    materials.smartCase.color.copy(caseColor);
  }

  return {
    rootGroup,
    headbandGroup,
    leftCupPivot,
    rightCupPivot,
    leftCushionGroup,
    rightCushionGroup,
    digitalCrown,
    noiseButton,
    explodedGroup,
    explodedLayers,
    smartCaseGroup,
    flapHingeGroup,
    anchors,
    materials,
    setColorway
  };
}
