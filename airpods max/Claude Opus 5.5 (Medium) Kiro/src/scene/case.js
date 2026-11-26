// Smart Case: soft-touch twin-lobe shell with an articulated magnetic flap.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paramSurface, planarUV, roundedRectShape } from './geometry.js';

const T = 0.3;
const Z_FRONT = 0.205, Z_BACK = -0.455;

function halfOutline() {
  const ctrl = [[0.0, 0.3], [0.6, 0.31], [1.08, 0.3], [1.22, 0.24], [1.27, 0.05], [1.22, -0.25], [1.04, -0.5],
    [0.76, -0.62], [0.46, -0.58], [0.2, -0.44], [0.0, -0.26]];
  const c = new THREE.CatmullRomCurve3(ctrl.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  return c.getSpacedPoints(140).map((p) => [p.x, p.y]);
}

function panel(shape, zCenter, bulgeSign) {
  let g = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.028, bevelSegments: 6, curveSegments: 4 });
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-5);
  g.translate(0, 0, zCenter - 0.006);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if ((z - zCenter) * bulgeSign > 0.02) {
      const k = Math.max(0, 1 - ((Math.abs(x) - 0.68) / 0.6) ** 2 - ((y + 0.15) / 0.5) ** 2);
      p.setZ(i, z + bulgeSign * 0.03 * k * k);
    }
  }
  g.computeVertexNormals();
  return planarUV(g);
}

export function buildCase(M) {
  const group = new THREE.Group();
  const right = halfOutline();
  // closed outline: top-centre -> right lobe -> notch -> left lobe (mirrored) -> top-centre
  const leftFromNotch = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
  const full = [...right, ...leftFromNotch.slice(1)];
  const shape = new THREE.Shape(full.map(([x, y]) => new THREE.Vector2(x, y)));

  const front = new THREE.Mesh(panel(shape, Z_FRONT, 1), M.case);
  const back = new THREE.Mesh(panel(shape, Z_BACK, -1), M.case);
  group.add(front, back);

  // rim wall around the bottom (open at the top for the headband)
  const start = right.findIndex(([x]) => x > 1.0);
  const tail = right.slice(start);
  const rimPts = [...tail, ...tail.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  const nPts = rimPts.length;
  const pt = (u) => {
    const f = Math.min(nPts - 1.0001, Math.max(0, u * (nPts - 1)));
    const i = Math.floor(f), t = f - i;
    const a = rimPts[i], b = rimPts[i + 1];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const center = (x) => (Math.abs(x) > 0.15 ? [Math.sign(x) * 0.64, -0.12] : [0, -0.02]);
  const zc = (Z_FRONT + Z_BACK) / 2, hd = (Z_FRONT - Z_BACK) / 2;
  const rimG = paramSurface((u, v, P) => {
    const [x, y] = pt(u);
    const [x2, y2] = pt(Math.min(1, u + 0.002)), [x1, y1] = pt(Math.max(0, u - 0.002));
    let nx = y2 - y1, ny = -(x2 - x1); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const c = center(x); if (nx * (x - c[0]) + ny * (y - c[1]) < 0) { nx = -nx; ny = -ny; }
    const f = Math.PI * Math.min(1, Math.max(0, v));
    const out = 0.028 + 0.035 * Math.pow(Math.sin(f), 0.6);
    P.set(x + nx * out, y + ny * out, zc + hd * Math.cos(f));
  }, 260, 24, { ref: (u, v, R) => { const [x, y] = pt(u); R.set(x, y, zc); }, uvScale: [8, 1] });
  group.add(new THREE.Mesh(rimG, M.case));
  group.add(new THREE.Mesh(rimG, M.caseLining));

  // articulated flap: bridge hinged at the back top edge + front tab
  const hinge = new THREE.Group(); hinge.position.set(0, T + 0.03, Z_BACK + 0.02);
  const L = Z_FRONT + 0.04 - (Z_BACK + 0.02);
  const bridgeShape = roundedRectShape(0.8, L, 0.06); 
  const bridgeG = new THREE.ExtrudeGeometry(bridgeShape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 4 });
  bridgeG.translate(0, -L / 2, 0); bridgeG.rotateX(-Math.PI / 2);
  hinge.add(new THREE.Mesh(planarUV(bridgeG), M.case));
  const tabPivot = new THREE.Group(); tabPivot.position.set(0, 0, L); hinge.add(tabPivot);
  const tabG = new THREE.ExtrudeGeometry(roundedRectShape(0.8, 0.42, 0.07), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 4 });
  tabG.translate(0, -0.21 + 0.02, 0);
  tabPivot.add(new THREE.Mesh(planarUV(tabG), M.case));
  group.add(hinge);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, hinge, tabPivot };
}

export function updateCase(c, S) {
  const r = S.caseRise;
  c.group.visible = r > 0.001;
  const e = 1 - Math.pow(1 - r, 3);
  c.group.position.y = -3.2 + (3.2 - 0.15) * e;
  const f = S.flap; // 0 = open, 1 = closed
  const fb = Math.min(1, f * 1.6), ft = Math.max(0, (f - 0.35) / 0.65);
  const sm = (t) => t * t * (3 - 2 * t);
  c.hinge.rotation.x = -(Math.PI / 2 + 0.25) * (1 - sm(fb));
  c.tabPivot.rotation.x = -(Math.PI / 2) * (1 - sm(ft));
}
