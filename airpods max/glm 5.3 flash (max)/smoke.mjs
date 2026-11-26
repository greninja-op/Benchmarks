import * as THREE from 'three'
import { loftSuperellipse, cushionRing, squirclePlate, superellipsePoints, HeadbandArc, SpanCurve } from './src/util.js'
import { evalChoreo, resolveCamera, STAGES } from './src/choreo.js'
import { track, APP, COLORWAYS } from './src/store.js'

function checkGeo(name, geo) {
  geo.computeVertexNormals()
  const bb = geo.boundingBox ?? geo.computeBoundingBox()
  const pos = geo.attributes.position
  let nan = 0
  for (let i = 0; i < pos.array.length; i++) if (Number.isNaN(pos.array[i])) nan++
  const d = geo.boundingBox.getSize(new THREE.Vector3())
  const ok = nan === 0 && d.x > 0.01 && d.y > 0.01 && d.z > 0.01 && Math.abs(d.x) !== Infinity
  console.log(`${ok ? 'OK ' : 'BAD'} ${name}: ${pos.count} verts, size ${d.x.toFixed(2)}×${d.y.toFixed(2)}×${d.z.toFixed(2)}, NaN=${nan}`)
  if (!ok) process.exitCode = 1
}

// shell profile replicated from AirpodsMax.jsx (same math)
function shellProfile(t) {
  const z = -1.6 + 3.2 * t
  let s = 1
  if (t < 0.5) s *= 1 - 0.07 * Math.pow((0.5 - t) / 0.5, 1.5)
  else s *= 1 - 0.24 * Math.pow((t - 0.5) / 0.5, 2.2)
  const edge = Math.min(t, 1 - t)
  const nn = 2.5 + 2.4 * Math.pow(Math.max(0, 1 - edge / 0.1), 3)
  return { z, s, n: nn }
}
function discFace(face) {
  return (a, b) => {
    const rings = 7, segs = 48, n = 2.6, dish = -0.16
    const verts = [], idx = []
    for (let k = 0; k <= rings; k++) {
      const s = k / rings, ease = Math.pow(s, 1 / 1.4), pull = 1 - Math.pow(1 - s, 0.35) * 0.06
      const pr = superellipsePoints(a * s, b * s, n, segs)
      for (let i = 0; i < segs; i++) verts.push(pr[i].x, pr[i].y, face * dish * (1 - ease * ease) * pull)
    }
    for (let k = 0; k < rings; k++) for (let i = 0; i < segs; i++) {
      const i0 = k * segs + i, i1 = k * segs + ((i + 1) % segs), j0 = (k + 1) * segs + i, j1 = (k + 1) * segs + ((i + 1) % segs)
      const rev = face < 0
      rev ? idx.push(i0, i1, j0, j1, i1, j1) : idx.push(i0, j0, i1, i1, j0, j1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(idx)
    return geo
  }
}

checkGeo('cup shell', loftSuperellipse({ a: 3.02, b: 3.62, n: 2.55, levels: 42, segs: 72, profile: shellProfile }))
checkGeo('cushion ring', cushionRing({ outerA: 2.95, outerB: 3.55, innerA: 1.98, innerB: 2.56, thickness: 1.7, zCenter: 0 }))
checkGeo('mesh disc +Z', discFace(1)(2.55, 3.15))
checkGeo('mesh disc -Z', discFace(-1)(2.55, 3.15))
checkGeo('baffle plate', squirclePlate({ a: 2.62, b: 3.22, thickness: 0.2, dish: 0.14 }))

// headband curve + a mini loft
const arc = new HeadbandArc(0, -0.7, 5.3, 8.9, -0.98, 0.98)
const sub = new SpanCurve(arc, 0.06, 0.94)
const frames = arc.computeFrenetFrames(90, false)
console.log('frames normals finite:', frames.normals.every(n => !n.toArray().some(Number.isNaN)))
const p0 = sub.getPoint(0), p1 = sub.getPoint(0.5), p2 = sub.getPoint(1)
console.log('canopy span:', p0.toArray().map(v => v.toFixed(2)).join(','), p1.toArray().map(v => v.toFixed(2)).join(','), p2.toArray().map(v => v.toFixed(2)).join(','))

// choreography: sweep all p, assert finite camera + scalar values
APP.choreo = null
const anchors = new Map(); for (const n of ['crown','button','driver','chip','shell','cushionL','cushionR','case']) anchors.set(n, new THREE.Vector3(2, 1, 3))
const out = { fov: 30 }; const P = new THREE.Vector3(); const T = new THREE.Vector3()
let bad = 0
for (let i = 0; i <= 1000; i++) {
  const p = i / 1000
  const c = evalChoreo(p)
  for (const k of ['yaw','fold','detachL','detachR','explode','caseRise','nest','flap','mx','crownSpin','swatchVis','leaderCrown','leaderButton','leaderExplode']) {
    if (!Number.isFinite(c[k])) { console.log('NaN choreo', p, k); bad++ }
  }
  resolveCamera(p, new THREE.Vector3(0,0,0), anchors, P, T, out)
  for (const v of [P.x, P.y, P.z, T.x, T.y, T.z, out.fov]) if (!Number.isFinite(v)) { console.log('NaN cam', p); bad++ }
}
console.log(`choreo sweep: ${bad === 0 ? 'all finite (1001 samples)' : bad + ' bad samples'}`)

// detach amplitude sanity
const dt = (t) => evalChoreo(t).detachL
console.log(`detach: p0.595=${dt(0.595).toFixed(3)} p0.65=${dt(0.65).toFixed(3)} p0.712=${dt(0.712).toFixed(3)} p0.72=${dt(0.72).toFixed(3)}`)
console.log('flap: open', evalChoreo(0.93).flap.toFixed(2), 'snap', evalChoreo(0.982).flap.toFixed(2), 'closed', evalChoreo(0.995).flap.toFixed(2))
console.log('finale yaw deg:', (evalChoreo(1).yaw * 180 / Math.PI).toFixed(2))
console.log('colorways:', COLORWAYS.map(c => c.name).join(', '))
