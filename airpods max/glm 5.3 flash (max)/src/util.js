import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/*  Geometry helpers — superellipse ("squircle") lofting used for      */
/*  every rounded volume of the AirPods Max.                           */
/* ------------------------------------------------------------------ */

/** Sample points of a superellipse |x/a|^n + |y/b|^n = 1 (unclosed ring). */
export function superellipsePoints(a, b, n = 2.5, segs = 64) {
  const pts = []
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2
    const c = Math.cos(t), s = Math.sin(t)
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)
    pts.push(new THREE.Vector2(x, y))
  }
  return pts
}

/**
 * Loft a superellipse footprint along Z.
 * profile(t in 0..1) -> { z, s, n? } ; s radial scale, z absolute height.
 * Returns indexed BufferGeometry with smooth normals + ring UVs.
 */
export function loftSuperellipse({ a, b, n = 2.5, levels = 48, segs = 72, profile, capStart = true, capEnd = true }) {
  const verts = [], uvs = [], idx = []

  for (let li = 0; li <= levels; li++) {
    const t = li / levels
    const pr = profile(t)
    const ring = superellipsePoints(a * pr.s, b * pr.s, pr.n ?? n, segs)
    for (let i = 0; i < segs; i++) {
      verts.push(ring[i].x, ring[i].y, pr.z)
      uvs.push(i / segs, t)
    }
  }

  for (let li = 0; li < levels; li++) {
    for (let i = 0; i < segs; i++) {
      const i0 = li * segs + i
      const i1 = li * segs + ((i + 1) % segs)
      const j0 = (li + 1) * segs + i
      const j1 = (li + 1) * segs + ((i + 1) % segs)
      idx.push(i0, j0, i1, i1, j0, j1)
    }
  }

  const cap = (li, flip) => {
    const c = verts.length / 3
    const base = li * segs
    const z = li === 0 ? profile(0).z : profile(1).z
    verts.push(0, 0, z)
    uvs.push(0.5, li === 0 ? 0 : 1)
    for (let i = 0; i < segs; i++) {
      const a0 = base + i, a1 = base + ((i + 1) % segs)
      flip ? idx.push(c, a1, a0) : idx.push(c, a0, a1)
    }
  }
  if (capStart) cap(0, true)
  if (capEnd) cap(levels, false)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/**
 * Ear cushion: closed torus between outer & inner superellipse footprints,
 * with a rounded cross-section (soft, inflated look). zCenter = mid-plane.
 */
export function cushionRing({ outerA, outerB, innerA, innerB, sections = 96, sectionPts = 22, thickness = 1.7, zCenter = 0, sectionN = 2.7 }) {
  const verts = [], uvs = [], idx = []
  const outer = superellipsePoints(outerA, outerB, 2.5, sections)
  const inner = superellipsePoints(innerA, innerB, 2.5, sections)

  for (let i = 0; i < sections; i++) {
    const o = outer[i], k = inner[i]
    const dx = o.x - k.x, dy = o.y - k.y
    const len = Math.max(1e-4, Math.hypot(dx, dy))
    const ex = dx / len, ey = dy / len          // outward along footprint normal
    const cx = (o.x + k.x) / 2, cy = (o.y + k.y) / 2
    const w = len / 2 + 0.16                    // slight inflation past footprints
    const h = thickness / 2
    for (let j = 0; j < sectionPts; j++) {
      const v = (j / sectionPts) * Math.PI * 2
      const cv = Math.cos(v), sv = Math.sin(v)
      const f = 1 / Math.pow(
        Math.pow(Math.abs(cv), sectionN) + Math.pow(Math.abs(sv), sectionN), 1 / sectionN)
      verts.push(cx + ex * w * cv * f, cy + ey * w * cv * f, zCenter + h * sv * f)
      uvs.push(i / sections, j / sectionPts)
    }
  }
  for (let i = 0; i < sections; i++) {
    for (let j = 0; j < sectionPts; j++) {
      const i0 = i * sectionPts + j
      const i1 = ((i + 1) % sections) * sectionPts + j
      const j0 = i * sectionPts + ((j + 1) % sectionPts)
      const j1 = ((i + 1) % sections) * sectionPts + ((j + 1) % sectionPts)
      idx.push(i0, i1, j0, j1, i1, j1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/**
 * Rounded squircle plate with slight dish toward +Z on the "front" cap.
 * thickness runs -thk/2 .. +thk/2, front face bulged by `dish`.
 */
export function squirclePlate({ a, b, n = 2.7, thickness = 0.18, dish = 0.14, segs = 64, levels = 8 }) {
  const verts = [], uvs = [], idx = []
  for (let li = 0; li <= levels; li++) {
    const t = li / levels
    const edge = Math.sin(THREE.MathUtils.clamp((t - 0.14) / 0.72, 0, 1) * Math.PI)
    const s = 1 - (1 - edge) * 0.26
    const z = (t - 0.5) * thickness
    const pr = superellipsePoints(a * s, b * s, n, segs)
    for (let i = 0; i < segs; i++) {
      verts.push(pr[i].x, pr[i].y, z)
      uvs.push(i / segs, t)
    }
  }
  for (let li = 0; li < levels; li++) {
    for (let i = 0; i < segs; i++) {
      const i0 = li * segs + i
      const i1 = li * segs + ((i + 1) % segs)
      const j0 = (li + 1) * segs + i
      const j1 = (li + 1) * segs + ((i + 1) % segs)
      idx.push(i0, j0, i1, i1, j0, j1)
    }
  }
  const cap = (li, flip) => {
    const c = verts.length / 3
    const base = li * segs
    verts.push(0, 0, li === 0 ? -thickness / 2 : thickness / 2 + dish)
    uvs.push(0.5, li)
    for (let i = 0; i < segs; i++) {
      const a0 = base + i, a1 = base + ((i + 1) % segs)
      flip ? idx.push(c, a1, a0) : idx.push(c, a0, a1)
    }
  }
  cap(0, true)
  cap(levels, false)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** Elliptical headband spine in the XY plane. a0/a1 are radians around top. */
export class HeadbandArc extends THREE.Curve {
  constructor(cx = 0, cy = -0.8, rx = 5.35, ry = 9.7, a0 = -1.02, a1 = 1.02) {
    super()
    this.cx = cx; this.cy = cy; this.rx = rx; this.ry = ry; this.a0 = a0; this.a1 = a1
  }
  getPoint(t, target = new THREE.Vector3()) {
    const th = this.a0 + (this.a1 - this.a0) * t
    return target.set(
      this.cx + Math.sin(th) * this.rx,
      this.cy + Math.cos(th) * this.ry,
      0
    )
  }
}

/** Sub-span of a wrapped curve: returns base.getPoint(lerp(t0,t1)). */
export class SpanCurve extends THREE.Curve {
  constructor(base, t0 = 0, t1 = 1) {
    super()
    this.base = base; this.t0 = t0; this.t1 = t1
  }
  getPoint(t, target = new THREE.Vector3()) {
    return this.base.getPoint(this.t0 + (this.t1 - this.t0) * t, target)
  }
}
