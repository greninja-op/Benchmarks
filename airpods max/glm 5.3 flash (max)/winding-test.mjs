import * as THREE from 'three'
import { loftSuperellipse, superellipsePoints } from './src/util.js'

function shellProfile(t) {
  const z = -1.6 + 3.2 * t
  let s = 1
  if (t < 0.5) s *= 1 - 0.07 * Math.pow((0.5 - t) / 0.5, 1.5)
  else s *= 1 - 0.24 * Math.pow((t - 0.5) / 0.5, 2.2)
  const edge = Math.min(t, 1 - t)
  const nn = 2.5 + 2.4 * Math.pow(Math.max(0, 1 - edge / 0.1), 3)
  return { z, s, n: nn }
}

const shell = loftSuperellipse({ a: 3.02, b: 3.62, n: 2.55, levels: 42, segs: 72, profile: shellProfile })

// disc copy from AirpodsMax.jsx
function discSquircle({ a, b, n = 2.6, rings = 7, segs = 64, dish = 0.1, face = 1 }) {
  const verts = [], uvs = [], idx = []
  for (let k = 0; k <= rings; k++) {
    const s = k / rings
    const ease = Math.pow(s, 1 / 1.4)
    const pull = 1 - Math.pow(1 - s, 0.35) * 0.06
    const pr = superellipsePoints(a * s, b * s, n, segs)
    for (let i = 0; i < segs; i++) {
      const u = face > 0 ? i / segs : 1 - i / segs
      verts.push(pr[i].x, pr[i].y, face * dish * (1 - ease * ease) * pull)
      uvs.push(u, s)
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < segs; i++) {
      const i0 = k * segs + i
      const i1 = k * segs + ((i + 1) % segs)
      const j0 = (k + 1) * segs + i
      const j1 = (k + 1) * segs + ((i + 1) % segs)
      const rev = face < 0
      rev ? idx.push(i0, i1, j0, j1, i1, j1) : idx.push(i0, j0, i1, i1, j0, j1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

function probe(geo, origin, dir, name) {
  const rc = new THREE.Raycaster()
  rc.set(new THREE.Vector3(...origin), new THREE.Vector3(...dir).normalize())
  const hits = rc.intersectObject(new THREE.Mesh(geo), false)
  console.log(`${name}: ray from ${origin} dir ${dir} -> ${hits.length} hit(s)` + (hits.length ? ` first at z=${hits[0].point.z.toFixed(2)} face.n=${hits[0].face.normal.toArray().map(v=>v.toFixed(2))}` : ''))
}

// shell: ray from front (-Z side) and from back (+Z side)
probe(shell, [0, 0, -10], [0, 0, 1], 'shell front cap')
probe(shell, [0, 0, 10], [0, 0, -1], 'shell back cap')
probe(shell, [-10, 0, 0], [1, 0, 0], 'shell side -X')
probe(shell, [10, 0, 0], [-1, 0, 0], 'shell side +X')

const discNeg = discSquircle({ a: 2.55, b: 3.15, dish: -0.12, face: -1 })
const discPos = discSquircle({ a: 2.55, b: 3.15, dish: 0.12, face: 1 })
probe(discNeg, [0, 0, -10], [0, 0, 1], 'disc face=-1 seen from -Z')
probe(discPos, [0, 0, 10], [0, 0, -1], 'disc face=+1 seen from +Z')

// normals sanity: average normal near front cap ring
const nrm = shell.attributes.normal
let sum = 0
for (let i = 0; i < 72; i++) sum += nrm.getZ(i)
console.log('shell front-ring avg normal z:', (sum / 72).toFixed(3))
