import * as THREE from 'three'
import { useMemo } from 'react'
import { loftSuperellipse, superellipsePoints } from '../util.js'

/* ------------------------------------------------------------------ */
/*  Smart Case — two contoured soft-touch lobes + articulated          */
/*  magnetic flap + microfiber trim piping.                            */
/* ------------------------------------------------------------------ */

const pebble = (depth) => (t) => {
  const z = (t - 0.5) * depth
  const s = 1 - 0.36 * Math.pow(Math.abs(2 * t - 1), 1.9)
  const edge = Math.min(t, 1 - t)
  const n = 2.5 + 2.0 * Math.pow(Math.max(0, 1 - edge / 0.14), 3)
  return { z, s, n }
}

export default function SmartCase({ M, R }) {
  const lobe = useMemo(() => loftSuperellipse({
    a: 4.55, b: 4.32, n: 2.5, levels: 34, segs: 64, profile: pebble(3.5),
  }), [])

  const flap = useMemo(() => loftSuperellipse({
    a: 4.42, b: 2.5, n: 2.7, levels: 26, segs: 56, profile: pebble(0.52),
  }), [])

  const trim = useMemo(() => {
    // piping along the lower outline of the case front
    const pts = superellipsePoints(9.35, 4.75, 2.5, 64)
      .filter((p) => p.y < -1.4)
      .map((p) => new THREE.Vector3(p.x, p.y + 0.1, 1.72))
    pts.sort((p, q) => p.x - q.x)
    const curve = new THREE.CatmullRomCurve3(pts)
    return new THREE.TubeGeometry(curve, 40, 0.1, 10)
  }, [])

  return (
    <group ref={(g) => { if (g) R.case = g }} name="smart-case">
      <group ref={(g) => { if (g) (R.caseBodyGroup = g) }}>
        {/* two contoured lobes */}
        <mesh geometry={lobe} material={M.caseBody} position={[-4.62, 0, 0]} castShadow />
        <mesh geometry={lobe} material={M.caseBody} position={[4.62, 0, 0]} castShadow />
        {/* center seam shadow */}
        <mesh position={[0, -0.35, 0]} material={M.dark}>
          <boxGeometry args={[0.3, 12.2, 2.6]} />
        </mesh>
        {/* microfiber trim piping */}
        <mesh geometry={trim} material={M.caseTrim} />
        <object3D ref={(o) => { if (o) R.anchors.get('case').current = o }} position={[0, -1, 2.4]} />
      </group>

      {/* articulated magnetic flap — hinged at the top, front face +Z */}
      <group ref={(g) => { if (g) R.flap = g }} position={[0, 4.68, 1.62]}>
        <mesh geometry={flap} material={M.caseBody} position={[0, -2.42, 0.12]} castShadow />
        <mesh material={M.caseTrim} position={[0, -4.72, 0.3]}>
          <boxGeometry args={[8.35, 0.14, 0.65]} />
        </mesh>
      </group>
    </group>
  )
}
