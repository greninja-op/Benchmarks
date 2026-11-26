import * as THREE from 'three'
import { useMemo } from 'react'
import { HeadbandArc, loftSuperellipse, cushionRing, superellipsePoints, SpanCurve } from '../util.js'

/* ------------------------------------------------------------------ */
/*  AirPods Max — full parametric assembly (units: cm).                */
/*  Local cup frame: +Z = outward (to shell dome), -Z = ear side.      */
/* ------------------------------------------------------------------ */

export const DIM = {
  band: { cx: 0, cy: -0.7, rx: 5.3, ry: 8.9, a0: -0.98, a1: 0.98 },
  cupX: 4.85, hingeY: 1.02, hingeZ: 0.35,
  cupCenterY: -2.55, cupCenterZ: -0.55,
  rollRest: 0.22, yawRest: 0.55,
}

/* Radially-offset elliptical arc (canopy sits inside the strap). */
class OffsetArc extends THREE.Curve {
  constructor(base, offset) {
    super()
    this.base = base
    this.off = offset
  }
  getPoint(t, target = new THREE.Vector3()) {
    this.base.getPoint(t, target)
    const cx = this.base.cx, cy = this.base.cy
    const nx = target.x - cx, ny = target.y - cy
    const len = Math.max(1e-5, Math.hypot(nx, ny))
    target.x -= (nx / len) * this.off
    target.y -= (ny / len) * this.off
    return target
  }
}

/** Loft a rounded cross-section along a 3D curve (like TubeGeometry, custom section). */
function loftAlongCurve(curve, { steps = 96, w = 0.5, h = 0.5, n = 2.6, capStart = true, capEnd = true, radialSegments = 20 }) {
  const frames = curve.computeFrenetFrames(steps, false)
  const verts = [], uvs = [], idx = []
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps)
    pts.push(p)
  }
  for (let i = 0; i <= steps; i++) {
    const N = frames.normals[i], B = frames.binormals[i]
    const p = pts[i]
    for (let j = 0; j < radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2
      const c = Math.cos(v), s = Math.sin(v)
      const f = 1 / Math.pow(
        Math.pow(Math.abs(c), n) + Math.pow(Math.abs(s), n), 1 / n)
      const x = p.x + N.x * h * c * f + B.x * w * s * f
      const y = p.y + N.y * h * c * f + B.y * w * s * f
      const z = p.z + N.z * h * c * f + B.z * w * s * f
      verts.push(x, y, z)
      uvs.push(i / steps, j / radialSegments)
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const i0 = i * radialSegments + j
      const i1 = i * radialSegments + ((j + 1) % radialSegments)
      const j0 = (i + 1) * radialSegments + j
      const j1 = (i + 1) * radialSegments + ((j + 1) % radialSegments)
      idx.push(i0, j0, i1, i1, j0, j1)
    }
  }
  const cap = (i, flip) => {
    const c = verts.length / 3
    const base = i * radialSegments
    verts.push(pts[i].x, pts[i].y, pts[i].z)
    uvs.push(i, 0.5)
    for (let j = 0; j < radialSegments; j++) {
      const a0 = base + j, a1 = base + ((j + 1) % radialSegments)
      flip ? idx.push(c, a1, a0) : idx.push(c, a0, a1)
    }
  }
  if (capStart) cap(0, true)
  if (capEnd) cap(steps, false)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** Superellipse disc (polar UV so textures stay readable); face: +1 / -1 */
function discSquircle({ a, b, n = 2.6, rings = 7, segs = 64, dish = 0.1, face = 1 }) {
  const verts = [], uvs = [], idx = []
  for (let k = 0; k <= rings; k++) {
    const s = k / rings
    const ease = Math.pow(s, 1 / 1.4)
    const pull = 1 - Math.pow(1 - s, 0.35) * 0.06
    const pr = superellipsePoints(a * s, b * s, n, segs)
    for (let i = 0; i < segs; i++) {
      verts.push(pr[i].x, pr[i].y, dish * (1 - ease * ease) * pull)
      uvs.push(i / segs, s)
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < segs; i++) {
      const i0 = k * segs + i
      const i1 = k * segs + ((i + 1) % segs)
      const j0 = (k + 1) * segs + i
      const j1 = (k + 1) * segs + ((i + 1) % segs)
      idx.push(i0, j0, i1, i1, j0, j1) // canonical: faces +Z
    }
  }
  if (face < 0) {
    // mirror: z -> -z, winding reversed, u mirrored (keeps letter upright)
    for (let v = 2; v < verts.length; v += 3) verts[v] = -verts[v]
    for (let v = 0; v < uvs.length; v += 2) uvs[v] = 1 - uvs[v]
    for (let t = 0; t < idx.length; t += 3) {
      const tmp = idx[t + 1]
      idx[t + 1] = idx[t + 2]
      idx[t + 2] = tmp
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/* --------------------------- shell profile -------------------------- */
function shellProfile(t) {
  const z = -1.6 + 3.2 * t
  let s = 1
  if (t < 0.5) s *= 1 - 0.07 * Math.pow((0.5 - t) / 0.5, 1.5)
  else s *= 1 - 0.24 * Math.pow((t - 0.5) / 0.5, 2.2)
  const edge = Math.min(t, 1 - t)
  const nn = 2.5 + 2.4 * Math.pow(Math.max(0, 1 - edge / 0.1), 3)
  return { z, s, n: nn }
}

/* ============================ components ============================ */

function Headband({ M }) {
  const geo = useMemo(() => {
    const arc = new HeadbandArc(DIM.band.cx, DIM.band.cy, DIM.band.rx, DIM.band.ry, DIM.band.a0, DIM.band.a1)
    return loftAlongCurve(arc, { steps: 90, w: 0.42, h: 1.12, n: 2.8 })
  }, [])
  const canopyGeo = useMemo(() => {
    const arc = new HeadbandArc(DIM.band.cx, DIM.band.cy, DIM.band.rx, DIM.band.ry, DIM.band.a0, DIM.band.a1)
    const inner = new OffsetArc(arc, 0.82)
    // restrict canopy to mid span
    const sub = new SpanCurve(inner, 0.06, 0.94)
    return loftAlongCurve(sub, { steps: 64, w: 1.06, h: 0.15, n: 2.4 })
  }, [])
  const sleeveGeoL = useMemo(() => {
    const arc = new HeadbandArc(DIM.band.cx, DIM.band.cy, DIM.band.rx, DIM.band.ry, DIM.band.a0, DIM.band.a0 + 0.34)
    return loftAlongCurve(arc, { steps: 10, w: 0.5, h: 1.3, n: 2.8 })
  }, [])
  const sleeveGeoR = useMemo(() => {
    const arc = new HeadbandArc(DIM.band.cx, DIM.band.cy, DIM.band.rx, DIM.band.ry, DIM.band.a1 - 0.34, DIM.band.a1)
    return loftAlongCurve(arc, { steps: 10, w: 0.5, h: 1.3, n: 2.8 })
  }, [])
  return (
    <group>
      <mesh geometry={geo} material={M.soft} castShadow />
      <mesh geometry={canopyGeo} material={M.canopy} />
      <mesh geometry={sleeveGeoL} material={M.soft} />
      <mesh geometry={sleeveGeoR} material={M.soft} />
    </group>
  )
}

function Arm({ side = 1, M }) {
  // side: 1 = right (+X), -1 = left
  const { cylGeo, capGeo, ringGeo } = useMemo(() => {
    const a = new THREE.Vector3(side * 4.46, 4.05, 0)
    const b = new THREE.Vector3(side * 4.85, DIM.hingeY, DIM.hingeZ)
    const dir = b.clone().sub(a)
    const len = dir.length()
    const cyl = new THREE.CylinderGeometry(0.34, 0.34, len, 24, 1)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    cyl.applyQuaternion(q)
    cyl.translate(mid.x, mid.y, mid.z)
    const ring = new THREE.TorusGeometry(0.42, 0.09, 12, 32)
    ring.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize()))
    ring.translate(a.x, a.y, a.z)
    return { cylGeo: cyl, capGeo: null, ringGeo: ring }
  }, [side])
  return (
    <group>
      <mesh geometry={cylGeo} material={M.chrome} />
      <mesh geometry={ringGeo} material={M.chrome} />
      {/* hinge boss at the cup end */}
      <mesh position={[side * DIM.cupX, DIM.hingeY, DIM.hingeZ]} rotation={[Math.PI / 2, 0, 0]} material={M.chrome}>
        <cylinderGeometry args={[0.46, 0.46, 1.15, 28]} />
      </mesh>
    </group>
  )
}

function Driver({ M, R, withAnchor = false }) {
  const cone = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      // diaphragm: cone from center to surround edge
      const r = 0.12 + t * 1.5
      const y = Math.pow(t, 1.6) * 0.34 - 0.05
      pts.push(new THREE.Vector2(r, y))
    }
    const geo = new THREE.LatheGeometry(pts, 48)
    geo.rotateX(-Math.PI / 2) // mouth toward -Z (ear side)
    return geo
  }, [])
  return (
    <group position={[0.25, -0.3, -0.5]}>
      {/* magnet ring assembly */}
      <mesh material={M.magRing}>
        <torusGeometry args={[1.02, 0.17, 14, 44]} />
      </mesh>
      <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]} material={M.magRing}>
        <cylinderGeometry args={[0.62, 0.62, 0.5, 32]} />
      </mesh>
      {/* diaphragm */}
      <mesh geometry={cone} material={M.driverCone} />
      <mesh position={[0, 0, 0.62]} rotation={[Math.PI / 2, 0, 0]} material={M.dark}>
        <cylinderGeometry args={[1.32, 1.32, 0.3, 40]} />
      </mesh>
      {withAnchor && (
        <object3D ref={(o) => { if (o) R.anchors.get('driver').current = o }} />
      )}
    </group>
  )
}

function LeftInternals({ M, R }) {
  const chassis = useMemo(() => discSquircle({ a: 2.5, b: 3.1, n: 2.6, dish: 0.02, rings: 5, segs: 48 }), [])
  const flex = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.5, -1.6, 0.55),
      new THREE.Vector3(-1.3, -0.6, 0.75),
      new THREE.Vector3(-0.9, 0.7, 0.85),
      new THREE.Vector3(0.4, 1.5, 0.5),
    ])
    return new THREE.TubeGeometry(curve, 24, 0.09, 8)
  }, [])
  return (
    <group>
      {/* internal structural frame */}
      <group ref={(g) => { if (g) R.parts.chassis = g }} position={[0, 0, 0.45]}>
        <mesh geometry={chassis} material={M.dark} rotation={[0, 0, Math.PI]} />
        {[[-1.7, -2.15], [1.7, -2.15], [-1.7, 2.15], [1.7, 2.15]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.1]} material={M.screw}>
            <cylinderGeometry args={[0.09, 0.09, 0.16, 12]} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>
        ))}
      </group>
      {/* H1 board + sensors */}
      <group ref={(g) => { if (g) R.parts.board = g }} position={[0.55, 0.05, 0.2]} rotation={[0, Math.PI / 2, 0.06]}>
        <mesh material={M.dark}>
          <boxGeometry args={[2.5, 0.1, 1.9]} />
        </mesh>
        <mesh position={[0.35, 0.12, 0.2]} material={M.chip}>
          <boxGeometry args={[1.0, 0.14, 0.9]} />
        </mesh>
        <mesh position={[-0.65, 0.11, 0.15]} material={M.chip}>
          <boxGeometry args={[0.55, 0.12, 0.7]} />
        </mesh>
        <mesh position={[0.1, 0.11, -0.55]} material={M.chip}>
          <boxGeometry args={[0.7, 0.12, 0.5]} />
        </mesh>
        <mesh geometry={flex} material={M.flex} position={[0, 0, 0]} />
        <object3D ref={(o) => { if (o) R.anchors.get('chip').current = o }} position={[0, 0.2, 0]} />
      </group>
      <group ref={(g) => { if (g) R.parts.driver = g }}>
        <Driver M={M} R={R} withAnchor />
      </group>
    </group>
  )
}

/** Digital crown — knurled, individually ridged, rotates on its axle. */
function Crown({ M, R }) {
  const ridges = useMemo(() => Array.from({ length: 42 }, (_, i) => (i / 42) * Math.PI * 2), [])
  return (
    <group position={[0, 3.28, 0.34]} rotation={[0, 0, 0.42]}>
      <group rotation={[0.18, 0, 0]}>
        <group ref={(g) => { if (g) R.crown = g }}>
          {/* axle base */}
          <mesh material={M.crown}>
            <cylinderGeometry args={[0.56, 0.6, 0.34, 32]} />
          </mesh>
          {/* knurled ridges */}
          {ridges.map((a, i) => (
            <mesh key={i} position={[Math.sin(a) * 0.6, -0.02, Math.cos(a) * 0.6]} rotation={[0, a, 0]} material={M.crown}>
              <boxGeometry args={[0.075, 0.38, 0.115]} />
            </mesh>
          ))}
          {/* domed cap */}
          <mesh position={[0, 0.16, 0]} material={M.crown} scale={[1, 0.55, 1]}>
            <sphereGeometry args={[0.585, 32, 20]} />
          </mesh>
        </group>
        <object3D ref={(o) => { if (o) R.anchors.get('crown').current = o }} position={[0, 0.5, 0]} />
      </group>
    </group>
  )
}

function NoiseButton({ M, R }) {
  return (
    <group position={[0, 3.22, -0.42]} rotation={[0, 0, 0.42]} scale={[1, 1, 1]}>
      <group rotation={[0.16, 0, 0]}>
        <mesh ref={(m) => { if (m) R.button = m }} material={M.crown} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.62, 0.62]}>
          <capsuleGeometry args={[0.27, 0.42, 8, 20]} />
        </mesh>
        <mesh material={M.dark} rotation={[0, Math.PI / 2, 0]} position={[0, -0.02, 0]} scale={[1, 1, 0.62]}>
          <torusGeometry args={[0.3, 0.05, 10, 36]} />
        </mesh>
        <object3D ref={(o) => { if (o) R.anchors.get('button').current = o }} position={[0.55, 0.28, 0]} />
      </group>
    </group>
  )
}

/** One ear cup assembly (side: 1 right, -1 left). */
function Cup({ side, M, R, exploded = false }) {
  const shell = useMemo(() => loftSuperellipse({ a: 3.02, b: 3.62, n: 2.55, levels: 42, segs: 72, profile: shellProfile }), [])
  const baffle = useMemo(() => discSquircle({ a: 2.62, b: 3.22, n: 2.6, dish: -0.16, face: -1, segs: 56 }), [])
  const cushion = useMemo(() => cushionRing({
    outerA: 2.95, outerB: 3.55, innerA: 1.98, innerB: 2.56,
    thickness: 1.7, zCenter: 0, sections: 84, sectionPts: 20,
  }), [])
  const meshDisc = useMemo(() => discSquircle({ a: 2.55, b: 3.15, n: 2.6, dish: -0.12, face: -1, segs: 56 }), [])

  const mirror = side === 1 ? 1 : -1
  return (
    <group ref={(g) => { if (!g) return; if (side === 1) R.pivotR = g; else R.pivotL = g }}
      position={[side * DIM.cupX, DIM.hingeY, DIM.hingeZ]}>
      <group position={[0, -3.57, -0.9]}>
        <group ref={(g) => { if (!g) return; if (side === 1) R.bodyR = g; else R.bodyL = g }}>
          {/* aluminum shell */}
          <mesh ref={(m) => { if (m && side === -1) R.parts.shell = m }} geometry={shell} material={M.aluCup} castShadow>
            {side === -1 && (
              <object3D ref={(o) => { if (o) R.anchors.get('shell').current = o }} />
            )}
          </mesh>
          {/* speaker baffle (visible when the cushion detaches) */}
          <group ref={(g) => { if (g) R.parts.baffle = g }} position={[0, 0, -1.52]}>
            <mesh geometry={baffle} material={M.baffle} />
            {/* magnetic connector pins */}
            {[-1.6, 0, 1.6].map((y, i) => (
              <mesh key={i} position={[mirror * 1.6, y, -0.14]} material={M.magRing}>
                <cylinderGeometry args={[0.055, 0.055, 0.18, 10]} rotation={[Math.PI / 2, 0, 0]} />
              </mesh>
            ))}
          </group>
          {/* internals only on the left (exploded) cup */}
          {side === -1 && <LeftInternals M={M} R={R} />}
          {/* cushion + inner acoustic mesh */}
          <group ref={(g) => { if (!g) return; if (side === 1) R.cushionR = g; else R.cushionL = g }} position={[0, 0, -2.25]}>
            <mesh geometry={cushion} material={M.cushion} castShadow />
            <mesh geometry={meshDisc} material={side === 1 ? M.cushionMeshR : M.cushionMeshL} position={[0, 0, -0.45]} />
            <object3D ref={(o) => { if (o) R.anchors.get(side === 1 ? 'cushionR' : 'cushionL').current = o }} position={[0, 0, -0.5]} />
          </group>
        </group>
        {/* controls live on the OUTER faces: crown on right, NC button on left */}
        {side === 1 && <Crown M={M} R={R} />}
        {side === -1 && <NoiseButton M={M} R={R} />}
        {/* microphone slits */}
        <group>
          <mesh position={[-1.5 * mirror, -3.28, 0.9]} rotation={[0.35, 0, 0.5]} material={M.dark}>
            <boxGeometry args={[0.36, 0.07, 0.05]} />
          </mesh>
          <mesh position={[-1.62 * mirror, -3.5, 0.72]} rotation={[0.35, 0, 0.5]} material={M.dark}>
            <boxGeometry args={[0.3, 0.06, 0.05]} />
          </mesh>
          {/* bottom vent slot */}
          <mesh position={[-0.2 * mirror, -3.68, 0.5]} rotation={[0.9, 0, 0]} material={M.dark}>
            <boxGeometry args={[0.5, 0.06, 0.05]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export default function AirpodsMax({ M, R }) {
  const group = useMemo(() => new THREE.Group(), [])
  return (
    <group ref={(g) => { if (g) R.model = g }} name="airpods-max">
      <Headband M={M} />
      <Arm side={1} M={M} />
      <Arm side={-1} M={M} />
      <Cup side={1} M={M} R={R} />
      <Cup side={-1} M={M} R={R} exploded />
    </group>
  )
}
