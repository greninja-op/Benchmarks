import * as THREE from 'three';

const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

/**
 * Superellipsoid with its poles on the local Z axis.
 * a, b: half extents along X and Y. c: half extent along Z.
 * e1 controls how boxy the profile is, e2 controls the corner rounding of the outline.
 * Normals come from finite differences on the parametric grid, so there is no seam at the wrap.
 */
export function superEllipsoid({
  a, b, c, e1 = 0.5, e2 = 0.35,
  etaMin = -Math.PI / 2, etaMax = Math.PI / 2,
  nu = 56, nv = 112, taper = 0, uvTile = 1,
}) {
  const rows = nu + 1;
  const cols = nv + 1;
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    const eta = etaMin + (etaMax - etaMin) * t;
    const rxy = sp(Math.cos(eta), e1);
    const z = c * sp(Math.sin(eta), e1);
    for (let j = 0; j <= nv; j++) {
      const u = j / nv;
      const om = -Math.PI + 2 * Math.PI * u;
      const y = b * rxy * sp(Math.sin(om), e2);
      const x = a * rxy * sp(Math.cos(om), e2) * (1 - taper * (1 + y / b) * 0.5);
      const k = i * cols + j;
      pos.set([x, y, z], k * 3);
      uv.set([u * uvTile, t * uvTile], k * 2);
    }
  }
  const index = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a0 = i * cols + j;
      const b0 = (i + 1) * cols + j;
      const c0 = (i + 1) * cols + j + 1;
      const d0 = i * cols + j + 1;
      index.push(a0, d0, b0, b0, d0, c0);
    }
  }
  const P = (i, j) => {
    const jj = ((j % nv) + nv) % nv;
    const k = (i * cols + jj) * 3;
    return new THREE.Vector3(pos[k], pos[k + 1], pos[k + 2]);
  };
  const nor = new Float32Array(rows * cols * 3);
  const dA = new THREE.Vector3();
  const dB = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(nu, i + 1);
    const atBottom = i === 0 && etaMin <= -Math.PI / 2 + 1e-9;
    const atTop = i === nu && etaMax >= Math.PI / 2 - 1e-9;
    for (let j = 0; j <= nv; j++) {
      const k = (i * cols + j) * 3;
      if (atBottom || atTop) {
        nor.set([0, 0, atTop ? 1 : -1], k);
        continue;
      }
      dA.subVectors(P(i, j + 1), P(i, j - 1));
      dB.subVectors(P(i1, j), P(i0, j));
      n.crossVectors(dA, dB);
      const p = P(i, j);
      if (n.dot(p) < 0) n.negate();
      n.normalize();
      nor.set([n.x, n.y, n.z], k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
/**
 * Sweeps an ellipse cross-section (half sizes a, b) along a planar centerline lying in XY.
 * phi0..phi1 selects an arc of the ellipse: the full ring makes the sleeve, a sector makes the knit canopy.
 */
export function sweepBand({ pts, a, b, nPhi = 48, phi0 = 0, phi1 = Math.PI * 2, offset = 0, uvTile = 2 }) {
  const rows = pts.length;
  const cols = nPhi + 1;
  const A = a + offset;
  const B = b + offset;
  const pos = new Float32Array(rows * cols * 3);
  const nor = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  const Z = new THREE.Vector3(0, 0, 1);
  const cum = new Float32Array(rows);
  for (let i = 1; i < rows; i++) cum[i] = cum[i - 1] + pts[i].distanceTo(pts[i - 1]);
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < rows; i++) {
    T.subVectors(pts[Math.min(rows - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    N.crossVectors(T, Z).normalize();
    for (let j = 0; j <= nPhi; j++) {
      const ph = phi0 + (phi1 - phi0) * (j / nPhi);
      const cs = Math.cos(ph);
      const sn = Math.sin(ph);
      const k = i * cols + j;
      pos.set([
        pts[i].x + A * cs * N.x + B * sn * Z.x,
        pts[i].y + A * cs * N.y + B * sn * Z.y,
        pts[i].z + A * cs * N.z + B * sn * Z.z,
      ], k * 3);
      nn.set(0, 0, 0).addScaledVector(N, cs / A).addScaledVector(Z, sn / B).normalize();
      nor.set([nn.x, nn.y, nn.z], k * 3);
      uv.set([cum[i] / uvTile, (ph * (A + B) * 0.5) / uvTile], k * 2);
    }
  }
  const index = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < nPhi; j++) {
      const a0 = i * cols + j;
      const b0 = (i + 1) * cols + j;
      const c0 = (i + 1) * cols + j + 1;
      const d0 = i * cols + j + 1;
      index.push(a0, b0, d0, b0, c0, d0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** Planar UVs from absolute X/Y in cm, so a tileable texture keeps one physical scale. */
export function planarUVAbs(geometry, tileCm) {
  const p = geometry.attributes.position;
  const uv = new Float32Array(p.count * 2);
  // Project along the dominant normal axis, so side walls do not stretch the knit into streaks.
  const n = geometry.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    let u = x;
    let v = y;
    if (az >= ax && az >= ay) {
      u = x;
      v = y;
    } else if (ax >= ay) {
      u = z;
      v = y;
    } else {
      u = x;
      v = z;
    }
    uv.set([u / tileCm, v / tileCm], i * 2);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Maps the XY bounding box of a geometry onto 0..1 UVs. Used for the grille plate. */
export function fitUV(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const p = geometry.attributes.position;
  const sx = bb.max.x - bb.min.x || 1;
  const sy = bb.max.y - bb.min.y || 1;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) uv.set([(p.getX(i) - bb.min.x) / sx, (p.getY(i) - bb.min.y) / sy], i * 2);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
/** Superellipse (Lame curve) outline as a THREE.Shape, centered on the origin. */
export function superEllipseShape(a, b, e = 2.6, n = 120) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = a * sp(Math.cos(t), 2 / e);
    const y = b * sp(Math.sin(t), 2 / e);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

/** Stadium (pill) button. Long axis runs along Y and the extrusion points along +X. */
export function pillGeometry(length, width, depth, bevel) {
  const r = width / 2;
  const h = length / 2 - r;
  const s = new THREE.Shape();
  s.moveTo(-r, -h);
  s.lineTo(-r, h);
  s.absarc(0, h, r, Math.PI, 0, true);
  s.lineTo(r, -h);
  s.absarc(0, -h, r, 0, Math.PI, true);
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Cylinder along Y with radial knurl ridges on the side wall. Caps stay flat. */
export function knurledCylinder(radius, height, ridges, depth) {
  const g = new THREE.CylinderGeometry(radius, radius, height, ridges * 8, 1, false);
  const p = g.attributes.position;
  const nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(nrm.getY(i)) > 0.5) continue;
    const x = p.getX(i);
    const z = p.getZ(i);
    const th = Math.atan2(z, x);
    const k = 1 + depth * (0.5 + 0.5 * Math.cos(th * ridges));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}
