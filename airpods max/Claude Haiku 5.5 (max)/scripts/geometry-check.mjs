// Quick numeric check: triangle winding must agree with the stored vertex normals.
import * as THREE from 'three';
import { superEllipsoid, sweepBand, pillGeometry, knurledCylinder } from '../src/scene/geometry.js';

function windingScore(g) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const idx = g.index.array;
  let agree = 0;
  let total = 0;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    A.fromBufferAttribute(p, idx[t]);
    B.fromBufferAttribute(p, idx[t + 1]);
    C.fromBufferAttribute(p, idx[t + 2]);
    e1.subVectors(B, A);
    e2.subVectors(C, A);
    fn.crossVectors(e1, e2);
    if (fn.lengthSq() < 1e-14) continue;
    const vn = new THREE.Vector3().fromBufferAttribute(n, idx[t]).add(new THREE.Vector3().fromBufferAttribute(n, idx[t + 1])).add(new THREE.Vector3().fromBufferAttribute(n, idx[t + 2]));
    total++;
    if (fn.dot(vn) > 0) agree++;
  }
  return `${agree}/${total} (${((100 * agree) / Math.max(total, 1)).toFixed(1)}%)`;
}

const cup = superEllipsoid({ a: 3.5, b: 4.7, c: 2.25, e1: 0.5, e2: 0.4, taper: 0.06, nu: 24, nv: 48 });
console.log('superEllipsoid winding', windingScore(cup));
console.log('superEllipsoid bounds', cup.boundingBox.min.toArray().map((v) => v.toFixed(2)), cup.boundingBox.max.toArray().map((v) => v.toFixed(2)));

const pts = [];
for (let i = 0; i <= 40; i++) { const th = Math.PI - (Math.PI * i) / 40; pts.push(new THREE.Vector3(7 * Math.cos(th), 6.4 + 6.8 * Math.sin(th), 0)); }
const band = sweepBand({ pts, a: 0.9, b: 1.55, nPhi: 24 });
console.log('sweepBand winding', windingScore(band));

const pill = pillGeometry(1.6, 0.75, 0.12, 0.05);
console.log('pill bounds', pill.boundingBox ?? (pill.computeBoundingBox(), pill.boundingBox).max.toArray().map((v) => v.toFixed(2)));
const knurl = knurledCylinder(0.75, 0.9, 40, 0.06);
console.log('knurl vertices', knurl.attributes.position.count);
