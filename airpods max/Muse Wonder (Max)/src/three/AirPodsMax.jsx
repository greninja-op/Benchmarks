import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  COLORWAYS, scrollState, anchorObjects, clamp01, smooth, lerp,
} from '../lib/shared'
import {
  knitTextures, canopyTextures, grainTexture, innerMeshTexture,
  baffleTexture, caseTextures, driverTexture,
} from '../lib/textures'

// ── camera / pose keyframes: [scroll, camPos, target, rotY, rotX, modelY] ──
const KEYS = [
  [0.00, [0, 0.15, 6.0], [0, 0.00, 0], -0.55, 0.06, -0.42],
  [0.12, [0, 0.15, 5.4], [0, -0.05, 0], -0.20, 0.03, -0.18],
  [0.19, [0.3, 0.20, 4.7], [0, -0.05, 0], 0.55, 0.02, -0.10],
  [0.26, [0.4, 0.25, 4.4], [0, -0.05, 0], 0.85, 0.05, -0.05],
  [0.35, [1.55, 0.75, 2.0], [1.02, 0.02, 0.22], 0.72, 0.08, -0.05],
  [0.44, [1.50, 0.70, 2.05], [1.00, 0.00, 0.20], 0.55, 0.05, -0.02],
  [0.51, [0.15, 1.45, 2.55], [0, 0.82, 0], 0.18, -0.18, -0.10],
  [0.58, [0, 0.45, 3.6], [0, -0.05, 0], -0.35, 0.02, 0],
  [0.65, [0, 0.05, 4.35], [0, -0.30, 0], 0.48, 0.03, 0],
  [0.72, [0, 0.05, 4.6], [0, -0.20, 0], 0.30, 0.02, 0],
  [0.80, [0, 0.15, 4.9], [0, -0.10, 0], 0.38, 0.04, 0],
  [0.88, [0, 0.10, 5.2], [0, -0.15, 0], 0.10, 0.02, 0],
  [0.94, [0, -0.05, 6.8], [0, -1.10, 0], 0.0, 0.0, 0.15],
  [1.00, [0, -0.02, 7.4], [0, -1.30, 0], 0.0, 0.0, 0.15],
]
export const camState = { pos: new THREE.Vector3(0, 0.25, 5.5), tgt: new THREE.Vector3(), rotY: 0 }

function sampleKeys(p) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1]
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (p >= KEYS[i][0] && p <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break }
  }
  const span = Math.max(1e-5, b[0] - a[0])
  let t = clamp01((p - a[0]) / span)
  t = t * t * (3 - 2 * t)
  return {
    cam: [lerp(a[1][0], b[1][0], t), lerp(a[1][1], b[1][1], t), lerp(a[1][2], b[1][2], t)],
    tgt: [lerp(a[2][0], b[2][0], t), lerp(a[2][1], b[2][1], t), lerp(a[2][2], b[2][2], t)],
    rotY: lerp(a[3], b[3], t), rotX: lerp(a[4], b[4], t), y: lerp(a[5], b[5], t),
  }
}

/** Target palette colours for the current scroll position / swatch pick. */
const _ca = new THREE.Color(), _cb = new THREE.Color()
function targetColor(field, out) {
  const p = scrollState.progress
  if (p > 0.115 && p < 0.265) {
    const f = clamp01((p - 0.12) / 0.14) * (COLORWAYS.length - 1)
    const i = Math.min(COLORWAYS.length - 2, Math.floor(f))
    _ca.set(COLORWAYS[i][field]); _cb.set(COLORWAYS[i + 1][field])
    out.copy(_ca).lerp(_cb, f - i)
    scrollState.activeColorName = COLORWAYS[Math.round(f)].name
    return out
  }
  if (scrollState.manualColor >= 0) {
    out.set(COLORWAYS[scrollState.manualColor][field])
    scrollState.activeColorName = COLORWAYS[scrollState.manualColor].name
    return out
  }
  out.set(COLORWAYS[2][field]) // Sky Blue default outside colour stage
  return out
}

function KnurledCrown({ mats, crownRef }) {
  const ridges = useMemo(() => Array.from({ length: 30 }, (_, i) => (i / 30) * Math.PI * 2), [])
  return (
    <group position={[0.02, 0.62, 0.30]} rotation={[0.65, 0, -0.2]}>
      <group ref={crownRef}>
        {/* crown body — axis along local Z */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.082, 0.082, 0.07, 48]} />
          <meshStandardMaterial color="#e9eaec" metalness={1} roughness={0.22} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
          <cylinderGeometry args={[0.07, 0.076, 0.012, 48]} />
          <meshStandardMaterial color="#cfd1d5" metalness={1} roughness={0.3} />
        </mesh>
        {/* individually modelled knurl ridges */}
        {ridges.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.083, Math.sin(a) * 0.083, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.014, 0.026, 0.064]} />
            <meshStandardMaterial color="#dfe0e3" metalness={1} roughness={0.28} />
          </mesh>
        ))}
      </group>
      {/* stem */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.035, 0.035, 0.06, 24]} />
        <meshStandardMaterial color="#b9bbc0" metalness={1} roughness={0.18} />
      </mesh>
    </group>
  )
}

function EarCup({ side, mats, tex, crownRef, refs }) {
  const isR = side > 0
  const inner = isR ? 'R' : 'L'
  const shellRef = useRef(), h1Ref = useRef(), driverRef = useRef()
  const baffleRef = useRef(), cushionRef = useRef(), cupRef = useRef()
  // expose layer refs for choreography
  refs[isR ? 'R' : 'L'] = { cup: cupRef, shell: shellRef, h1: h1Ref, driver: driverRef, baffle: baffleRef, cushion: cushionRef }

  return (
    <group ref={cupRef} position={[side * 1.04, -0.58, 0]}>
      {/* ── anodised aluminium shell ─────────────────────────────── */}
      <group ref={shellRef}>
        <mesh castShadow receiveShadow scale={[0.60, 1.10, 0.96]}>
          <sphereGeometry args={[0.62, 72, 56]} />
          <meshPhysicalMaterial ref={isR ? mats.aluR : mats.aluL} metalness={0.86} roughness={0.36}
            bumpMap={tex.grain} bumpScale={0.12} clearcoat={0.25} clearcoatRoughness={0.5}
            envMapIntensity={1.0} color={COLORWAYS[2].alu} />
        </mesh>
        {/* polished chamfer ring on inner rim */}
        <mesh position={[-side * 0.30, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1.28, 1]}>
          <torusGeometry args={[0.46, 0.016, 12, 72]} />
          <meshStandardMaterial color="#e8e9eb" metalness={1} roughness={0.12} />
        </mesh>
        {/* microphone slits — seated on the shell surface */}
        <mesh position={[side * 0.17, 0.34, 0.33]} rotation={[0.5, side * 0.45, 0]}>
          <boxGeometry args={[0.09, 0.015, 0.018]} /><meshStandardMaterial color="#0a0a0c" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.64, 0.13]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.16, 0.02, 0.028]} /><meshStandardMaterial color="#0a0a0c" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.64, -0.15]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.16, 0.02, 0.028]} /><meshStandardMaterial color="#0a0a0c" roughness={0.7} />
        </mesh>
        {isR && (
          <>
            <KnurledCrown mats={mats} crownRef={crownRef} />
            {/* Noise Control pill button */}
            <group position={[-0.02, 0.65, -0.20]} ref={(o) => { if (o) anchorObjects.noise = o }}>
              <mesh castShadow rotation={[Math.PI / 2, 0, 0.15]} scale={[1, 1, 0.55]}>
                <capsuleGeometry args={[0.048, 0.105, 8, 24]} />
                <meshPhysicalMaterial color="#e2e3e6" metalness={0.85} roughness={0.35} clearcoat={0.4} />
              </mesh>
            </group>
            {/* Lightning port (bottom) */}
            <mesh position={[0.05, -0.63, 0.02]}>
              <boxGeometry args={[0.11, 0.025, 0.045]} /><meshStandardMaterial color="#08080a" roughness={0.6} />
            </mesh>
          </>
        )}
      </group>

      {/* ── H1 / battery / sensor assembly ───────────────────────── */}
      <group ref={h1Ref} position={[-side * 0.13, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.07, 0.52, 0.36]} />
          <meshStandardMaterial color="#17181c" roughness={0.45} metalness={0.3} />
        </mesh>
        <mesh position={[side * -0.05, 0.12, 0.05]}>
          <boxGeometry args={[0.03, 0.20, 0.16]} />
          <meshStandardMaterial color="#1f4033" roughness={0.4} metalness={0.45} />
        </mesh>
        <mesh position={[side * -0.05, -0.14, -0.06]}>
          <boxGeometry args={[0.03, 0.14, 0.12]} />
          <meshStandardMaterial color="#c8873a" roughness={0.35} metalness={0.8} />
        </mesh>
        {[0.07, 0, -0.07].map((z) => (
          <mesh key={z} position={[side * -0.055, 0.12, 0.05 + z]}>
            <boxGeometry args={[0.012, 0.045, 0.045]} />
            <meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.25} />
          </mesh>
        ))}
        {/* battery cell */}
        <mesh position={[0, -0.05, -0.02]} rotation={[0, 0, side * 0.06]}>
          <boxGeometry args={[0.10, 0.34, 0.22]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.35} metalness={0.2} />
        </mesh>
        {/* copper flex cable */}
        <mesh position={[side * 0.02, 0.30, -0.10]} rotation={[0.4, 0, side * 0.5]}>
          <torusGeometry args={[0.10, 0.012, 8, 32, Math.PI]} />
          <meshStandardMaterial color="#d08a3e" metalness={0.9} roughness={0.35} />
        </mesh>
      </group>

      {/* ── 40 mm driver, dual ring-magnet ───────────────────────── */}
      <group ref={driverRef} position={[-side * 0.22, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.07, 64]} />
          <meshStandardMaterial map={tex.driver} color="#888a90" metalness={0.65} roughness={0.4} />
        </mesh>
        <mesh position={[-side * 0.05, 0, 0]} rotation={[0, 0, side * Math.PI / 2]}>
          <coneGeometry args={[0.26, 0.12, 48]} />
          <meshStandardMaterial color="#26272b" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh position={[side * 0.045, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1]}>
          <torusGeometry args={[0.33, 0.028, 12, 64]} />
          <meshStandardMaterial color="#3c3d42" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[-side * 0.075, 0, 0]}>
          <sphereGeometry args={[0.10, 32, 24]} />
          <meshStandardMaterial color="#4a4b51" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* ── perforated acoustic baffle + magnetic ring ───────────── */}
      <group ref={baffleRef} position={[-side * 0.31, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.50, 0.50, 0.045, 64]} />
          <meshStandardMaterial color="#2c2d31" roughness={0.55} metalness={0.35} />
        </mesh>
        <mesh position={[-side * 0.026, 0, 0]} rotation={[0, -side * Math.PI / 2, 0]} scale={[1, 1.24, 1]}>
          <circleGeometry args={[0.485, 64]} />
          <meshStandardMaterial map={tex.baffle} roughness={0.65} metalness={0.25} />
        </mesh>
        {/* magnetic attachment ring */}
        <mesh position={[-side * 0.035, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1.26, 1]}
          ref={isR ? (o) => { if (o) anchorObjects.magnet = o } : undefined}>
          <torusGeometry args={[0.515, 0.022, 12, 80]} />
          <meshStandardMaterial color="#585960" metalness={1} roughness={0.28} />
        </mesh>
        {/* alignment pins + optical sensor */}
        {[0.35, -0.35].map((y) => (
          <mesh key={y} position={[-side * 0.045, y, 0.28]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.035, 16]} />
            <meshStandardMaterial color="#d6d7da" metalness={1} roughness={0.2} />
          </mesh>
        ))}
        <mesh position={[-side * 0.04, -0.28, -0.25]}>
          <sphereGeometry args={[0.028, 20, 16]} />
          <meshStandardMaterial color="#05070d" roughness={0.15} metalness={0.4} />
        </mesh>
      </group>

      {/* ── magnetic knit-mesh ear cushion ───────────────────────── */}
      <group ref={cushionRef} position={[-side * 0.44, 0, 0]}>
        <mesh castShadow receiveShadow rotation={[0, Math.PI / 2, 0]} scale={[1, 1.28, 1]}>
          <torusGeometry args={[0.45, 0.145, 36, 90]} />
          <meshStandardMaterial ref={isR ? mats.cushionR : mats.cushionL}
            map={tex.knit.map} bumpMap={tex.knit.bump} bumpScale={0.9}
            roughness={0.94} metalness={0} color={COLORWAYS[2].cushion} />
        </mesh>
        {/* inner woven L / R acoustic mesh */}
        <mesh position={[side * 0.075, 0, 0]} rotation={[0, -side * Math.PI / 2, 0]} scale={[1, 1.28, 1]}>
          <circleGeometry args={[0.375, 56]} />
          <meshStandardMaterial map={isR ? tex.innerR : tex.innerL} roughness={0.92} metalness={0}
            color={isR ? '#ffffff' : '#f2f2f2'} />
        </mesh>
        {/* cushion back shell */}
        <mesh position={[side * 0.10, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1.28, 1]}>
          <torusGeometry args={[0.44, 0.045, 14, 72]} />
          <meshStandardMaterial color="#242529" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

export default function AirPodsMax() {
  const tex = useMemo(() => ({
    knit: knitTextures(), canopy: canopyTextures(), grain: grainTexture(),
    innerL: innerMeshTexture('L'), innerR: innerMeshTexture('R'),
    baffle: baffleTexture(), caseT: caseTextures(), driver: driverTexture(),
  }), [])

  const mats = useRef({})
  const setMat = (key) => (m) => { if (m) mats.current[key] = m }
  const matRefs = {
    aluR: setMat('aluR'), aluL: setMat('aluL'),
    cushionR: setMat('cushionR'), cushionL: setMat('cushionL'),
  }
  const canopyMat = useRef(), frameMat = useRef()
  // shared material instances so body + flap / both sleeves morph together
  const sharedMats = useMemo(() => ({
    case: new THREE.MeshPhysicalMaterial({
      map: tex.caseT.map, bumpMap: tex.caseT.bump, bumpScale: 0.25,
      color: COLORWAYS[2].case, roughness: 0.72, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.8,
    }),
    sleeve: new THREE.MeshPhysicalMaterial({ color: COLORWAYS[2].canopy, roughness: 0.6, clearcoat: 0.25 }),
  }), [tex])
  const model = useRef(), crown = useRef(), caseGroup = useRef(), flap = useRef()
  const cupRefs = useRef({})
  const tmpC = useMemo(() => new THREE.Color(), [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    // smooth the scroll itself (Lenis smooths input; this damps scrub jitter)
    scrollState.progress = THREE.MathUtils.damp(scrollState.progress, scrollState.rawProgress, 8, dt)
    const p = scrollState.progress
    const k = sampleKeys(p)
    camState.pos.set(...k.cam); camState.tgt.set(...k.tgt); camState.rotY = k.rotY

    // ── derived stage parameters ──
    const detachIn = smooth(0.585, 0.645, p)
    const snapBack = smooth(0.685, 0.718, p)
    const detach = detachIn * (1 - snapBack) + Math.sin(snapBack * Math.PI) * 0.03 * detachIn // magnetic snap overshoot
    const explode = smooth(0.735, 0.80, p) * (1 - smooth(0.845, 0.885, p))
    const swivel = smooth(0.895, 0.935, p)
    const descend = smooth(0.925, 0.965, p)
    const closeFlap = smooth(0.958, 0.992, p)

    // ── model pose ──
    const g = model.current
    if (g) {
      const mx = scrollState.mouseX, my = scrollState.mouseY
      g.rotation.y = k.rotY + mx * 0.07
      g.rotation.x = k.rotX + my * 0.045
      g.rotation.z = mx * 0.015
      g.position.y = k.y - descend * 0.80 + Math.sin(state.clock.elapsedTime * 0.7) * 0.012 * (1 - descend)
      g.position.x = mx * 0.05
    }
    // crown spins through the macro stage
    if (crown.current) crown.current.rotation.z = smooth(0.26, 0.44, p) * Math.PI * 6 + p * 1.2

    // ── per-cup layers ──
    for (const sideKey of ['L', 'R']) {
      const L = cupRefs.current[sideKey]
      if (!L?.cup.current) continue
      const side = sideKey === 'R' ? 1 : -1
      L.cup.current.rotation.y = swivel * side * 0.9
      L.cup.current.position.y = -0.58 - swivel * 0.05
      // shell / internals explode along the cup axis (X)
      if (L.shell.current) L.shell.current.position.x = side * explode * 0.85
      if (L.h1.current) L.h1.current.position.x = -side * 0.13 + side * explode * 0.38
      if (L.driver.current) L.driver.current.position.x = -side * 0.22 - side * explode * 0.05
      if (L.baffle.current) L.baffle.current.position.x = -side * 0.31 - side * explode * 0.48
      if (L.cushion.current) {
        const c = L.cushion.current
        c.position.x = -side * 0.44 - side * (detach * 0.62 + explode * 0.95)
        c.position.z = detach * 0.38 + explode * 0.10
        c.position.y = -detach * 0.16
        c.rotation.y = detach * side * 0.35
        c.rotation.z = detach * side * 0.10
      }
    }

    // ── Smart Case finale ──
    if (caseGroup.current) {
      const rise = smooth(0.875, 0.93, p)
      caseGroup.current.position.y = lerp(-3.4, -1.78, rise)
      caseGroup.current.rotation.y = lerp(-0.5, 0, rise) + scrollState.mouseX * 0.04
      caseGroup.current.visible = p > 0.865
    }
    if (flap.current) {
      // open (folded back) while headphones descend, folds shut at the end
      flap.current.rotation.x = lerp(-1.85, 0.02, closeFlap)
    }

    // ── colourway morphing (lerp every tinted material) ──
    const a = 1 - Math.exp(-dt * 5.5)
    const M = mats.current
    if (M.aluR) { targetColor('alu', tmpC); M.aluR.color.lerp(tmpC, a); if (M.aluL) M.aluL.color.copy(M.aluR.color) }
    if (M.cushionR) { targetColor('cushion', tmpC); M.cushionR.color.lerp(tmpC, a); if (M.cushionL) M.cushionL.color.copy(M.cushionR.color) }
    if (canopyMat.current) { targetColor('canopy', tmpC); canopyMat.current.color.lerp(tmpC, a) }
    if (frameMat.current) { targetColor('canopy', tmpC); frameMat.current.color.lerp(tmpC, a).multiplyScalar(1.06) }
    targetColor('case', tmpC); sharedMats.case.color.lerp(tmpC, a)
    targetColor('canopy', tmpC); sharedMats.sleeve.color.lerp(tmpC, a)
  })

  // register live layer objects as leader-line sockets (right cup + left cushion)
  useEffect(() => {
    const R = cupRefs.current.R, L = cupRefs.current.L
    if (R) {
      anchorObjects.shell = R.shell.current; anchorObjects.h1 = R.h1.current
      anchorObjects.driver = R.driver.current; anchorObjects.baffle = R.baffle.current
      anchorObjects.cushionR = R.cushion.current
    }
    if (L) anchorObjects.cushionL = L.cushion.current
    if (crown.current) anchorObjects.crown = crown.current
  }, [])

  return (
    <>
      <group ref={model} position={[0, 0.1, 0]}>
        {/* ── headband frame + knit canopy ── */}
        <mesh position={[0, -0.42, 0]} scale={[1, 1.22, 1]} castShadow>
          <torusGeometry args={[1.06, 0.072, 20, 110, Math.PI]} />
          <meshPhysicalMaterial ref={frameMat} color={COLORWAYS[2].canopy} roughness={0.55} metalness={0.05} clearcoat={0.3} />
        </mesh>
        <mesh position={[0, -0.46, 0]} scale={[1, 1.20, 1.6]} receiveShadow
          ref={(o) => { if (o) anchorObjects.canopy = o }}>
          <torusGeometry args={[1.03, 0.10, 20, 110, Math.PI]} />
          <meshStandardMaterial ref={canopyMat} map={tex.canopy.map} bumpMap={tex.canopy.bump} bumpScale={1.1}
            color={COLORWAYS[2].canopy} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
        </mesh>
        {/* soft-touch sleeves + polished telescoping arms */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 1.06, -0.22, 0]} rotation={[0, 0, -s * 0.12]} castShadow material={sharedMats.sleeve}>
              <capsuleGeometry args={[0.105, 0.30, 10, 28]} />
            </mesh>
            <mesh position={[s * 1.05, 0.02, 0]} castShadow>
              <cylinderGeometry args={[0.034, 0.034, 0.50, 20]} />
              <meshStandardMaterial color="#f2f3f5" metalness={1} roughness={0.06} envMapIntensity={1.5} />
            </mesh>
            <mesh position={[s * 1.05, 0.10, 0]}>
              <sphereGeometry args={[0.055, 24, 18]} />
              <meshStandardMaterial color="#d9dade" metalness={1} roughness={0.12} />
            </mesh>
          </group>
        ))}

        <EarCup side={-1} mats={matRefs} tex={tex} crownRef={crown} refs={cupRefs.current} />
        <EarCup side={1} mats={matRefs} tex={tex} crownRef={crown} refs={cupRefs.current} />
      </group>

      {/* ── Smart Case ─────────────────────────────────────────── */}
      <group ref={caseGroup} position={[0, -3.4, 0.45]} visible={false}>
        <group ref={(o) => { if (o) anchorObjects.caseFlap = o }} position={[0, 0.55, 0]} />
        {/* body */}
        <RoundedBox args={[2.75, 1.95, 1.02]} radius={0.34} smoothness={8} position={[0, -0.15, 0]} castShadow receiveShadow>
          <primitive object={sharedMats.case} attach="material" />
        </RoundedBox>
        {/* inner lining */}
        <RoundedBox args={[2.45, 1.55, 0.9]} radius={0.3} smoothness={6} position={[0, 0.02, 0.04]}>
          <meshStandardMaterial color="#1c1d20" roughness={0.95} />
        </RoundedBox>
        {/* magnetic flap — pivots on the top rear edge */}
        <group position={[0, 0.78, -0.18]}>
          <group ref={flap}>
            <RoundedBox args={[1.55, 0.95, 0.92]} radius={0.28} smoothness={8} position={[0, 0.28, 0.22]} castShadow>
              <primitive object={sharedMats.case} attach="material" />
            </RoundedBox>
          </group>
        </group>
        {/* case foot shadow catcher lip */}
        <mesh position={[0, -1.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.55, 48]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.10} roughness={1} />
        </mesh>
      </group>
    </>
  )
}
