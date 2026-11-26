import * as THREE from 'three';
import { COLORWAYS, ColorwaySpec } from '../data/colorways';
import { getProceduralTextures } from './proceduralTextures';
import {
  createEarCupShellGeometry,
  createEarCushionGeometry,
  createHeadbandGeometries,
  createSmartCaseGeometries,
  createStadiumPlateGeometry,
  createStadiumRingGeometry,
  sampleHeadbandArch,
} from './geometries';

export interface AirPodsMaterials {
  aluminum: THREE.MeshPhysicalMaterial;
  crownMetal: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  headbandSleeve: THREE.MeshStandardMaterial;
  canopyMesh: THREE.MeshStandardMaterial;
  cushionKnit: THREE.MeshStandardMaterial;
  innerMeshL: THREE.MeshStandardMaterial;
  innerMeshR: THREE.MeshStandardMaterial;
  bafflePolymer: THREE.MeshStandardMaterial;
  baffleGrille: THREE.MeshStandardMaterial;
  darkRecess: THREE.MeshStandardMaterial;
  matteBlackInternal: THREE.MeshStandardMaterial;
  pcbBoard: THREE.MeshStandardMaterial;
  copperMetal: THREE.MeshStandardMaterial;
  driverDiaphragm: THREE.MeshStandardMaterial;
  smartCaseOuter: THREE.MeshStandardMaterial;
  smartCaseCrease: THREE.MeshStandardMaterial;
}

export interface CupRig {
  side: 'L' | 'R';
  stemPivot: THREE.Group;
  telescopingRod: THREE.Mesh;
  gimbalPivot: THREE.Group;
  swivelGroup: THREE.Group;
  cupBody: THREE.Group;
  // Explodable / Detachable layers inside cupBody:
  shellLayer: THREE.Group;       // Layer 1: Anodized shell + internal bracket
  electronicsLayer?: THREE.Group; // Layer 2: H1 SiP & Crown/Button switches (Right cup)
  driverLayer: THREE.Group;      // Layer 3: 40mm dual-neodymium ring driver
  baffleLayer: THREE.Group;      // Layer 4: Acoustic baffle chassis & honeycomb grille
  cushionLayer: THREE.Group;     // Layer 5: Detachable magnetic memory-foam cushion
  crownDial?: THREE.Group;
  ancButton?: THREE.Mesh;
}

export interface AirPodsMaxAssembly {
  rootGroup: THREE.Group;
  headsetGroup: THREE.Group;
  headbandGroup: THREE.Group;
  leftCup: CupRig;
  rightCup: CupRig;
  smartCaseGroup: THREE.Group;
  smartCaseFlapPivot: THREE.Group;
  materials: AirPodsMaterials;
  sockets: Record<string, THREE.Object3D>;
  applyInterpolatedColorway: (from: ColorwaySpec, to: ColorwaySpec, alpha: number) => void;
}

const tempC1 = new THREE.Color();
const tempC2 = new THREE.Color();

function lerpHexToMaterialColor(target: THREE.Color, hexA: string, hexB: string, t: number) {
  tempC1.set(hexA);
  tempC2.set(hexB);
  target.lerpColors(tempC1, tempC2, t);
}

export function createAirPodsMaxAssembly(): AirPodsMaxAssembly {
  const tex = getProceduralTextures();
  const initial = COLORWAYS[0];

  // ==========================================
  // 1. Physically Based Materials (PBR)
  // ==========================================
  const aluminum = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initial.aluminum),
    metalness: initial.aluminumMetalness,
    roughness: initial.aluminumRoughness,
    normalMap: tex.aluminumNormal,
    normalScale: new THREE.Vector2(0.038, 0.038),
    roughnessMap: tex.aluminumRoughness,
    clearcoat: 0.14,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });

  const crownMetal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initial.aluminum),
    metalness: 0.94,
    roughness: 0.19,
    clearcoat: 0.18,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.45,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fafafa'),
    metalness: 1.0,
    roughness: 0.045,
    envMapIntensity: 1.65,
  });

  const headbandSleeve = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.headbandSleeve),
    metalness: 0.04,
    roughness: 0.68,
    normalMap: tex.leatherGrainNormal,
    normalScale: new THREE.Vector2(0.04, 0.04),
    envMapIntensity: 0.65,
  });

  const canopyMesh = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.canopy),
    alphaMap: tex.canopyAlpha,
    bumpMap: tex.canopyBump,
    bumpScale: 0.018,
    transparent: true,
    alphaTest: 0.18,
    metalness: 0.02,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });

  const cushionKnit = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.cushion),
    map: tex.knitAlbedoMod,
    normalMap: tex.knitNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    bumpMap: tex.knitBump,
    bumpScale: 0.025,
    metalness: 0.02,
    roughness: 0.88,
    envMapIntensity: 0.5,
  });

  const innerMeshL = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.innerMesh),
    map: tex.innerMeshL,
    bumpMap: tex.innerMeshBump,
    bumpScale: 0.015,
    metalness: 0.0,
    roughness: 0.92,
  });

  const innerMeshR = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.innerMesh),
    map: tex.innerMeshR,
    bumpMap: tex.innerMeshBump,
    bumpScale: 0.015,
    metalness: 0.0,
    roughness: 0.92,
  });

  const bafflePolymer = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.baffle),
    metalness: 0.08,
    roughness: 0.58,
    envMapIntensity: 0.7,
  });

  const baffleGrille = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.baffle),
    alphaMap: tex.baffleGrilleAlpha,
    bumpMap: tex.baffleGrilleBump,
    bumpScale: 0.02,
    transparent: true,
    alphaTest: 0.35,
    metalness: 0.12,
    roughness: 0.52,
    side: THREE.DoubleSide,
  });

  const darkRecess = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#101216'),
    metalness: 0.25,
    roughness: 0.75,
  });

  const matteBlackInternal = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#191b20'),
    metalness: 0.22,
    roughness: 0.48,
    envMapIntensity: 0.9,
  });

  const pcbBoard = new THREE.MeshStandardMaterial({
    map: tex.pcbDetailAlbedo,
    metalness: 0.45,
    roughness: 0.38,
  });

  const copperMetal = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d68b59'),
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.4,
  });

  const driverDiaphragm = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#202329'),
    bumpMap: tex.driverConeBump,
    bumpScale: 0.028,
    metalness: 0.32,
    roughness: 0.36,
  });

  const smartCaseOuter = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.smartCase),
    normalMap: tex.leatherGrainNormal,
    normalScale: new THREE.Vector2(0.08, 0.08),
    metalness: 0.03,
    roughness: 0.72,
    envMapIntensity: 0.65,
    side: THREE.DoubleSide,
  });

  const smartCaseCrease = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.smartCaseInner),
    metalness: 0.05,
    roughness: 0.8,
  });

  const materials: AirPodsMaterials = {
    aluminum,
    crownMetal,
    chrome,
    headbandSleeve,
    canopyMesh,
    cushionKnit,
    innerMeshL,
    innerMeshR,
    bafflePolymer,
    baffleGrille,
    darkRecess,
    matteBlackInternal,
    pcbBoard,
    copperMetal,
    driverDiaphragm,
    smartCaseOuter,
    smartCaseCrease,
  };

  const rootGroup = new THREE.Group();
  const headsetGroup = new THREE.Group();
  rootGroup.add(headsetGroup);

  const sockets: Record<string, THREE.Object3D> = {};
  const registerSocket = (key: string, parent: THREE.Object3D, pos: [number, number, number]) => {
    const node = new THREE.Object3D();
    node.position.set(...pos);
    parent.add(node);
    sockets[key] = node;
    return node;
  };

  // ==========================================
  // 2. Headband Arch + Breathable Knit Canopy
  // ==========================================
  const headbandGroup = new THREE.Group();
  headsetGroup.add(headbandGroup);

  const { frameGeometry, canopyGeometry } = createHeadbandGeometries();
  const frameMesh = new THREE.Mesh(frameGeometry, headbandSleeve);
  const canopySurface = new THREE.Mesh(canopyGeometry, canopyMesh);
  headbandGroup.add(frameMesh, canopySurface);

  registerSocket('canopySocket', headbandGroup, [0, 2.42, 0.08]);

  // Shared High-Segment Geometries for Ear Cups
  const cupShellGeo = createEarCupShellGeometry(0.82, 1.04, 0.58, 0.54);
  const cushionGeo = createEarCushionGeometry(0.62, 0.84, 0.42, 0.205, 0.195);
  const innerScrimGeo = createStadiumPlateGeometry(0.45, 0.67, 0.30, 0.012);
  const rearCushionFrameGeo = createStadiumRingGeometry(0.75, 0.97, 0.50, 0.47, 0.69, 0.31, 0.04, 0.008);
  const baffleOuterRingGeo = createStadiumRingGeometry(0.77, 0.99, 0.52, 0.41, 0.61, 0.28, 0.035, 0.009);
  const baffleGrillePlateGeo = createStadiumPlateGeometry(0.43, 0.63, 0.29, 0.014);
  const internalFrameGeo = createStadiumRingGeometry(0.74, 0.95, 0.48, 0.48, 0.70, 0.30, 0.055, 0.008);

  // ==========================================
  // 3. Multi-Layer Ear Cup Builder (L & R)
  // ==========================================
  const buildEarCup = (side: 'L' | 'R'): CupRig => {
    const sign = side === 'R' ? 1 : -1;
    const archEnd = sampleHeadbandArch(sign * 1.0);

    // Stem Pivot sits right at the bottom of the silicone headband sleeve
    const stemPivot = new THREE.Group();
    stemPivot.position.copy(archEnd.pos);
    // Base inward angle matching headband tangent (~15.5 deg inward)
    stemPivot.rotation.z = -sign * 0.25;
    headsetGroup.add(stemPivot);

    // Polished stainless-steel collar ring at base of headband sleeve
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.090, 0.068, 36), chrome);
    ferrule.position.set(0, -0.015, 0);
    stemPivot.add(ferrule);

    const ferruleLip = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 12, 36), darkRecess);
    ferruleLip.rotation.x = Math.PI * 0.5;
    ferruleLip.position.set(0, -0.049, 0);
    stemPivot.add(ferruleLip);

    // Mirror-polished chrome telescoping stainless-steel rod
    const rodLen = 0.34;
    const telescopingRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, rodLen, 36),
      chrome
    );
    telescopingRod.position.set(0, -rodLen * 0.5 - 0.02, 0);
    stemPivot.add(telescopingRod);

    // Gimbal ball-joint pivot at end of telescoping rod
    const gimbalPivot = new THREE.Group();
    gimbalPivot.position.set(0, -rodLen + 0.02, 0);
    // Undo stemPivot base tilt so swivelGroup starts in clean upright world axes
    gimbalPivot.rotation.z = sign * 0.25;
    stemPivot.add(gimbalPivot);

    const swivelGroup = new THREE.Group();
    gimbalPivot.add(swivelGroup);

    // Cup Body offset so its top gimbal socket (0, +1.01, +0.23) locks right onto gimbalPivot (0,0,0)
    const cupBody = new THREE.Group();
    cupBody.position.set(0, -1.01, -0.23);
    swivelGroup.add(cupBody);

    // ---------------------------------------------------------
    // LAYER 1: Anodized Aluminum Outer Shell + Internal Bracket
    // ---------------------------------------------------------
    const shellLayer = new THREE.Group();
    cupBody.add(shellLayer);

    const shellMesh = new THREE.Mesh(cupShellGeo, aluminum);
    shellLayer.add(shellMesh);

    // Top recessed gimbal socket collar on cup shoulder
    const gimbalSocketRecess = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.072, 0.06, 32),
      darkRecess
    );
    gimbalSocketRecess.position.set(0, 1.01, 0.23);
    shellLayer.add(gimbalSocketRecess);

    const gimbalChromeBall = new THREE.Mesh(new THREE.SphereGeometry(0.062, 24, 24), chrome);
    gimbalChromeBall.position.set(0, 1.01, 0.23);
    shellLayer.add(gimbalChromeBall);

    // Upper front beamforming microphone pill slit (4.22.11 PM (2).jpeg & 4.22.11 PM.jpeg)
    // On R cup, front-facing flank is -X; on L cup, front-facing flank is +X!
    const frontFlankSign = side === 'R' ? -1 : 1;
    const upperMicGroup = new THREE.Group();
    upperMicGroup.position.set(frontFlankSign * 0.72, 0.68, 0.23);
    upperMicGroup.lookAt(frontFlankSign * 2.2, 0.85, 0.45);
    const micSlot = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.075, 8, 16), darkRecess);
    micSlot.rotation.z = Math.PI * 0.12 * frontFlankSign;
    upperMicGroup.add(micSlot);
    shellLayer.add(upperMicGroup);

    if (side === 'R') {
      registerSocket('upperMicSocket', upperMicGroup, [0, 0, 0.02]);
    }

    // Bottom acoustic vent & beamforming mic slits + Lightning/USB-C port
    for (const s of [-1, 1]) {
      const botVent = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.08, 8, 16), darkRecess);
      botVent.position.set(s * 0.26, -1.01, 0.22);
      botVent.rotation.z = Math.PI * 0.5;
      botVent.rotation.x = 0.25;
      shellLayer.add(botVent);
    }
    if (side === 'R') {
      const portCutout = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.11, 8, 16), darkRecess);
      portCutout.position.set(0, -1.032, 0.23);
      portCutout.rotation.z = Math.PI * 0.5;
      shellLayer.add(portCutout);
    }

    // Internal CNC structural mounting bracket inside shell cavity (visible in Stage 6 Exploded View!)
    const internalBracket = new THREE.Mesh(internalFrameGeo, matteBlackInternal);
    internalBracket.position.set(0, 0, 0.14);
    shellLayer.add(internalBracket);

    // Internal chrome screw bosses & copper antenna wire (exact detail in 4.22.11 PM (1).jpeg!)
    const screwOffsets: Array<[number, number]> = [
      [-0.56, 0.55],
      [0.56, 0.55],
      [-0.56, -0.55],
      [0.56, -0.55],
      [-0.32, 0.82],
      [0.32, -0.82],
    ];
    const bossGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.03, 16);
    bossGeo.rotateX(Math.PI * 0.5);
    for (const [bx, by] of screwOffsets) {
      const boss = new THREE.Mesh(bossGeo, chrome);
      boss.position.set(bx, by, 0.11);
      shellLayer.add(boss);
    }

    const copperPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.45, 0.68, 0.15),
      new THREE.Vector3(0.60, 0.32, 0.14),
      new THREE.Vector3(0.60, -0.32, 0.14),
      new THREE.Vector3(0.44, -0.66, 0.15),
    ]);
    const copperWire = new THREE.Mesh(new THREE.TubeGeometry(copperPath, 32, 0.012, 8, false), copperMetal);
    shellLayer.add(copperWire);

    // Precision Controls on Right Ear Cup: Digital Crown + Noise Control Button
    let crownDial: THREE.Group | undefined;
    let ancButton: THREE.Mesh | undefined;
    let electronicsLayer: THREE.Group | undefined;

    if (side === 'R') {
      registerSocket('expShellSocket', shellLayer, [0, 0.55, 0.34]);

      // --- DIGITAL CROWN (84 Individual Radial Knurled Ridges!) ---
      const crownMount = new THREE.Group();
      crownMount.position.set(-0.42, 0.94, 0.25);
      // Orient axis normal to upper-front curved shoulder
      crownMount.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-0.48, 0.85, 0.20).normalize()
      );
      shellLayer.add(crownMount);

      // Dark precision bezel collar seated in aluminum shell
      const crownBezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.142, 0.146, 0.05, 48),
        darkRecess
      );
      crownBezel.position.y = 0.008;
      crownMount.add(crownBezel);

      // Rotating dial group
      crownDial = new THREE.Group();
      crownDial.position.y = 0.048;
      crownMount.add(crownDial);

      const crownRadius = 0.128;
      const crownHeight = 0.076;
      const crownCore = new THREE.Mesh(
        new THREE.CylinderGeometry(crownRadius * 0.97, crownRadius * 0.99, crownHeight, 64),
        crownMetal
      );
      crownDial.add(crownCore);

      // Top beveled rim & micro-dished brushed cap
      const crownCapBevel = new THREE.Mesh(
        new THREE.TorusGeometry(crownRadius * 0.89, 0.013, 16, 64),
        chrome
      );
      crownCapBevel.rotation.x = Math.PI * 0.5;
      crownCapBevel.position.y = crownHeight * 0.48;
      crownDial.add(crownCapBevel);

      const crownCap = new THREE.Mesh(
        new THREE.CylinderGeometry(crownRadius * 0.88, crownRadius * 0.88, 0.012, 48),
        aluminum
      );
      crownCap.position.y = crownHeight * 0.5;
      crownDial.add(crownCap);

      // 84 Instanced Radial Knurled Ridges around circumference
      const knurlCount = 84;
      const knurlGeo = new THREE.BoxGeometry(0.0055, crownHeight * 0.86, 0.014);
      const knurlInstanced = new THREE.InstancedMesh(knurlGeo, crownMetal, knurlCount);
      const dummy = new THREE.Object3D();
      for (let k = 0; k < knurlCount; k++) {
        const angle = (k / knurlCount) * Math.PI * 2;
        dummy.position.set(
          Math.sin(angle) * (crownRadius * 0.985),
          0,
          Math.cos(angle) * (crownRadius * 0.985)
        );
        dummy.rotation.set(0, angle, 0);
        dummy.updateMatrix();
        knurlInstanced.setMatrixAt(k, dummy.matrix);
      }
      knurlInstanced.instanceMatrix.needsUpdate = true;
      crownDial.add(knurlInstanced);

      registerSocket('crownSocket', crownDial, [0, 0.045, 0]);

      // --- NOISE CONTROL BUTTON (Flush Pill Tactile Button behind stem) ---
      const ancMount = new THREE.Group();
      ancMount.position.set(0.37, 0.96, 0.25);
      ancMount.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0.42, 0.88, 0.18).normalize()
      );
      shellLayer.add(ancMount);

      const ancRecess = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.135, 12, 24), darkRecess);
      ancRecess.rotation.z = Math.PI * 0.5;
      ancRecess.scale.set(1, 1, 0.62);
      ancMount.add(ancRecess);

      ancButton = new THREE.Mesh(new THREE.CapsuleGeometry(0.040, 0.125, 16, 28), crownMetal);
      ancButton.rotation.z = Math.PI * 0.5;
      ancButton.scale.set(1, 1, 0.62);
      ancButton.position.y = 0.022;
      ancMount.add(ancButton);

      registerSocket('ancButtonSocket', ancButton, [0, 0.03, 0]);

      // ------------------------------------------------------------------
      // LAYER 2: Apple H1 SiP, Logic Board & Switch Flex Assembly (Exploded)
      // Reference: 4.22.11 PM (1).jpeg Layer 2
      // ------------------------------------------------------------------
      electronicsLayer = new THREE.Group();
      electronicsLayer.position.set(0, 0, 0.09);
      cupBody.add(electronicsLayer);

      // Curved bottom PCB carrier
      const pcbArc = createStadiumRingGeometry(0.64, 0.84, 0.42, 0.44, 0.64, 0.28, 0.022, 0.003);
      const pcbMesh = new THREE.Mesh(pcbArc, pcbBoard);
      electronicsLayer.add(pcbMesh);

      // Dual matte-black EMI-shielded H1 SiP & battery management enclosures
      const h1ShieldLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.66, 0.09), matteBlackInternal);
      h1ShieldLeft.position.set(-0.22, -0.06, -0.02);
      electronicsLayer.add(h1ShieldLeft);

      const h1ShieldRight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.48, 0.085), matteBlackInternal);
      h1ShieldRight.position.set(0.20, -0.08, -0.02);
      electronicsLayer.add(h1ShieldRight);

      // Top optical Crown encoder & switch flex sub-assembly
      const encoderBracket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.07), chrome);
      encoderBracket.position.set(-0.14, 0.72, -0.01);
      encoderBracket.rotation.z = 0.32;
      electronicsLayer.add(encoderBracket);

      const encoderSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 24), chrome);
      encoderSensor.position.set(-0.26, 0.82, -0.01);
      encoderSensor.rotation.z = 0.42;
      electronicsLayer.add(encoderSensor);

      // Coaxial interconnect cable loop at bottom
      const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.22, -0.40, -0.03),
        new THREE.Vector3(-0.12, -0.74, -0.05),
        new THREE.Vector3(0.14, -0.72, -0.05),
        new THREE.Vector3(0.22, -0.34, -0.03),
      ]);
      const cableMesh = new THREE.Mesh(
        new THREE.TubeGeometry(cableCurve, 28, 0.018, 10, false),
        matteBlackInternal
      );
      electronicsLayer.add(cableMesh);

      registerSocket('expH1Socket', electronicsLayer, [0, -0.38, -0.03]);
    }

    // ---------------------------------------------------------
    // LAYER 3: Custom 40mm Dual-Neodymium Ring Magnet Driver
    // Reference: 4.22.11 PM (1).jpeg Layer 3
    // ---------------------------------------------------------
    const driverLayer = new THREE.Group();
    driverLayer.position.set(0, -0.04, 0.045);
    cupBody.add(driverLayer);

    // Outer circular 40mm driver frame flange (angled slightly for ear ergonomics)
    const driverFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.50, 0.47, 0.045, 56),
      matteBlackInternal
    );
    driverFlange.rotation.x = Math.PI * 0.5;
    driverLayer.add(driverFlange);

    // Dual-neodymium concentric ring magnet assembly on rear of driver
    const neodymiumRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.045, 18, 48),
      chrome
    );
    neodymiumRing1.position.z = 0.038;
    driverLayer.add(neodymiumRing1);

    const neodymiumCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.24, 0.065, 48),
      matteBlackInternal
    );
    neodymiumCap.rotation.x = Math.PI * 0.5;
    neodymiumCap.position.z = 0.052;
    driverLayer.add(neodymiumCap);

    // Ribbed high-excursion acoustic cone & surround facing cushion (-Z)
    const diaphragmCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.16, 0.06, 56, 4, true),
      driverDiaphragm
    );
    diaphragmCone.rotation.x = -Math.PI * 0.5;
    diaphragmCone.position.z = -0.015;
    driverLayer.add(diaphragmCone);

    const centerDustDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.45),
      matteBlackInternal
    );
    centerDustDome.rotation.x = -Math.PI * 0.5;
    centerDustDome.position.z = 0.01;
    driverLayer.add(centerDustDome);

    if (side === 'R') {
      registerSocket('expDriverSocket', driverLayer, [0, 0.42, 0]);
    }

    // ---------------------------------------------------------
    // LAYER 4: Inner Acoustic Baffle Plate & Honeycomb Grille
    // Reference: 4.22.10 PM.jpeg & 4.22.11 PM (1).jpeg Layer 4
    // ---------------------------------------------------------
    const baffleLayer = new THREE.Group();
    baffleLayer.position.set(0, 0, 0.0);
    cupBody.add(baffleLayer);

    // Outer molded polymer seating bezel inside aluminum rim
    const baffleRing = new THREE.Mesh(baffleOuterRingGeo, bafflePolymer);
    baffleLayer.add(baffleRing);

    // Sculpted rear acoustic duct shroud (visible when exploded horizontally in 4.22.11 PM (1).jpeg!)
    const ductShroudGeo = createStadiumRingGeometry(0.58, 0.78, 0.38, 0.42, 0.62, 0.28, 0.14, 0.012);
    const ductShroud = new THREE.Mesh(ductShroudGeo, bafflePolymer);
    ductShroud.position.z = 0.065;
    baffleLayer.add(ductShroud);

    // Perforated hexagonal honeycomb speaker grille in recessed center oval
    const grilleMesh = new THREE.Mesh(baffleGrillePlateGeo, baffleGrille);
    grilleMesh.position.z = 0.008;
    baffleLayer.add(grilleMesh);

    // 8 Precision Micro-Torx screws + Magnetic alignment contacts + Optical proximity sensor window
    const torxAngles = [0.08, 0.20, 0.32, 0.44, 0.58, 0.70, 0.82, 0.94];
    const torxGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12);
    torxGeo.rotateX(Math.PI * 0.5);
    for (const u of torxAngles) {
      const theta = u * Math.PI * 2;
      const tx = Math.cos(theta) * 0.58;
      const ty = Math.sin(theta) * 0.78;
      const clampedX = THREE.MathUtils.clamp(tx, -0.62, 0.62);
      const clampedY = THREE.MathUtils.clamp(ty, -0.82, 0.82);
      const screw = new THREE.Mesh(torxGeo, chrome);
      screw.position.set(clampedX, clampedY, -0.018);
      baffleLayer.add(screw);
    }

    // Optical wear-detection sensor window at upper inner bezel
    const opticalSensor = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.022, 0.055, 8, 16),
      darkRecess
    );
    opticalSensor.position.set(0, 0.76, -0.018);
    opticalSensor.rotation.z = Math.PI * 0.5;
    baffleLayer.add(opticalSensor);

    if (side === 'R') {
      registerSocket('expBaffleSocket', baffleLayer, [0, 0.0, -0.02]);
    }

    // ---------------------------------------------------------
    // LAYER 5: Detachable Magnetic Memory-Foam Knit Ear Cushion
    // Reference: 4.22.10 PM.jpeg & 4.22.11 PM (1).jpeg Layer 5
    // ---------------------------------------------------------
    const cushionLayer = new THREE.Group();
    cushionLayer.position.set(0, 0, 0);
    cupBody.add(cushionLayer);

    // Plump 3D woven diamond-knit viscoelastic cushion torus
    const cushionMesh = new THREE.Mesh(cushionGeo, cushionKnit);
    cushionLayer.add(cushionMesh);

    // Precision matte polymer magnetic snap frame on rear of cushion (visible when detached/exploded!)
    const rearFrame = new THREE.Mesh(rearCushionFrameGeo, bafflePolymer);
    rearFrame.position.z = -0.015;
    cushionLayer.add(rearFrame);

    // Rear acoustic port cage on cushion carrier (matches Layer 5 in 4.22.11 PM (1).jpeg!)
    const rearCageRing = createStadiumRingGeometry(0.50, 0.72, 0.33, 0.39, 0.60, 0.25, 0.11, 0.01);
    const rearCage = new THREE.Mesh(rearCageRing, bafflePolymer);
    rearCage.position.z = 0.035;
    // Hide slightly inside baffle when seated; visible when detached or exploded
    cushionLayer.add(rearCage);

    // Woven "L" / "R" inner acoustic scrim inside the ear cushion cavity!
    const scrimMesh = new THREE.Mesh(
      innerScrimGeo,
      side === 'R' ? innerMeshR : innerMeshL
    );
    scrimMesh.position.z = -0.048;
    // Flip X scale so when viewing into the cushion cavity (-Z looking toward +Z), L and R read un-mirrored!
    scrimMesh.scale.set(-1, 1, 1);
    cushionLayer.add(scrimMesh);

    if (side === 'R') {
      registerSocket('expCushionSocket', cushionLayer, [0, -0.45, -0.22]);
      registerSocket('cushionMacroSocket', cushionLayer, [-0.52, 0.15, -0.26]);
    }

    return {
      side,
      stemPivot,
      telescopingRod,
      gimbalPivot,
      swivelGroup,
      cupBody,
      shellLayer,
      electronicsLayer,
      driverLayer,
      baffleLayer,
      cushionLayer,
      crownDial,
      ancButton,
    };
  };

  const leftCup = buildEarCup('L');
  const rightCup = buildEarCup('R');

  // ==========================================
  // 4. Contoured Dual-Lobe Smart Case + Flap
  // Reference: 4.22.12 PM.jpeg
  // ==========================================
  const smartCaseGroup = new THREE.Group();
  smartCaseGroup.position.set(0, -4.5, 0);
  smartCaseGroup.visible = false;
  rootGroup.add(smartCaseGroup);

  const { caseBodyGeometry, caseFlapGeometry, flapCreaseGeometry } = createSmartCaseGeometries();
  const caseBodyMesh = new THREE.Mesh(caseBodyGeometry, smartCaseOuter);
  smartCaseGroup.add(caseBodyMesh);

  // Articulated Magnetic Front Saddle Flap hinged along top center bridge
  const smartCaseFlapPivot = new THREE.Group();
  smartCaseFlapPivot.position.set(0, 0.95, 0.22);
  smartCaseGroup.add(smartCaseFlapPivot);

  const caseFlapMesh = new THREE.Mesh(caseFlapGeometry, smartCaseOuter);
  smartCaseFlapPivot.add(caseFlapMesh);

  const flapCreaseMesh = new THREE.Mesh(flapCreaseGeometry, smartCaseCrease);
  smartCaseFlapPivot.add(flapCreaseMesh);

  // ==========================================
  // 5. Real-Time Smooth Colorway Morphing
  // ==========================================
  const applyInterpolatedColorway = (from: ColorwaySpec, to: ColorwaySpec, alpha: number) => {
    const t = THREE.MathUtils.clamp(alpha, 0, 1);
    lerpHexToMaterialColor(aluminum.color, from.aluminum, to.aluminum, t);
    aluminum.roughness = THREE.MathUtils.lerp(from.aluminumRoughness, to.aluminumRoughness, t);

    lerpHexToMaterialColor(crownMetal.color, from.aluminum, to.aluminum, t);
    lerpHexToMaterialColor(headbandSleeve.color, from.headbandSleeve, to.headbandSleeve, t);
    lerpHexToMaterialColor(canopyMesh.color, from.canopy, to.canopy, t);
    lerpHexToMaterialColor(cushionKnit.color, from.cushion, to.cushion, t);
    lerpHexToMaterialColor(innerMeshL.color, from.innerMesh, to.innerMesh, t);
    lerpHexToMaterialColor(innerMeshR.color, from.innerMesh, to.innerMesh, t);
    lerpHexToMaterialColor(bafflePolymer.color, from.baffle, to.baffle, t);
    lerpHexToMaterialColor(baffleGrille.color, from.baffle, to.baffle, t);
    lerpHexToMaterialColor(smartCaseOuter.color, from.smartCase, to.smartCase, t);
    lerpHexToMaterialColor(smartCaseCrease.color, from.smartCaseInner, to.smartCaseInner, t);
  };

  return {
    rootGroup,
    headsetGroup,
    headbandGroup,
    leftCup,
    rightCup,
    smartCaseGroup,
    smartCaseFlapPivot,
    materials,
    sockets,
    applyInterpolatedColorway,
  };
}
