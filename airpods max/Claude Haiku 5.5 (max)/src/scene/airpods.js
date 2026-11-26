import * as THREE from 'three';
import {
  superEllipsoid, sweepBand, planarUVAbs, fitUV, superEllipseShape, pillGeometry, knurledCylinder,
} from './geometry.js';

/**
 * Model units are centimeters. Overall height is about 18.8 cm and width about 17 cm,
 * matching Apple's published 187.3 mm height and 168.6 mm width. Shapes are parametric.
 */
export const DIM = {
  cupA: 3.4, // cup half width
  cupB: 4.8, // cup half height
  cupC: 2.2, // cup half depth (shell thickness axis)
  cupX: 5.0, // cup center offset from the midline
  cushA: 2.8, // cushion half width
  cushB: 4.35, // cushion half height
  cushC: 1.1, // cushion half depth
  armX: 7.5, // arm and band end offset
  bandCy: 6.4, // band arc center height
  bandRx: 7.5, // band arc radius X
  bandRy: 6.8, // band arc radius Y
  bandA: 0.6, // sleeve half thickness (radial), about 1.2 cm like the reference
  bandB: 1.4, // sleeve half width (across the head)
  legBottom: 4.8, // where the sleeve ends and the chrome arm is exposed
};

/** Centerline of the headband: arm legs, then the arch over the top. Lies in the XY plane. */
function bandPoints() {
  const { bandCy: cy, bandRx: rx, bandRy: ry, legBottom } = DIM;
  const pts = [];
  for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(-rx, legBottom + ((cy - legBottom) * i) / 6, 0));
  const steps = 160;
  for (let i = 1; i < steps; i++) {
    const th = Math.PI - (Math.PI * i) / steps;
    pts.push(new THREE.Vector3(rx * Math.cos(th), cy + ry * Math.sin(th), 0));
  }
  for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(rx, cy - ((cy - legBottom) * i) / 6, 0));
  return pts;
}
/** Perforated plate, magnet ring and pins on the cushion face. Returns the group that moves in the exploded view. */
function buildFace(side, M) {
  const faceG = new THREE.Group();
  faceG.position.z = DIM.cupC - 0.2;
  const plateGeo = new THREE.ExtrudeGeometry(superEllipseShape(DIM.cupA * 0.8, DIM.cupB * 0.82, 2.8, 120), {
    depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 48,
  });
  fitUV(plateGeo);
  const plate = new THREE.Mesh(plateGeo, side > 0 ? M.plate.R : M.plate.L);
  plate.receiveShadow = true;
  faceG.add(plate);

  const ringShape = superEllipseShape(DIM.cupA * 0.9, DIM.cupB * 0.91, 2.8, 120);
  ringShape.holes.push(new THREE.Path(superEllipseShape(DIM.cupA * 0.8, DIM.cupB * 0.82, 2.8, 120).getPoints(120)));
  const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.2, bevelEnabled: false, curveSegments: 96 }), M.button);
  ring.position.z = 0.2;
  faceG.add(ring);

  const pinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.36, 20);
  pinGeo.rotateX(Math.PI / 2);
  for (const [x, y] of [[-2.5, 3.3], [2.5, 3.3], [-2.5, -3.3], [2.5, -3.3]]) {
    const pin = new THREE.Mesh(pinGeo, M.chrome);
    pin.position.set(x, y, 0.45);
    faceG.add(pin);
  }
  return faceG;
}
/** H1 board, battery, sensors and flex cable. Hidden inside the shell until the exploded view. */
function buildElectronics(M) {
  const elecG = new THREE.Group();
  elecG.position.z = -1.0;
  const battery = new THREE.Mesh(superEllipsoid({ a: 1.45, b: 1.65, c: 0.2, e1: 0.3, e2: 0.3, nu: 16, nv: 32 }), M.battery);
  battery.position.set(-0.3, 0.2, 0);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.8, 0.12), M.pcb);
  board.position.set(0.25, 0.3, 0.3);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.12), M.chip);
  chip.position.set(0.35, 0.45, 0.42);
  elecG.add(battery, board, chip);
  for (const [x, y] of [[-0.9, 0.9], [0.2, -0.2], [1.0, -0.6]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.14), M.glass);
    s.position.set(x, y, 0.4);
    elecG.add(s);
  }
  const flexCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.6, -0.5, 0.4), new THREE.Vector3(1.1, -1.4, 0.5),
    new THREE.Vector3(1.6, -2.1, 0.7), new THREE.Vector3(1.9, -2.9, 0.9),
  ]);
  elecG.add(new THREE.Mesh(new THREE.TubeGeometry(flexCurve, 40, 0.07, 8, false), M.copper));
  return elecG;
}

/** 40 mm driver: dark cone with a dual neodymium ring magnet. */
function buildDriver(M) {
  const drvG = new THREE.Group();
  drvG.position.z = 0.6;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.3, 72), M.driver);
  cone.rotation.x = Math.PI / 2;
  const magnet = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.24, 16, 96), M.steel);
  magnet.position.z = 0.15;
  drvG.add(cone, magnet);
  return drvG;
}
/** Knit cushion, centered on the cup front. Its own group moves when it detaches. */
function buildCushion(M, side) {
  const cushionG = new THREE.Group();
  // The cushion sits slightly toward the head, so a strip of cup shell shows on the outer edge as in the reference.
  cushionG.position.set(-side * 0.4, 0, DIM.cupC + DIM.cushC * 0.2);
  const geo = superEllipsoid({ a: DIM.cushA, b: DIM.cushB, c: DIM.cushC, e1: 0.4, e2: 0.42, nu: 48, nv: 96 });
  planarUVAbs(geo, 2.2);
  const mesh = new THREE.Mesh(geo, M.cushion);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  cushionG.add(mesh);
  return cushionG;
}

/** Knurled Digital Crown. The spin group turns about the crown axis, which points along the cup's outer X. */
function buildCrown(M) {
  const axis = new THREE.Group();
  axis.position.set(3.1, 2.0, 0.6);
  axis.rotation.z = -Math.PI / 2;
  const spin = new THREE.Group();
  spin.add(new THREE.Mesh(knurledCylinder(0.75, 0.9, 48, 0.07), M.chrome));
  axis.add(spin);
  const tip = new THREE.Object3D();
  tip.position.set(0, 0.6, 0);
  axis.add(tip);
  return { axis, spin, tip };
}

/** Flush pill-shaped Noise Control button on the outer side of the right cup. */
function buildNoise(M) {
  const mesh = new THREE.Mesh(pillGeometry(1.7, 0.8, 0.12, 0.05), M.button);
  mesh.position.set(3.42, -0.2, 0.6);
  mesh.castShadow = true;
  return mesh;
}
/** One ear cup: shell, mic slit, internals, face plate and cushion. The right cup also has the crown and Noise Control. */
function buildCup(side, M) {
  const cup = new THREE.Group();
  cup.name = side > 0 ? 'cup-R' : 'cup-L';
  const shellG = new THREE.Group();
  const shell = new THREE.Mesh(
    superEllipsoid({ a: DIM.cupA, b: DIM.cupB, c: DIM.cupC, e1: 0.45, e2: 0.42, taper: 0.12, nu: 64, nv: 128 }),
    M.cup,
  );
  shell.castShadow = true;
  shell.receiveShadow = true;
  shellG.add(shell);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.5), M.glass);
  slit.position.set(side * 3.12, -2.4, 1.2);
  shellG.add(slit);
  const parts = {
    side, cup, shellG, elecG: buildElectronics(M), drvG: buildDriver(M), faceG: buildFace(side, M),
    cushionG: buildCushion(M, side), crown: null, noise: null,
  };
  if (side > 0) {
    parts.crown = buildCrown(M);
    shellG.add(parts.crown.axis);
    parts.noise = buildNoise(M);
    shellG.add(parts.noise);
  }
  cup.add(shellG, parts.elecG, parts.drvG, parts.faceG, parts.cushionG);
  return parts;
}
/** Headband: soft-touch sleeve, a knit canopy sector on the head-facing side, and chrome telescoping arms. */
function buildBand(M) {
  const band = new THREE.Group();
  band.name = 'band';
  const pts = bandPoints();
  const sleeve = new THREE.Mesh(sweepBand({ pts, a: DIM.bandA, b: DIM.bandB, nPhi: 56, uvTile: 2 }), M.sleeve);
  sleeve.castShadow = true;
  const canopy = new THREE.Mesh(
    sweepBand({ pts, a: DIM.bandA, b: DIM.bandB, nPhi: 40, phi0: 0.45, phi1: 2.69, offset: 0.035, uvTile: 2 }),
    M.canopy,
  );
  canopy.castShadow = true;
  band.add(sleeve, canopy);
  const armGeo = new THREE.CylinderGeometry(0.26, 0.26, 2.6, 32);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, M.chrome);
    arm.position.set(s * DIM.armX, 4.0, 0);
    arm.castShadow = true;
    band.add(arm);
  }
  // Caps close the open sleeve ends where the arms leave the sleeve, so no dark holes show.
  const capGeo = new THREE.CircleGeometry(1, 32);
  capGeo.rotateX(-Math.PI / 2);
  capGeo.scale(DIM.bandA, 1, DIM.bandB);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, M.sleeve);
    cap.position.set(s * DIM.armX, DIM.legBottom, 0);
    band.add(cap);
  }
  return band;
}

/**
 * Builds the full headphones. Units are cm, and the product faces +Z with the cushions toward the camera,
 * as in the reference photos. apply() drives the detach, explode and swivel states.
 */
export function buildAirPods(M) {
  const root = new THREE.Group();
  root.name = 'airpods';
  root.add(buildBand(M));
  const cups = [buildCup(1, M), buildCup(-1, M)];
  for (const c of cups) {
    const swivel = new THREE.Group();
    swivel.position.set(c.side * DIM.armX, 3.4, 0);
    c.cup.position.set(c.side * (DIM.cupX - DIM.armX), -3.4, 0);
    swivel.add(c.cup);
    root.add(swivel);
    c.swivel = swivel;
  }
  const R = cups.find((c) => c.side > 0);
  const restCushion = DIM.cupC + DIM.cushC * 0.2;

  function apply({ detach = 0, explode = 0, swivel = 0, crownAngle = 0 }) {
    for (const c of cups) {
      c.cushionG.position.z = restCushion + detach * 6.0 + explode * 6.2;
      c.cushionG.rotation.x = detach * 0.1;
      c.shellG.position.z = -explode * 8.0;
      c.elecG.position.z = -1.0 - explode * 3.0;
      c.drvG.position.z = 0.6 + explode * 1.6;
      c.faceG.position.z = DIM.cupC - 0.2 + explode * 3.6;
      c.swivel.rotation.y = c.side * swivel * 1.2;
    }
    R.crown.spin.rotation.y = crownAngle;
  }

  return {
    root,
    cups,
    apply,
    anchors: {
      crown: R.crown.tip, noise: R.noise, shell: R.shellG, electronics: R.elecG, driver: R.drvG, baffle: R.faceG, cushion: R.cushionG,
    },
  };
}
