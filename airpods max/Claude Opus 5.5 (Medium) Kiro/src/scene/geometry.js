// Parametric geometry builders: squircle lofts, squircle tori, sweeps.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Superellipse point. */
export function sq(theta, A, B, n) {
  const c = Math.cos(theta), s = Math.sin(theta), p = 2 / n;
  return [A * Math.sign(c) * Math.pow(Math.abs(c), p), B * Math.sign(s) * Math.pow(Math.abs(s), p)];
}
/** Outward 2D normal of the superellipse at (x, y). */
export function sqNormal(x, y, A, B, n) {
  const gx = (Math.sign(x) * Math.pow(Math.abs(x / A), n - 1)) / A;
  const gy = (Math.sign(y) * Math.pow(Math.abs(y / B), n - 1)) / B;
  const l = Math.hypot(gx, gy) || 1;
  return [gx / l, gy / l];
}
/** Theta on the superellipse for a given x (upper or lower half). */
export function thetaForX(x, A, n, upper = true) {
  const c = Math.sign(x) * Math.pow(Math.min(1, Math.abs(x / A)), n / 2);
  const t = Math.acos(c);
  return upper ? t : -t;
}

/**
 * Generic parametric grid surface with analytic-quality normals from central
 * differences. fn(u, v, target) writes the point. `ref(u, v, target)` gives a
 * point the normal must face away from (used to orient automatically).
 */
export function paramSurface(fn, nu, nv, { wrapV = false, ref = null, uvScale = [1, 1], fallback = [0, 0, 1] } = {}) {
  const count = (nu + 1) * (nv + 1);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const P = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  const du = new THREE.Vector3(), dv = new THREE.Vector3(), n = new THREE.Vector3(), R = new THREE.Vector3();
  const eu = 0.25 / nu, ev = 0.25 / nv;
  let k = 0;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++, k++) {
      const u = i / nu;
      fn(u, v, P);
      fn(u + eu, v, a); fn(u - eu, v, b); du.subVectors(a, b);
      const v1 = wrapV ? v + ev : Math.min(1, v + ev), v0 = wrapV ? v - ev : Math.max(0, v - ev);
      fn(u, v1, c); fn(u, v0, d); dv.subVectors(c, d);
      n.crossVectors(du, dv);
      if (n.lengthSq() < 1e-16) n.set(...fallback); else n.normalize();
      if (ref) { ref(u, v, R); if (n.dot(R.subVectors(P, R)) < 0) n.negate(); }
      pos.set([P.x, P.y, P.z], k * 3); nor.set([n.x, n.y, n.z], k * 3);
      uv[k * 2] = u * uvScale[0]; uv[k * 2 + 1] = v * uvScale[1];
    }
  }
  const idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const A = j * (nu + 1) + i, B = A + 1, C = A + nu + 1, D = C + 1;
    idx.push(A, B, D, A, D, C);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Fix winding so front faces match the oriented normals.
  const p = g.attributes.position, nn = g.attributes.normal;
  const ta = new THREE.Vector3(), tb = new THREE.Vector3(), tc = new THREE.Vector3(), fn2 = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    ta.fromBufferAttribute(p, idx[t]); tb.fromBufferAttribute(p, idx[t + 1]); tc.fromBufferAttribute(p, idx[t + 2]);
    fn2.crossVectors(tb.sub(ta), tc.sub(ta));
    if (fn2.lengthSq() < 1e-18) continue;
    n.fromBufferAttribute(nn, idx[t]);
    if (fn2.dot(n) < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Loft a superellipse along an (r, z) profile curve. */
export function squircleLoft({ A, B, n, profile, nu = 192, nv = 80, scale = 1, zScale = 1, uvScale = [1, 1] }) {
  const curve = new THREE.CatmullRomCurve3(profile.map(([r, z]) => new THREE.Vector3(r, z, 0)), false, 'centripetal');
  return paramSurface(
    (u, v, P) => {
      const pr = curve.getPointAt(clamp(v, 0, 1));
      const [x, y] = sq(u * TAU, A, B, n);
      P.set(x * pr.x * scale, y * pr.x * scale, pr.y * zScale);
    },
    nu, nv,
    { ref: (u, v, R) => R.set(0, 0, -0.02), uvScale }
  );
}

/** Superellipse torus: base squircle + closed cross-section sec(v) -> [d, z]. */
export function squircleTorus({ A, B, n, sec, nu = 192, nv = 40, uvScale = [1, 1] }) {
  const tmp = [0, 0];
  const center = (u, R) => { const [x, y] = sq(u * TAU, A, B, n); R.set(x, y, 0); };
  return paramSurface(
    (u, v, P) => {
      const [x, y] = sq(u * TAU, A, B, n);
      const [nx, ny] = sqNormal(x, y, A, B, n);
      const s = sec(((v % 1) + 1) % 1, tmp);
      P.set(x + nx * s[0], y + ny * s[0], s[1]);
    },
    nu, nv,
    {
      wrapV: true, uvScale,
      ref: (u, v, R) => {
        center(u, R);
        // the section centre in (d, z)
        const c = sec.center || [0, 0];
        const [x, y] = [R.x, R.y];
        const [nx, ny] = sqNormal(x, y, A, B, n);
        R.set(x + nx * c[0], y + ny * c[0], c[1]);
      },
    }
  );
}

/** Rounded-box cross-section (superellipse) helper for tori and sweeps. */
export function roundSection(cd, cz, wd, wz, q = 0.5) {
  const f = (v, out) => {
    const a = v * TAU, c = Math.cos(a), s = Math.sin(a);
    out[0] = cd + wd * Math.sign(c) * Math.pow(Math.abs(c), q);
    out[1] = cz + wz * Math.sign(s) * Math.pow(Math.abs(s), q);
    return out;
  };
  f.center = [cd, cz];
  return f;
}

/** Closed superellipse as THREE.Shape (optionally offset). */
export function squircleShape(A, B, n, segs = 128, ShapeClass = THREE.Shape) {
  const s = new ShapeClass();
  for (let i = 0; i < segs; i++) {
    const [x, y] = sq((i / segs) * TAU, A, B, n);
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
export function squirclePath(A, B, n, segs = 128) {
  return squircleShape(A, B, n, segs, THREE.Path);
}

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Remap planar UVs for ShapeGeometry / ExtrudeGeometry to 0..1 bbox. */
export function planarUV(g) {
  g.computeBoundingBox();
  const bb = g.boundingBox, p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const w = bb.max.x - bb.min.x || 1, h = bb.max.y - bb.min.y || 1;
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - bb.min.x) / w;
    uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Lathe helper with smooth normals around the Y axis. */
export function lathe(points, segs = 96) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

/** Flat ribbon (flex cable) along a curve. */
export function ribbon(curve, width, thickness, steps = 80) {
  const shape = new THREE.Shape();
  shape.moveTo(-thickness / 2, -width / 2); shape.lineTo(thickness / 2, -width / 2);
  shape.lineTo(thickness / 2, width / 2); shape.lineTo(-thickness / 2, width / 2); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { steps, bevelEnabled: false, extrudePath: curve });
}
