// Procedural, hierarchical AirPods Max + Smart Case model (all geometry built in code).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

// ---- Dimensions (1 unit = 1 cm, derived from Apple's 187.3 × 168.6 × 83.4 mm spec) ----
export const CUP = { a: 4.0, b: 4.85, n: 2.75 };      // ear-cup superellipse half extents
export const BAND = { A: 7.2, Y0: 7.0, B: 7.1, p: 2.3 };
export const STEM_Z = 1.85;                           // stem socket depth on cup wall
export const ROOT_Y = -5.05;

const TAU = Math.PI * 2;
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function superXY(theta, s) {
  return [CUP.a * s * spow(Math.cos(theta), 2 / CUP.n), CUP.b * s * spow(Math.sin(theta), 2 / CUP.n)];
}

// ---------------------------------------------------------------------------
// Parametric grid → BufferGeometry with seam-welded normals.
// ---------------------------------------------------------------------------
export function gridGeometry(nu, nv, fn, opt = {}) {
  const { closeU = false, closeV = false, uvFn = null, flip = false, poleStart = false, poleEnd = false } = opt;
  const row = nu + 1, count = row * (nv + 1);
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const p = new THREE.Vector3();
  let k = 0;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
    const u = i / nu, v = j / nv;
    fn(u, v, p);
    pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
    if (uvFn) { const t = uvFn(u, v, p); uv[k * 2] = t[0]; uv[k * 2 + 1] = t[1]; }
    else { uv[k * 2] = u; uv[k * 2 + 1] = v; }
  }
  const idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    if (!flip) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal.array;
  const sum = (i1, i2) => {
    for (let c = 0; c < 3; c++) { const m = n[i1 * 3 + c] + n[i2 * 3 + c]; n[i1 * 3 + c] = m; n[i2 * 3 + c] = m; }
  };
  if (closeU) for (let j = 0; j <= nv; j++) sum(j * row, j * row + nu);
  if (closeV) for (let i = 0; i <= nu; i++) sum(i, nv * row + i);
  const poleRow = (j) => {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i <= nu; i++) { const q = (j * row + i) * 3; x += n[q]; y += n[q + 1]; z += n[q + 2]; }
    for (let i = 0; i <= nu; i++) { const q = (j * row + i) * 3; n[q] = x; n[q + 1] = y; n[q + 2] = z; }
  };
  if (poleStart) poleRow(0);
  if (poleEnd) poleRow(nv);
  for (let v = 0; v < count; v++) {
    const q = v * 3, L = Math.hypot(n[q], n[q + 1], n[q + 2]);
    if (L > 1e-10) { n[q] /= L; n[q + 1] /= L; n[q + 2] /= L; } else { n[q] = 0; n[q + 1] = 0; n[q + 2] = 1; }
  }
  return g;
}

/** Loft a (scale,z) profile along the cup superellipse. */
function loft(profile, opt = {}) {
  const nu = opt.segs || 200, nv = profile.length - 1;
  return gridGeometry(nu, nv, (u, v, p) => {
    const [s, z] = profile[Math.round(v * nv)];
    const [x, y] = superXY(u * TAU, s);
    p.set(x, y, z);
  }, { closeU: true, closeV: !!opt.closed, uvFn: opt.uvFn, flip: opt.flip, poleStart: opt.poleStart, poleEnd: opt.poleEnd });
}

function loopProfile(sc, rs, zc, rz, p = 3, N = 72) {
  const P = [];
  for (let k = 0; k <= N; k++) {
    const f = (k / N) * TAU;
    P.push([sc + rs * spow(Math.cos(f), 2 / p), zc + rz * spow(Math.sin(f), 2 / p)]);
  }
  return P;
}

// Aluminium shell profile: chamfered seat → straight wall → superelliptic domed cap.
const SHELL_WALL_TOP = 1.9, SHELL_H = 1.45;
function shellProfile() {
  const P = [[0.972, 0], [0.99, 0.04], [1.0, 0.14]];
  for (let k = 1; k <= 10; k++) P.push([1.0, 0.14 + (SHELL_WALL_TOP - 0.14) * k / 10]);
  const M = 64, p = 2.5;
  for (let k = 1; k <= M; k++) {
    const f = (k / M) * Math.PI / 2;
    P.push([Math.pow(Math.cos(f), 2 / p), SHELL_WALL_TOP + SHELL_H * Math.pow(Math.sin(f), 2 / p)]);
  }
  return P;
}
const SHELL_PROFILE = shellProfile();
const wallF = (z) => 2 + (z - 0.14) / ((SHELL_WALL_TOP - 0.14) / 10);

function shellPoint(theta, f, out = new THREE.Vector3()) {
  const i = Math.max(0, Math.min(SHELL_PROFILE.length - 2, Math.floor(f)));
  const t = f - i;
  const s = SHELL_PROFILE[i][0] * (1 - t) + SHELL_PROFILE[i + 1][0] * t;
  const z = SHELL_PROFILE[i][1] * (1 - t) + SHELL_PROFILE[i + 1][1] * t;
  const [x, y] = superXY(theta, s);
  return out.set(x, y, z);
}
function shellFrame(theta, f) {
  const e = 1e-3;
  const P = shellPoint(theta, f);
  const Tt = shellPoint(theta + e, f).sub(shellPoint(theta - e, f)).normalize();
  const Tf = shellPoint(theta, f + 0.05).sub(shellPoint(theta, f - 0.05)).normalize();
  const N = new THREE.Vector3().crossVectors(Tt, Tf).normalize();
  return { P, N, Tt, Tf };
}
function thetaForX(xt, upper = true) {
  let best = 0, bd = 1e9;
  for (let i = 0; i <= 4000; i++) {
    const th = (upper ? 0 : Math.PI) + (i / 4000) * Math.PI;
    const d = Math.abs(superXY(th, 1)[0] - xt);
    if (d < bd) { bd = d; best = th; }
  }
  return best;
}

/** Orient an object so local Y = up, local Z = normal (rest derived). */
function placeOnSurface(obj, P, N, Y) {
  const Yn = Y.clone().sub(N.clone().multiplyScalar(Y.dot(N))).normalize();
  const X = new THREE.Vector3().crossVectors(Yn, N).normalize();
  const m = new THREE.Matrix4().makeBasis(X, Yn, N);
  obj.quaternion.setFromRotationMatrix(m);
  obj.position.copy(P);
}

// ---------------------------------------------------------------------------
// Headband sweep helpers
// ---------------------------------------------------------------------------
function bandCurve(phi, out = new THREE.Vector3()) {
  const { A, Y0, B, p } = BAND;
  return out.set(A * spow(Math.cos(phi), 2 / p), Y0 + B * Math.pow(Math.abs(Math.sin(phi)), 2 / p), 0);
}
function bandFrame(phi) {
  const e = 1e-4;
  const C = bandCurve(phi);
  const T = bandCurve(phi + e).sub(bandCurve(phi - e)).normalize();
  const N = new THREE.Vector3(-T.y, T.x, 0);
  return { C, T, N };
}
const BZ = new THREE.Vector3(0, 0, 1);

function sweep(phi0, phi1, nu, nv, section, opt = {}) {
  return gridGeometry(nu, nv, (u, v, p) => {
    const phi = phi0 + (phi1 - phi0) * u;
    const { C, N } = bandFrame(phi);
    const [cu, cv] = section(u, v);
    p.copy(C).addScaledVector(N, cu).addScaledVector(BZ, cv);
  }, { flip: true, ...opt });
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
export function createMaterials() {
  const grain = TX.grainTextures();
  const knit = TX.knitTextures();
  const canopy = TX.canopyTextures();
  const grille = TX.grilleTextures();
  const leather = TX.leatherTextures();
  const L = TX.lrTextures('L'), R = TX.lrTextures('R');

  const rep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };

  const alu = new THREE.MeshPhysicalMaterial({
    color: 0xdedfe1, metalness: 0.92, roughness: 0.25,
    normalMap: rep(grain.normal, 26, 14), normalScale: new THREE.Vector2(0.035, 0.035),
    specularIntensity: 1, envMapIntensity: 1.05,
  });
  const aluGhost = alu.clone();
  aluGhost.transparent = true;
  const crownAlu = alu.clone();
  crownAlu.roughness = 0.32;

  const M = {
    alu, aluGhost, crownAlu,
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xe8e9ec, metalness: 1, roughness: 0.06, envMapIntensity: 1.25 }),
    band: new THREE.MeshPhysicalMaterial({ color: 0xf0f0ee, metalness: 0, roughness: 0.62, sheen: 0.5, sheenRoughness: 0.7, sheenColor: 0xffffff, clearcoat: 0.05 }),
    canopy: new THREE.MeshPhysicalMaterial({
      color: 0xf2f2f0, roughness: 0.85, metalness: 0, sheen: 1, sheenRoughness: 0.5, sheenColor: 0xffffff,
      map: rep(canopy.map, 22, 2), normalMap: rep(canopy.normal, 22, 2), alphaMap: rep(canopy.alpha, 22, 2),
      alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.8, 0.8),
    }),
    knit: new THREE.MeshPhysicalMaterial({
      color: 0xe6e6e4, roughness: 0.95, metalness: 0, sheen: 1, sheenRoughness: 0.55, sheenColor: 0xffffff,
      map: rep(knit.map, 44, 9), normalMap: rep(knit.normal, 44, 9), normalScale: new THREE.Vector2(0.9, 0.9),
    }),
    lrL: new THREE.MeshPhysicalMaterial({ color: 0xcfcfcd, roughness: 0.9, sheen: 0.6, sheenColor: 0xffffff, map: L.map, normalMap: L.normal, side: THREE.DoubleSide }),
    lrR: new THREE.MeshPhysicalMaterial({ color: 0xcfcfcd, roughness: 0.9, sheen: 0.6, sheenColor: 0xffffff, map: R.map, normalMap: R.normal, side: THREE.DoubleSide }),
    grille: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.1, map: grille.map, normalMap: grille.normal, normalScale: new THREE.Vector2(0.6, 0.6) }),
    plasticDark: new THREE.MeshPhysicalMaterial({ color: 0x18181a, roughness: 0.42, metalness: 0.05, clearcoat: 0.2 }),
    plasticGray: new THREE.MeshPhysicalMaterial({ color: 0x4a4b50, roughness: 0.5, metalness: 0.05 }),
    slit: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.75 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.5, metalness: 0.4 }),
    pcb: new THREE.MeshPhysicalMaterial({ color: 0x0e1d16, roughness: 0.38, metalness: 0.15, clearcoat: 0.6 }),
    chip: new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.2 }),
    h1: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: TX.chipTexture(), roughness: 0.3, metalness: 0.4 }),
    gold: new THREE.MeshPhysicalMaterial({ color: 0xd8ab55, roughness: 0.28, metalness: 1 }),
    copper: new THREE.MeshPhysicalMaterial({ color: 0xc8812f, roughness: 0.38, metalness: 0.6, clearcoat: 0.6 }),
    magnet: new THREE.MeshPhysicalMaterial({ color: 0xd2d3d6, roughness: 0.2, metalness: 1 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x151517, roughness: 0.82 }),
    cone: new THREE.MeshPhysicalMaterial({ color: 0x232326, roughness: 0.6, metalness: 0.1, sheen: 0.3 }),
    battery: new THREE.MeshPhysicalMaterial({ color: 0x0f0f11, roughness: 0.55, metalness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.04, metalness: 0, clearcoat: 1 }),
    case: new THREE.MeshPhysicalMaterial({
      color: 0xebebe8, roughness: 0.78, metalness: 0, sheen: 0.7, sheenRoughness: 0.8, sheenColor: 0xffffff,
      normalMap: rep(leather.normal, 0.35, 0.35), normalScale: new THREE.Vector2(0.55, 0.55),
    }),
  };
  return M;
}

// ---------------------------------------------------------------------------
// Shared geometries (built once, instanced across both cups)
// ---------------------------------------------------------------------------
function buildSharedGeometries() {
  const G = {};
  G.shell = loft(SHELL_PROFILE, { segs: 220, poleEnd: true });
  // Cushion: pillowy closed superelliptic section (memory foam under knit).
  G.cushion = loft(loopProfile(0.795, 0.205, -1.62, 1.42, 3.2, 96), { segs: 220, closed: true });
  G.cushionBack = loft([[0.975, -0.19], [0.62, -0.19]], { segs: 160 });
  const planar = (sc) => (u, v, p) => [0.5 - p.x / (2 * CUP.a * sc), 0.5 + p.y / (2 * CUP.b * sc)];
  G.lr = loft([[0, -0.4], [0.2, -0.4], [0.4, -0.4], [0.63, -0.4]], { segs: 160, poleStart: true, uvFn: planar(0.63) });
  G.grille = loft([[0, -0.05], [0.3, -0.05], [0.6, -0.05], [0.885, -0.05]], { segs: 160, poleStart: true, uvFn: planar(0.885) });
  G.rim = loft(loopProfile(0.925, 0.052, -0.1, 0.1, 3, 32), { segs: 200, closed: true });
  G.chassis = loft(loopProfile(0.83, 0.1, 0.9, 0.55, 3, 32), { segs: 180, closed: true });
  // Digital Crown knurled barrel: 72 individually modeled ridges.
  const R = 0.6, H = 0.36, ridges = 72;
  G.knurl = gridGeometry(ridges * 4, 10, (u, v, p) => {
    const th = u * TAU;
    const tri = 1 - Math.abs(2 * ((u * ridges) % 1) - 1);
    const edge = Math.pow(Math.abs(v * 2 - 1), 10);
    const r = R + 0.028 * tri * (1 - edge) - 0.03 * edge;
    p.set(Math.cos(th) * r, v * H, Math.sin(th) * r);
  }, { closeU: true, flip: true });
  G.crownCap = new THREE.CylinderGeometry(R - 0.035, R - 0.02, 0.05, 96);
  G.crownCollar = new THREE.CylinderGeometry(R + 0.06, R + 0.08, 0.06, 96);
  // Noise Control pill button + seat
  const pill = (len, wid, depth, bevel) => {
    const s = new THREE.Shape();
    const r = wid / 2, hl = len / 2 - r;
    s.moveTo(-hl, -r); s.lineTo(hl, -r); s.absarc(hl, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(-hl, r); s.absarc(-hl, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 32 });
    return g;
  };
  G.button = pill(1.1, 0.32, 0.04, 0.035);
  G.buttonSeat = pill(1.22, 0.44, 0.02, 0.01);
  G.slit = new THREE.CapsuleGeometry(0.05, 0.42, 4, 12);
  G.port = new THREE.CapsuleGeometry(0.11, 0.62, 4, 16);
  G.stemRing = new THREE.TorusGeometry(0.37, 0.05, 16, 64);
  G.stemBall = new THREE.SphereGeometry(0.3, 48, 24);
  G.magnet = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 32);
  G.pin = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 16);
  return G;
}

function addMicSlit(parent, geo, mat, theta, f, along = 'theta', thin = 0.35) {
  const { P, N, Tt, Tf } = shellFrame(theta, f);
  const dir = along === 'theta' ? Tt : Tf;
  const m = new THREE.Mesh(geo, mat);
  const X = new THREE.Vector3().crossVectors(dir, N).normalize();
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, dir, N));
  m.position.copy(P).addScaledVector(N, -0.012);
  m.scale.set(1, 1, thin);
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Internal electronics / driver (right cup, exploded view)
// ---------------------------------------------------------------------------
function buildElectronics(M, front) {
  const g = new THREE.Group();
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(4.2, 1.9, 0.1, 2, 0.05), M.pcb);
  pcb.position.set(front * 0.2, 1.75, 0);
  g.add(pcb);
  const h1 = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.78, 0.12, 2, 0.02), [M.chip, M.chip, M.chip, M.chip, M.chip, M.h1]);
  // RoundedBox has a single group; use a lid plane for the marking instead.
  h1.material = M.chip;
  h1.position.set(front * -0.6, 1.8, -0.1);
  g.add(h1);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), M.h1);
  lid.rotation.y = Math.PI;
  lid.position.set(front * -0.6, 1.8, -0.165);
  g.add(lid);
  const chipGeo = new RoundedBoxGeometry(1, 1, 1, 1, 0.08);
  for (const [x, y, w, h] of [[0.6, 2.2, 0.5, 0.4], [1.2, 1.4, 0.6, 0.35], [-1.6, 1.4, 0.4, 0.4], [0.4, 1.35, 0.3, 0.3], [1.6, 2.15, 0.35, 0.45]]) {
    const c = new THREE.Mesh(chipGeo, M.chip);
    c.scale.set(w, h, 0.09);
    c.position.set(front * x, y, -0.08);
    g.add(c);
  }
  for (let i = 0; i < 10; i++) {
    const pad = new THREE.Mesh(chipGeo, M.gold);
    pad.scale.set(0.12, 0.05, 0.02);
    pad.position.set(front * (-1.8 + i * 0.18), 1.0, -0.055);
    g.add(pad);
  }
  const battery = new THREE.Mesh(new RoundedBoxGeometry(2.7, 2.1, 0.75, 4, 0.14), M.battery);
  battery.position.set(front * -0.1, -1.35, 0.25);
  g.add(battery);
  const bat2 = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.5, 0.55, 3, 0.1), M.battery);
  bat2.position.set(front * 1.9, -0.2, 0.15);
  g.add(bat2);
  const flex = (pts, r = 0.05) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(front * p[0], p[1], p[2])));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, r, 10, false), M.copper);
    m.scale.z = 0.5;
    g.add(m);
  };
  flex([[-1.9, 1.6, 0], [-2.5, 0.8, 0.05], [-2.4, -0.6, 0.1], [-1.4, -1.6, -0.15]]);
  flex([[1.8, 1.2, 0], [2.3, 0.4, 0], [2.1, -0.9, 0.1], [1.2, -2.2, -0.12]], 0.04);
  flex([[0, 2.6, 0], [0.2, 3.2, 0.1], [0, 3.8, 0.4]], 0.06);
  // optical + position sensors
  const bracket = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.5, 0.3, 2, 0.05), M.plasticDark);
  bracket.position.set(front * -1.4, 2.9, -0.05);
  g.add(bracket);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 16, 0, TAU, 0, Math.PI / 2), M.glass);
  lens.rotation.x = -Math.PI / 2;
  lens.position.set(front * -1.4, 2.9, -0.2);
  g.add(lens);
  const hall = new THREE.Mesh(chipGeo, M.chip);
  hall.scale.set(0.3, 0.3, 0.12);
  hall.position.set(front * 1.2, 2.9, -0.05);
  g.add(hall);
  g.userData.h1 = h1;
  return g;
}

function buildDriver(M) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.x = -Math.PI / 2; // lathe +Y → cup −Z (towards the ear)
  g.add(inner);
  const lathe = (pts, mat, segs = 128) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat);
    inner.add(m);
    return m;
  };
  // Basket frame
  lathe([[1.95, -0.05], [2.28, -0.05], [2.3, 0.0], [2.3, 0.14], [2.25, 0.18], [1.95, 0.18], [1.95, -0.05]], M.plasticDark);
  // Surround (half-roll)
  const sur = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI * (i / 24); sur.push([1.82 + Math.cos(Math.PI - a) * 0.13, 0.12 + Math.sin(a) * 0.1]); }
  lathe(sur, M.rubber);
  // Cone (dished diaphragm)
  const cone = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; const r = 0.55 + t * 1.15; cone.push([r, 0.34 - Math.pow(t, 0.8) * 0.24]); }
  lathe(cone.reverse(), M.cone);
  // Dust cap
  const cap = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; cap.push([Math.sin(a) * 0.58, 0.32 + Math.cos(a) * 0.14]); }
  lathe(cap, M.cone);
  // Dual neodymium ring magnets + pole plates
  lathe([[0.62, -0.12], [1.3, -0.12], [1.3, -0.38], [0.62, -0.38], [0.62, -0.12]], M.magnet);
  lathe([[0.62, -0.42], [1.3, -0.42], [1.3, -0.68], [0.62, -0.68], [0.62, -0.42]], M.magnet);
  lathe([[0.01, -0.05], [1.35, -0.05], [1.35, -0.11], [0.01, -0.11]], M.chrome);
  lathe([[0.01, -0.69], [1.38, -0.69], [1.38, -0.76], [0.01, -0.76]], M.plasticDark);
  // Basket spokes
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.9), M.plasticDark);
    const a = (i / 6) * TAU;
    s.position.set(Math.cos(a) * 1.55, -0.02, Math.sin(a) * 1.55);
    s.rotation.y = -a + Math.PI / 2;
    inner.add(s);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Ear cup
// ---------------------------------------------------------------------------
function buildCup(side, M, G) {
  const front = side < 0 ? 1 : -1; // local +x maps to world front for the left cup
  const cup = new THREE.Group();
  const shell = new THREE.Mesh(G.shell, side > 0 ? M.aluGhost : M.alu);
  cup.add(shell);
  const anchors = {};

  // stem socket
  const top = shellFrame(Math.PI / 2, wallF(STEM_Z));
  const ring = new THREE.Mesh(G.stemRing, M.seat);
  ring.position.copy(top.P).add(new THREE.Vector3(0, -0.035, 0));
  ring.rotation.x = Math.PI / 2;
  cup.add(ring);
  const ball = new THREE.Mesh(G.stemBall, M.chrome);
  ball.position.copy(top.P).add(new THREE.Vector3(0, 0.02, 0));
  cup.add(ball);

  // microphones & vents
  addMicSlit(cup, G.slit, M.slit, thetaForX(front * 2.95, true), wallF(0.45), 'theta');
  addMicSlit(cup, G.slit, M.slit, thetaForX(-front * 3.1, true), wallF(0.45), 'theta');
  addMicSlit(cup, G.slit, M.slit, thetaForX(0.45, false), wallF(1.0), 'f');
  addMicSlit(cup, G.slit, M.slit, thetaForX(-0.45, false), wallF(1.0), 'f');
  addMicSlit(cup, G.slit, M.slit, thetaForX(front * 2.6, false), 12 + 30, 'theta', 0.3);

  let crownSpin = null;
  if (side > 0) {
    // Digital Crown
    const cf = shellFrame(thetaForX(front * 1.95, true), wallF(1.0));
    const crown = new THREE.Group();
    placeOnSurface(crown, cf.P, cf.N, new THREE.Vector3(0, 0, 1));
    // re-orient: crown axis (local Y of meshes) along surface normal
    const holder = new THREE.Group();
    holder.rotation.x = Math.PI / 2; // mesh +Y → crown-frame +Z (= normal)
    crown.add(holder);
    const collar = new THREE.Mesh(G.crownCollar, M.seat);
    collar.position.y = -0.02;
    holder.add(collar);
    crownSpin = new THREE.Group();
    holder.add(crownSpin);
    const knurl = new THREE.Mesh(G.knurl, M.crownAlu);
    knurl.position.y = 0.0;
    crownSpin.add(knurl);
    const cap = new THREE.Mesh(G.crownCap, M.crownAlu);
    cap.position.y = 0.36;
    crownSpin.add(cap);
    const a = new THREE.Object3D(); a.position.y = 0.42; holder.add(a);
    anchors.crown = a;
    cup.add(crown);

    // Noise Control button
    const bf = shellFrame(thetaForX(-front * 1.75, true), wallF(1.0));
    const btn = new THREE.Group();
    placeOnSurface(btn, bf.P, bf.N, new THREE.Vector3(0, 0, 1));
    const bh = new THREE.Group();
    // pill long axis follows the cup's tangent (local X of the surface frame)
    btn.add(bh);
    const seat = new THREE.Mesh(G.buttonSeat, M.seat);
    seat.position.z = -0.03;
    bh.add(seat);
    const b = new THREE.Mesh(G.button, M.crownAlu);
    b.position.z = -0.01;
    bh.add(b);
    const ab = new THREE.Object3D(); ab.position.z = 0.1; btn.add(ab);
    anchors.button = ab;
    cup.add(btn);

    // charging port
    addMicSlit(cup, G.port, M.slit, thetaForX(-front * 1.3, false), wallF(1.05), 'theta', 0.5);
  }

  // Inner acoustic housing (perforated baffle + magnetic rim)
  const housing = new THREE.Group();
  housing.add(new THREE.Mesh(G.grille, M.grille));
  housing.add(new THREE.Mesh(G.rim, M.plasticGray));
  const mags = new THREE.InstancedMesh(G.magnet, M.magnet, 8);
  const pins = new THREE.InstancedMesh(G.pin, M.chrome, 4);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * TAU + Math.PI / 8;
    const [x, y] = superXY(th, 0.925);
    tmp.position.set(x, y, -0.2); tmp.rotation.set(Math.PI / 2, 0, 0); tmp.updateMatrix();
    mags.setMatrixAt(i, tmp.matrix);
  }
  for (let i = 0; i < 4; i++) {
    const th = (i / 4) * TAU + Math.PI / 4;
    const [x, y] = superXY(th, 0.925);
    tmp.position.set(x, y, -0.3); tmp.rotation.set(Math.PI / 2, 0, 0); tmp.updateMatrix();
    pins.setMatrixAt(i, tmp.matrix);
  }
  housing.add(mags, pins);
  const aMag = new THREE.Object3D(); aMag.position.set(...superXY(-Math.PI * 0.62, 0.93), -0.2); housing.add(aMag);
  const aGrille = new THREE.Object3D(); aGrille.position.set(0, 0.6, -0.06); housing.add(aGrille);
  anchors.magnet = aMag; anchors.grille = aGrille;
  cup.add(housing);

  // Cushion (knit textile over memory foam + L/R mesh)
  const cushion = new THREE.Group();
  cushion.add(new THREE.Mesh(G.cushion, M.knit));
  cushion.add(new THREE.Mesh(G.cushionBack, M.plasticGray));
  cushion.add(new THREE.Mesh(G.lr, side < 0 ? M.lrL : M.lrR));
  const aLR = new THREE.Object3D(); aLR.position.set(0, -0.6, -0.42); cushion.add(aLR);
  const aFoam = new THREE.Object3D(); aFoam.position.set(...superXY(Math.PI * 0.02, 0.84), -2.5); cushion.add(aFoam);
  anchors.lr = aLR; anchors.foam = aFoam;
  cup.add(cushion);

  const parts = { cup, shell, housing, cushion, crownSpin, anchors, front };
  if (side > 0) {
    const chassis = new THREE.Mesh(G.chassis, M.plasticDark);
    cup.add(chassis);
    const electronics = buildElectronics(M, front);
    electronics.position.z = 1.5;
    cup.add(electronics);
    const driver = buildDriver(M);
    driver.position.z = 0.55;
    cup.add(driver);
    parts.electronics = electronics; parts.driver = driver;
    const aShell = new THREE.Object3D(); aShell.position.set(front * -2.2, 2.6, 2.9); cup.add(aShell);
    const aDrv = new THREE.Object3D(); aDrv.position.set(0, 2.2, 0); driver.add(aDrv);
    const aEl = new THREE.Object3D(); aEl.position.set(front * -0.6, 1.8, -0.2); electronics.add(aEl);
    const aHou = new THREE.Object3D(); aHou.position.set(0, -CUP.b * 0.93, -0.12); housing.add(aHou);
    const aCush = new THREE.Object3D(); aCush.position.set(0, -CUP.b * 0.98, -1.6); cushion.add(aCush);
    Object.assign(anchors, { xShell: aShell, xDriver: aDrv, xElec: aEl, xHousing: aHou, xCushion: aCush });
  }
  const center = new THREE.Object3D(); cup.add(center); anchors.center = center;
  cup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return parts;
}

// ---------------------------------------------------------------------------
// Smart Case
// ---------------------------------------------------------------------------
function caseShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 3.9);
  s.lineTo(5.0, 3.9);
  s.bezierCurveTo(8.6, 3.9, 11.0, 2.6, 11.7, 0.6);
  s.bezierCurveTo(12.3, -1.2, 11.7, -3.7, 9.9, -4.5);
  s.bezierCurveTo(8.2, -5.15, 6.0, -5.05, 4.3, -4.35);
  s.bezierCurveTo(2.4, -3.6, 1.2, -2.3, 0, -1.75);
  s.bezierCurveTo(-1.2, -2.3, -2.4, -3.6, -4.3, -4.35);
  s.bezierCurveTo(-6.0, -5.05, -8.2, -5.15, -9.9, -4.5);
  s.bezierCurveTo(-11.7, -3.7, -12.3, -1.2, -11.7, 0.6);
  s.bezierCurveTo(-11.0, 2.6, -8.6, 3.9, -5.0, 3.9);
  s.lineTo(0, 3.9);
  return s;
}
function contoured(geo, bulgeSign, amount) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const lobe = Math.exp(-Math.pow((Math.abs(x) - 7.2) / 4.6, 2));
    const b = amount * (0.35 + 0.65 * lobe) * clamp01((3.9 - y) / 3.2) * clamp01((y + 5.2) / 2.5);
    p.setZ(i, p.getZ(i) + bulgeSign * b);
  }
  geo.deleteAttribute('normal');
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}
function roundedPanel(w, h, r, roundTop = true) {
  const s = new THREE.Shape();
  const x0 = -w / 2, x1 = w / 2;
  s.moveTo(x0, 0);
  s.lineTo(x0, -h + r); s.quadraticCurveTo(x0, -h, x0 + r, -h);
  s.lineTo(x1 - r, -h); s.quadraticCurveTo(x1, -h, x1, -h + r);
  s.lineTo(x1, 0);
  if (roundTop) s.lineTo(x0, 0);
  s.closePath();
  return s;
}

function buildCase(M) {
  const g = new THREE.Group();
  const shape = caseShape();
  const ex = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.24, bevelSize: 0.24, bevelSegments: 6, curveSegments: 72 };
  const front = new THREE.Mesh(contoured(new THREE.ExtrudeGeometry(shape, ex), 1, 0.5), M.case);
  front.position.z = 5.35;
  const back = new THREE.Mesh(contoured(new THREE.ExtrudeGeometry(shape, ex), -1, 0.5), M.case);
  back.position.z = -2.55;
  g.add(front, back);
  // bottom bridge linking panels at the centre notch
  const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.5, 8.4, 3, 0.2), M.case);
  bridge.position.set(0, -1.75, 1.5);
  g.add(bridge);
  // Articulated magnetic flap: hinge A (top span) → hinge B (front drop)
  const hingeA = new THREE.Group();
  hingeA.position.set(0, 4.36, -2.45);
  const aGeo = new THREE.ExtrudeGeometry(roundedPanel(8.4, 9.0, 0.05), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 16 });
  aGeo.rotateX(Math.PI / 2); // shape −Y → +Z (front), thickness → −Y
  aGeo.rotateY(0);
  const aMesh = new THREE.Mesh(aGeo, M.case);
  // after rotateX(+90°): y→z, so shape y∈[−9,0] maps to z∈[−9,0]; flip so it extends +Z
  aMesh.rotation.y = Math.PI;
  hingeA.add(aMesh);
  const hingeB = new THREE.Group();
  hingeB.position.set(0, 0, 9.0);
  hingeA.add(hingeB);
  const bGeo = new THREE.ExtrudeGeometry(roundedPanel(8.4, 5.4, 1.5), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 24 });
  const bMesh = new THREE.Mesh(bGeo, M.case);
  hingeB.add(bMesh);
  g.add(hingeA);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, hingeA, hingeB };
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
export function buildAirPodsMax() {
  const M = createMaterials();
  const G = buildSharedGeometries();
  const root = new THREE.Group();
  root.position.y = ROOT_Y;
  const headset = new THREE.Group();
  root.add(headset);

  // Headband: soft-touch sleeves, stainless frame rails, perforated knit canopy
  const band = new THREE.Group();
  headset.add(band);
  const phiS = 0.62;
  const sleeveSection = (f) => (u, v) => {
    const t = v * TAU;
    let half = 0.47 + (0.27 - 0.47) * smooth(0.35, 0.85, f(u));
    const fu = f(u);
    const bottom = fu < 0.05 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - fu / 0.05, 2))) : 1;
    const topWedge = fu > 0.86 ? Math.sqrt(Math.max(0.0, 1 - Math.pow((fu - 0.86) / 0.14, 2))) : 1;
    const cu = half * bottom * topWedge * spow(Math.cos(t), 0.5);
    const cv = 1.5 * Math.max(bottom, 0.0) * spow(Math.sin(t), 0.5);
    return [cu, cv];
  };
  const sleeveR = new THREE.Mesh(sweep(0, phiS, 90, 64, sleeveSection((u) => u)), M.band);
  const sleeveL = new THREE.Mesh(sweep(Math.PI - phiS, Math.PI, 90, 64, sleeveSection((u) => 1 - u)), M.band);
  band.add(sleeveR, sleeveL);
  for (const zc of [-1.25, 1.25]) {
    const rail = new THREE.Mesh(sweep(0.5, Math.PI - 0.5, 160, 24, (u, v) => {
      const t = v * TAU; return [0.25 * Math.cos(t), zc + 0.25 * Math.sin(t)];
    }), M.band);
    band.add(rail);
  }
  const canopy = new THREE.Mesh(gridGeometry(200, 16, (u, v, p) => {
    const phi = 0.52 + (Math.PI - 1.04) * u;
    const { C, N } = bandFrame(phi);
    const w = v * 2 - 1;
    p.copy(C).addScaledVector(N, 0.16 * (1 - w * w)).addScaledVector(BZ, w * 1.12);
  }), M.canopy);
  band.add(canopy);
  const aCanopy = new THREE.Object3D();
  aCanopy.position.copy(bandFrame(Math.PI / 2).C).add(new THREE.Vector3(0, -0.16, 0.4));
  band.add(aCanopy);

  // collars & telescoping arms
  const collarGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.55, 64);
  const armGeo = new THREE.CylinderGeometry(0.265, 0.265, 1, 48);
  const sides = {};
  for (const side of [-1, 1]) {
    const collar = new THREE.Mesh(collarGeo, M.chrome);
    collar.position.set(side * BAND.A, BAND.Y0 - 0.275, 0);
    band.add(collar);
    const arm = new THREE.Mesh(armGeo, M.chrome);
    band.add(arm);
    const parts = buildCup(side, M, G);
    const yoke = new THREE.Group();
    const swivel = new THREE.Group();
    const orient = new THREE.Group();
    orient.rotation.y = side * Math.PI / 2;
    parts.cup.position.set(0, -CUP.b, -STEM_Z);
    yoke.add(swivel); swivel.add(orient); orient.add(parts.cup);
    headset.add(yoke);
    sides[side] = { ...parts, yoke, swivel, arm };
  }
  band.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Smart Case (child of root, not of the headset so they can move independently)
  const sc = buildCase(M);
  root.add(sc.group);
  const caseCenterY = BAND.Y0 - 0.55 - 1.15 - CUP.b; // cup centre height at retracted arms

  const anchors = {
    canopy: aCanopy,
    crown: sides[1].anchors.crown, button: sides[1].anchors.button,
    lr: sides[-1].anchors.lr, foam: sides[-1].anchors.foam,
    magnet: sides[1].anchors.magnet, grille: sides[-1].anchors.grille,
    xShell: sides[1].anchors.xShell, xElec: sides[1].anchors.xElec, xDriver: sides[1].anchors.xDriver,
    xHousing: sides[1].anchors.xHousing, xCushion: sides[1].anchors.xCushion,
    rCenter: sides[1].anchors.center, lCenter: sides[-1].anchors.center,
  };

  function setPose(s) {
    root.rotation.set(s.rotX || 0, s.rotY || 0, 0);
    headset.position.y = s.drop || 0;
    const L = 1.15 + 1.3 * s.ext;
    const stemY = BAND.Y0 - 0.55 - L;
    for (const side of [-1, 1]) {
      const o = sides[side];
      const len = L + 0.4;
      o.arm.scale.y = len;
      o.arm.position.set(side * BAND.A, stemY + len / 2, 0);
      o.yoke.position.set(side * BAND.A, stemY, 0);
      o.yoke.rotation.z = -side * s.roll;
      o.swivel.rotation.y = side < 0 ? s.yawL : s.yawR;
      const lift = s.lift || 0;
      o.cushion.position.set(-side * lift * 6.2, -lift * 1.1, -lift * 2.4);
      o.cushion.rotation.set(lift * 0.05, -side * lift * 0.28, 0);
      o.cushion.scale.setScalar(1 + (s.snap || 0) * 0.015);
    }
    const r = sides[1], e = s.explode || 0;
    r.electronics.position.z = 1.5 - e * 5.3;
    r.driver.position.z = 0.55 - e * 7.9;
    r.housing.position.z = -e * 10.6;
    r.cushion.position.z += -e * 14.6;
    M.aluGhost.opacity = 1 - 0.78 * (s.ghost || 0);
    M.aluGhost.depthWrite = (s.ghost || 0) < 0.02;
    r.crownSpin.rotation.y = s.crown || 0;
    // Smart Case
    const rise = s.caseRise || 0;
    sc.group.visible = rise > 0.001;
    sc.group.position.y = caseCenterY + (rise - 1) * 24;
    const f = s.flap || 0;
    sc.hingeA.rotation.x = -Math.PI / 2 * (1 - smooth(0, 0.62, f));
    sc.hingeB.rotation.x = -Math.PI / 2 * (1 - smooth(0.35, 1, f)) + 0.0;
  }

  const tmpC = { alu: new THREE.Color(), band: new THREE.Color(), knit: new THREE.Color(), case: new THREE.Color() };
  function setColors(c) {
    M.alu.color.copy(c.alu); M.aluGhost.color.copy(c.alu);
    M.crownAlu.color.copy(c.alu).lerp(tmpC.alu.set(0xffffff), 0.12);
    M.band.color.copy(c.band);
    M.canopy.color.copy(c.band).lerp(tmpC.band.set(0xffffff), 0.06);
    M.knit.color.copy(c.knit);
    M.knit.sheenColor.copy(c.knit).lerp(tmpC.knit.set(0xffffff), 0.5);
    M.lrL.color.copy(c.knit).multiplyScalar(0.85); M.lrR.color.copy(M.lrL.color);
    M.case.color.copy(c.case);
    M.case.sheenColor.copy(c.case).lerp(tmpC.case.set(0xffffff), 0.4);
  }

  return { root, headset, anchors, setPose, setColors, materials: M, sides, caseCenterY };
}
