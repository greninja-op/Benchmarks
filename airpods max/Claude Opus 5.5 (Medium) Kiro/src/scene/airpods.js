// AirPods Max: hierarchical, parametric model.
// Units: 1 unit = 100 mm. Overall: 168.6 (H) x 187.3 (W) x 83.4 (D) mm.
import * as THREE from 'three';
import {
  TAU, sq, sqNormal, thetaForX, paramSurface, squircleLoft, squircleTorus, roundSection,
  squircleShape, squirclePath, roundedRectShape, planarUV, lathe, ribbon,
} from './geometry.js';
import { rng } from './textures.js';

export const CUP = { A: 0.35, B: 0.42, N: 2.8, X0: 0.8 };
const { A, B, N } = CUP;
const BODY_Z = 0.04; // shell offset so the stem pivot sits on the swivel axis

// (r = squircle scale, z) profile of the aluminum shell: inner chamfer -> wall -> roundover -> dome
// Dense analytic samples: inner chamfer -> straight wall -> superellipse roundover/dome (no spline ripple).
const SHELL_PROFILE = (() => {
  const pts = [[0.955, -0.14], [0.975, -0.1385], [0.99, -0.134], [0.998, -0.127], [1.0, -0.118]];
  for (let i = 1; i <= 6; i++) pts.push([1.0, -0.118 + (i / 6) * 0.078]);
  const m = 3.0, z0 = -0.04, h = 0.188;
  for (let i = 1; i <= 48; i++) {
    const f = (i / 48) * (Math.PI / 2);
    pts.push([Math.pow(Math.cos(f), 2 / m), z0 + h * Math.pow(Math.sin(f), 2 / m)]);
  }
  pts[pts.length - 1][0] = 0;
  return pts;
})();

function orientTo(obj, x, y, z, nx, ny, nz) {
  const Y = new THREE.Vector3(nx, ny, nz).normalize();
  const X = new THREE.Vector3(ny, -nx, 0);
  if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
  X.normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  X.crossVectors(Y, Z).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  obj.position.set(x, y, z);
  return obj;
}
function wallPoint(theta, z, inset = 0) {
  const [x, y] = sq(theta, A, B, N);
  const [nx, ny] = sqNormal(x, y, A, B, N);
  return { x: x - nx * inset, y: y - ny * inset, z, nx, ny, nz: 0 };
}
const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; return o; };

function buildCrown(M) {
  const g = new THREE.Group();
  const seat = mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.03, 64), M.black);
  seat.position.y = -0.012;
  g.add(seat);
  const spin = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.0555, 0.0555, 0.034, 96), M.alu);
  body.position.y = 0.012;
  spin.add(body);
  const count = 72;
  const knurl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0042, 0.026, 0.007), M.alu, count);
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    o.position.set(Math.cos(a) * 0.0565, 0.011, Math.sin(a) * 0.0565);
    o.rotation.set(0, -a - Math.PI / 2, 0);
    o.updateMatrix();
    knurl.setMatrixAt(i, o.matrix);
  }
  knurl.castShadow = true;
  spin.add(knurl);
  const cap = mesh(lathe([[0, 0.0302], [0.03, 0.0308], [0.046, 0.0316], [0.052, 0.0318], [0.0555, 0.0298], [0.0565, 0.0255]], 96), M.alu);
  spin.add(cap);
  g.add(spin);
  const anchor = new THREE.Object3D(); anchor.position.y = 0.04; g.add(anchor);
  return { group: g, spin, anchor };
}

function buildButton(M) {
  const g = new THREE.Group();
  const seat = new THREE.ExtrudeGeometry(roundedRectShape(0.088, 0.03, 0.015), { depth: 0.012, bevelEnabled: false, curveSegments: 16 });
  seat.rotateX(-Math.PI / 2); seat.translate(0, -0.012, 0);
  g.add(mesh(seat, M.black));
  const pill = new THREE.ExtrudeGeometry(roundedRectShape(0.078, 0.021, 0.0105), {
    depth: 0.004, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0022, bevelSegments: 4, curveSegments: 20,
  });
  pill.rotateX(-Math.PI / 2); pill.translate(0, -0.004, 0);
  g.add(mesh(pill, M.alu));
  const anchor = new THREE.Object3D(); anchor.position.y = 0.01; g.add(anchor);
  return { group: g, anchor };
}

function holePattern() {
  const holes = [];
  const sp = 0.044, r = 0.016;
  for (let row = -5; row <= 5; row++) {
    const y = row * sp * 0.866 - 0.01;
    for (let col = -5; col <= 5; col++) {
      const x = col * sp + (row % 2 ? sp / 2 : 0);
      if ((x / 0.155) ** 2 + ((y + 0.01) / 0.19) ** 2 > 1) continue;
      const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, false); holes.push(p);
    }
  }
  return holes;
}

function buildBaffle(M, fs) {
  const g = new THREE.Group();
  const shape = squircleShape(A * 0.95, B * 0.95, N, 160);
  shape.holes.push(...holePattern());
  const sensor = new THREE.Path(); sensor.absarc(-fs * 0.13, 0.25, 0.018, 0, TAU, false); shape.holes.push(sensor);
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false, curveSegments: 14 });
  plate.translate(0, 0, -0.142);
  g.add(mesh(plate, M.baffle));
  const back = new THREE.CircleGeometry(0.23, 64); back.rotateY(Math.PI); back.translate(0, -0.01, -0.128);
  g.add(mesh(back, M.void, false));
  const lens = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 32).rotateX(Math.PI / 2), M.glass);
  lens.position.set(-fs * 0.13, 0.25, -0.14); g.add(lens);
  g.add(mesh(squircleTorus({ A: A * 0.6, B: B * 0.66, n: N, sec: roundSection(0, -0.145, 0.011, 0.006, 0.5), nv: 16 }), M.baffle));
  const ring = mesh(squircleTorus({ A: A * 0.82, B: B * 0.84, n: N, sec: roundSection(0, -0.1445, 0.008, 0.003, 0.3), nv: 12 }), M.magnetRing);
  g.add(ring);
  const pinG = new THREE.CylinderGeometry(0.014, 0.014, 0.007, 32).rotateX(Math.PI / 2);
  [0.35, 1.2, 1.95, 2.8, 3.55, 4.4, 5.2, 5.95].forEach((t) => {
    const [x, y] = sq(t, A * 0.82, B * 0.84, N);
    const p = mesh(pinG, M.nickel, false); p.position.set(x, y, -0.146); g.add(p);
  });
  const anchor = new THREE.Object3D(); anchor.position.set(0, B * 0.9, -0.14); g.add(anchor);
  return { group: g, anchor, ring };
}

function buildCushion(M, letter) {
  const g = new THREE.Group();
  const A0 = 0.255, B0 = 0.325;
  g.add(mesh(squircleTorus({ A: A0, B: B0, n: N, sec: roundSection(0, -0.255, 0.08, 0.115, 0.62), nu: 200, nv: 48 }), M.cushion));
  const meshG = planarUV(new THREE.ShapeGeometry(squircleShape(0.215, 0.285, N, 128)));
  meshG.rotateY(Math.PI); meshG.translate(0, 0, -0.165);
  g.add(mesh(meshG, letter === 'L' ? M.meshL : M.meshR, false));
  const ringShape = squircleShape(A0 + 0.06, B0 + 0.06, N, 128);
  ringShape.holes.push(squirclePath(A0 - 0.05, B0 - 0.05, N, 128));
  const plate = new THREE.ExtrudeGeometry(ringShape, { depth: 0.008, bevelEnabled: false });
  plate.translate(0, 0, -0.149);
  g.add(mesh(plate, M.baffle));
  const anchor = new THREE.Object3D(); anchor.position.set(0, B0 + 0.07, -0.3); g.add(anchor);
  return { group: g, anchor };
}

function buildChassis(M) {
  const g = new THREE.Group();
  g.add(mesh(squircleTorus({ A: A * 0.86, B: B * 0.86, n: N, sec: roundSection(0, 0.015, 0.022, 0.018, 0.25), nv: 20 }), M.darkPlastic));
  const bar = mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), M.darkPlastic); bar.position.set(0, -0.05, 0.015); g.add(bar);
  const pts = [];
  for (let i = 0; i <= 60; i++) { const [x, y] = sq(0.3 + (i / 60) * 3.4, A * 0.9, B * 0.9, N); pts.push(new THREE.Vector3(x, y, 0.035)); }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0035, 8), M.copper));
  const boss = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 20).rotateX(Math.PI / 2);
  [0.6, 1.6, 2.6, 3.7, 4.7, 5.6].forEach((t) => {
    const [x, y] = sq(t, A * 0.86, B * 0.86, N);
    const b = mesh(boss, M.nickel); b.position.set(x, y, 0.005); g.add(b);
  });
  const anchor = new THREE.Object3D(); anchor.position.set(0, B * 0.9, 0.015); g.add(anchor);
  return { group: g, anchor };
}

function buildElectronics(M, fs) {
  const g = new THREE.Group();
  const board = planarUV(new THREE.ExtrudeGeometry(roundedRectShape(0.4, 0.3, 0.05), { depth: 0.01, bevelEnabled: false, curveSegments: 10 }));
  g.add(mesh(board, M.pcb));
  const dark = M.darkPlastic;
  const h1 = mesh(new THREE.BoxGeometry(0.075, 0.075, 0.01), [dark, dark, dark, dark, M.chip, dark]);
  h1.position.set(0.05, 0.03, 0.015); g.add(h1);
  [[-0.1, 0.06, 0.05, 0.04], [-0.08, -0.07, 0.06, 0.035], [0.12, -0.08, 0.04, 0.04]].forEach(([x, y, w, h]) => {
    const c = mesh(new THREE.BoxGeometry(w, h, 0.008), M.black); c.position.set(x, y, 0.014); g.add(c);
  });
  const can = mesh(new THREE.BoxGeometry(0.11, 0.08, 0.012), M.nickel); can.position.set(-0.11, -0.02, 0.016); g.add(can);
  const r = rng(5), cnt = 90;
  const pas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.009, 0.005, 0.004), new THREE.MeshStandardMaterial({ roughness: 0.5 }), cnt);
  const o = new THREE.Object3D(), col = new THREE.Color();
  const tones = ['#c9a46a', '#1d1d1f', '#c8c8cc', '#6b4a2b'];
  for (let i = 0; i < cnt; i++) {
    o.position.set((r() - 0.5) * 0.34, (r() - 0.5) * 0.24, 0.012);
    o.rotation.z = r() > 0.5 ? Math.PI / 2 : 0; o.updateMatrix();
    pas.setMatrixAt(i, o.matrix); pas.setColorAt(i, col.set(tones[Math.floor(r() * tones.length)]));
  }
  g.add(pas);
  // optical (skin-detect) + position sensors
  const opt = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.016, 32).rotateX(Math.PI / 2), M.glass); opt.position.set(-fs * 0.13, 0.18, -0.02); g.add(opt);
  const pos = mesh(new THREE.BoxGeometry(0.035, 0.03, 0.012), M.black); pos.position.set(fs * 0.12, 0.17, 0.01); g.add(pos);
  // crown encoder module
  const enc = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 32), M.nickel); enc.position.set(fs * 0.2, 0.28, -0.035); g.add(enc);
  const brk = mesh(new THREE.BoxGeometry(0.06, 0.05, 0.01), M.nickel); brk.position.set(fs * 0.18, 0.24, -0.01); g.add(brk);
  const flex1 = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.15, 0.15, 0.012), new THREE.Vector3(-0.17, 0.24, 0.0), new THREE.Vector3(-0.06, 0.3, -0.03), new THREE.Vector3(fs * 0.18, 0.26, -0.02)]);
  g.add(mesh(ribbon(flex1, 0.028, 0.002), M.kapton));
  const flex2 = new THREE.CatmullRomCurve3([new THREE.Vector3(0.15, -0.13, 0.012), new THREE.Vector3(0.12, -0.22, 0.0), new THREE.Vector3(0.0, -0.27, -0.03)]);
  g.add(mesh(ribbon(flex2, 0.022, 0.002), M.kapton));
  const anchor = new THREE.Object3D(); anchor.position.set(0.05, 0.03, 0.02); g.add(anchor);
  return { group: g, anchor };
}

function buildDriver(M) {
  const inner = new THREE.Group();
  inner.add(mesh(lathe([[0.19, -0.016], [0.215, -0.016], [0.215, 0.0], [0.205, 0.004], [0.165, 0.03], [0.15, 0.03]], 128), M.darkPlastic));
  inner.add(mesh(lathe([[0.045, 0.012], [0.08, 0.008], [0.12, 0.0], [0.155, -0.008], [0.176, -0.012]], 128), M.cone));
  const sur = new THREE.TorusGeometry(0.186, 0.012, 16, 128, TAU); sur.rotateX(Math.PI / 2); sur.translate(0, -0.012, 0);
  inner.add(mesh(sur, M.rubber));
  inner.add(mesh(new THREE.SphereGeometry(0.05, 48, 16, 0, TAU, Math.PI * 0.62, Math.PI * 0.38).translate(0, 0.042, 0), M.cone));
  // dual neodymium ring magnets + pole plate
  inner.add(mesh(lathe([[0.1, 0.03], [0.145, 0.03], [0.145, 0.065], [0.1, 0.065], [0.1, 0.03]], 128), M.nickel));
  inner.add(mesh(lathe([[0.035, 0.03], [0.07, 0.03], [0.07, 0.068], [0.035, 0.068], [0.035, 0.03]], 128), M.nickel));
  inner.add(mesh(lathe([[0.02, 0.068], [0.155, 0.068], [0.155, 0.078], [0.02, 0.078], [0.02, 0.068]], 128), M.steel));
  inner.add(mesh(lathe([[0.074, 0.02], [0.08, 0.02], [0.08, 0.034], [0.074, 0.034], [0.074, 0.02]], 96), M.copper));
  for (let i = 0; i < 4; i++) {
    const s = mesh(new THREE.BoxGeometry(0.07, 0.008, 0.02), M.darkPlastic);
    const a = (i / 4) * TAU + 0.4; s.position.set(Math.cos(a) * 0.18, 0.05, Math.sin(a) * 0.18); s.rotation.y = -a; inner.add(s);
  }
  const tab = mesh(new THREE.BoxGeometry(0.02, 0.006, 0.03), M.copper); tab.position.set(0.2, 0.01, 0); inner.add(tab);
  inner.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(inner);
  const anchor = new THREE.Object3D(); anchor.position.set(0, 0.215, 0); g.add(anchor);
  return { group: g, anchor };
}

function buildCup(M, side) {
  const fs = side === 'R' ? -1 : 1; // local x sign pointing to the front of the head
  const thetaF = (off) => (fs > 0 ? off : Math.PI - off);
  const pivot = new THREE.Group();
  const body = new THREE.Group(); body.position.z = BODY_Z; pivot.add(body);
  const anchors = {};

  // ---- shell (aluminum) + liner + details
  const shell = new THREE.Group();
  shell.add(mesh(squircleLoft({ A, B, n: N, profile: SHELL_PROFILE, nu: 200, nv: 90, uvScale: [1, 1] }), M.alu));
  shell.add(mesh(squircleLoft({ A, B, n: N, profile: SHELL_PROFILE, nu: 120, nv: 40, scale: 0.965, zScale: 0.95 }), M.liner, false));
  const rimS = squircleShape(A * 0.956, B * 0.956, N, 160); rimS.holes.push(squirclePath(A * 0.92, B * 0.92, N, 160));
  const rim = new THREE.ShapeGeometry(rimS); rim.rotateY(Math.PI); rim.translate(0, 0, -0.1398);
  shell.add(mesh(rim, M.alu, false));
  // hinge recess + polished pivot collar
  const recess = new THREE.CircleGeometry(0.039, 48).rotateX(-Math.PI / 2); recess.translate(0, B - 0.0015, -BODY_Z);
  shell.add(mesh(recess, M.void, false));
  const collar = mesh(new THREE.CylinderGeometry(0.031, 0.034, 0.07, 48), M.steel); collar.position.set(0, B + 0.025, -BODY_Z); shell.add(collar);
  // microphone slits
  const slit = new THREE.CapsuleGeometry(0.0028, 0.02, 4, 12).rotateX(Math.PI / 2);
  [[thetaF(0.62), -0.095], [thetaF(-0.95), -0.095], [thetaF(Math.PI + 0.75), -0.095], [thetaF(1.25), -0.03]].forEach(([t, z]) => {
    const p = wallPoint(t, z, 0.002); const s = mesh(slit, M.void, false); s.position.set(p.x, p.y, p.z); shell.add(s);
  });
  if (side === 'R') {
    const crown = buildCrown(M);
    const tc = thetaForX(fs * 0.245, A, N, true); const pc = wallPoint(tc, -0.078, 0.004);
    orientTo(crown.group, pc.x, pc.y, pc.z, pc.nx, pc.ny, 0); shell.add(crown.group);
    anchors.crown = crown.anchor; pivot.userData.crownSpin = crown.spin;
    const btn = buildButton(M);
    const tb = thetaForX(-fs * 0.165, A, N, true); const pb = wallPoint(tb, -0.08, 0.0);
    orientTo(btn.group, pb.x, pb.y, pb.z, pb.nx, pb.ny, 0); shell.add(btn.group);
    anchors.button = btn.anchor;
    const port = new THREE.ShapeGeometry(roundedRectShape(0.075, 0.018, 0.009)).rotateX(Math.PI / 2);
    const pm = mesh(port, M.void, false); pm.position.set(fs * 0.05, -B + 0.0012, -0.075); shell.add(pm);
    [0.05, 0.08].forEach((dx) => {
      const h = mesh(new THREE.CircleGeometry(0.005, 16).rotateX(Math.PI / 2), M.void, false);
      h.position.set(-fs * dx, -B + 0.0012, -0.075); shell.add(h);
    });
  }
  const shellAnchor = new THREE.Object3D(); shellAnchor.position.set(0, B * 0.75, 0.13); shell.add(shellAnchor); anchors.shell = shellAnchor;
  body.add(shell);

  const baffle = buildBaffle(M, fs); body.add(baffle.group); anchors.baffle = baffle.anchor;
  const cushion = buildCushion(M, side); body.add(cushion.group); anchors.cushion = cushion.anchor;
  const layers = { shell, baffle: baffle.group, cushion: cushion.group };
  if (side === 'R') {
    const ch = buildChassis(M); body.add(ch.group); layers.chassis = ch.group; anchors.chassis = ch.anchor;
    const el = buildElectronics(M, fs); el.group.position.z = -0.025; body.add(el.group); layers.electronics = el.group; anchors.electronics = el.anchor;
    const dr = buildDriver(M); dr.group.position.z = -0.075; body.add(dr.group); layers.driver = dr.group; anchors.driver = dr.anchor;
  }
  for (const k in layers) layers[k].userData.rest = layers[k].position.clone();
  return { pivot, body, layers, anchors, fs, ring: baffle.ring };
}

function buildHeadband(M) {
  const g = new THREE.Group();
  const X = CUP.X0, Y0 = 0.76, H = 0.52, p = 2 / 2.4;
  const C = (t, out) => {
    const f = Math.PI * t, c = Math.cos(f), s = Math.sin(f);
    return out.set(X * Math.sign(c) * Math.pow(Math.abs(c), p), Y0 + H * Math.pow(Math.abs(s), p), 0);
  };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), T = new THREE.Vector3(), Nn = new THREE.Vector3();
  const frame = (t) => {
    const e = 1e-3;
    C(Math.min(1, t + e), a); C(Math.max(0, t - e), b); T.subVectors(a, b).normalize();
    Nn.set(-T.y, T.x, 0); // in-plane normal
    C(t, a);
    if (Nn.dot(new THREE.Vector3(0, 0.6, 0).sub(a)) < 0) Nn.negate(); // point toward arch interior
    return a;
  };
  const width = (t) => { const k = Math.sin(Math.PI * t); return 0.1 + 0.26 * Math.pow(k, 1.6); };
  const thick = 0.078;
  const band = paramSurface((u, v, P) => {
    const t = Math.min(1, Math.max(0, u)); const c = frame(t);
    const w = width(t), ang = v * TAU, cs = Math.cos(ang), sn = Math.sin(ang), q = 0.45;
    const sx = Math.sign(cs) * Math.pow(Math.abs(cs), q), sy = Math.sign(sn) * Math.pow(Math.abs(sn), q);
    P.copy(c).addScaledVector(Nn, (thick / 2) * sy).add(new THREE.Vector3(0, 0, (w / 2) * sx));
  }, 220, 40, { wrapV: true, ref: (u, v, R) => R.copy(frame(Math.min(1, Math.max(0, u)))), uvScale: [1, 1] });
  g.add(mesh(band, M.band));
  const canopy = paramSurface((u, v, P) => {
    const t = 0.12 + 0.76 * Math.min(1, Math.max(0, u)); const c = frame(t);
    const sag = Math.sin(Math.PI * (t - 0.12) / 0.76) * 0.012;
    P.copy(c).addScaledVector(Nn, thick / 2 + 0.006 + sag).add(new THREE.Vector3(0, 0, (v - 0.5) * width(t) * 0.86));
  }, 160, 12, { ref: (u, v, R) => R.set(0, 2, 0) });
  const can = mesh(canopy, M.canopy); g.add(can);
  // polished end caps where the telescoping arms emerge
  const capG = lathe([[0.0, 0.0], [0.042, 0.0], [0.05, 0.006], [0.052, 0.03], [0.05, 0.075], [0.0, 0.075]], 64);
  [-1, 1].forEach((s) => { const c = mesh(capG, M.steel); c.position.set(s * X, 0.7, 0); g.add(c); });
  const anchor = new THREE.Object3D(); anchor.position.set(0, Y0 + H - 0.05, 0.12); g.add(anchor);
  return { group: g, anchor, canopy: can };
}

export function buildAirPods(M) {
  const headset = new THREE.Group();
  const band = buildHeadband(M);
  headset.add(band.group);
  const R = buildCup(M, 'R'), L = buildCup(M, 'L');
  R.pivot.position.set(CUP.X0, 0, 0); R.pivot.rotation.y = Math.PI / 2;
  L.pivot.position.set(-CUP.X0, 0, 0); L.pivot.rotation.y = -Math.PI / 2;
  headset.add(R.pivot, L.pivot);
  const armG = new THREE.CylinderGeometry(0.0195, 0.0195, 1, 32).translate(0, -0.5, 0);
  const arms = [-1, 1].map((s) => { const a = mesh(armG, M.steel); a.position.set(s * CUP.X0, 0.705, 0); headset.add(a); return a; });

  const ghosts = [band.group, L.pivot, arms[0], arms[1]];
  return { headset, R, L, arms, band, ghosts };
}

/** Per-frame rig update. */
export function updateAirPods(rig, S, time) {
  const { R, L, arms } = rig;
  const ext = S.ext;
  const sw = S.swivel;
  R.pivot.position.y = L.pivot.position.y = -ext;
  R.pivot.rotation.y = (Math.PI / 2) * (1 - sw);
  L.pivot.rotation.y = (-Math.PI / 2) * (1 - sw);
  const armLen = 0.705 - (B + 0.06 - ext);
  arms.forEach((a) => (a.scale.y = armLen));
  if (R.pivot.userData.crownSpin) R.pivot.userData.crownSpin.rotation.y = S.crown;

  // magnetic cushion detach / snap
  const snapBounce = Math.sin(S.snap * Math.PI) * 0.012;
  [R, L].forEach((cup) => {
    const c = cup.layers.cushion, lf = S.lift;
    c.position.set(cup.fs * 0.1 * lf, 0.06 * lf, -0.34 * lf + snapBounce);
    c.rotation.set(0.18 * lf, cup.fs * 0.32 * lf, 0);
    cup.ring.material.emissiveIntensity = Math.sin(S.snap * Math.PI) * 2.5;
  });

  // exploded view (right cup), staggered per layer
  const order = [['shell', 0.22], ['chassis', -0.15], ['electronics', -0.45], ['driver', -0.72], ['baffle', -1.0], ['cushion', -1.25]];
  order.forEach(([k, off], i) => {
    const layer = R.layers[k]; if (!layer) return;
    const e = Math.min(1, Math.max(0, (S.explode * 1.35 - i * 0.07)));
    const ee = e * e * (3 - 2 * e);
    if (k === 'cushion') layer.position.z += off * ee; // cushion transform was reset above
    else layer.position.set(layer.userData.rest.x, layer.userData.rest.y, layer.userData.rest.z + off * ee);
  });
  void time;
}
