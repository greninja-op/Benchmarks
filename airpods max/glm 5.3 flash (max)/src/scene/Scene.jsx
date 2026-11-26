import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { damp3 } from 'maath/easing'
import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { APP, COLORWAYS } from '../store.js'
import { createMaterials, applyColorway } from './materials.js'
import { evalChoreo, resolveCamera } from '../choreo.js'
import AirpodsMax, { DIM } from './AirpodsMax.jsx'
import SmartCase from './SmartCase.jsx'

const BG = ['#eef0f2', '#f3f2f4', '#e9ecef', '#f4f2ef', '#edeff1', '#e7e9ec', '#dee2e6']

export const FLOOR_Y = -7.2

export default function Scene() {
  const M = useMemo(createMaterials, [])

  const R = useMemo(() => {
    const anchors = new Map()
    for (const name of ['crown', 'button', 'driver', 'chip', 'shell', 'cushionL', 'cushionR', 'case']) {
      anchors.set(name, { current: null })
    }
    const r = {
      model: null, pivotL: null, pivotR: null, bodyL: null, bodyR: null,
      cushionL: null, cushionR: null, crown: null, button: null,
      flap: null, case: null, parts: {}, anchors,
    }
    if (typeof window !== 'undefined') window.__R = r
    return r
  }, [])

  const colorFrac = useRef(0)
  const mouse = useRef({ x: 0, y: 0 })
  const look = useRef(new THREE.Vector3(0, 0.35, 0))
  const camDesired = useRef(new THREE.Vector3(0.5, 0.9, 27.5))
  const camTgt = useRef(new THREE.Vector3())
  const camOut = useRef({ fov: 30 })
  const modelPos = useRef(new THREE.Vector3())
  const anchorWorld = useMemo(() => {
    const m = new Map()
    for (const name of R.anchors.keys()) m.set(name, new THREE.Vector3(0, 999, 0))
    return m
  }, [])
  const tmpV = useRef(new THREE.Vector3())
  const keyLight = useRef()
  const keyTarget = useRef()
  const rimLight = useRef()
  const rimTarget = useRef()
  const lastBg = useRef('')

  useFrame((st, dt) => {
    if (typeof window !== 'undefined') window.__ST = st
    dt = Math.min(dt, 1 / 20)
    const t = st.clock.elapsedTime
    const camera = st.camera

    /* ---- progress smoothing (single source of scroll truth) ---- */
    APP.progress = THREE.MathUtils.damp(APP.progress, APP.raw, 5.2, dt)
    const c = evalChoreo(APP.progress)
    APP.choreo = c

    /* ---- mouse parallax smoothing ---- */
    mouse.current.x = THREE.MathUtils.damp(mouse.current.x, APP.mouse.tx, 3.2, dt)
    mouse.current.y = THREE.MathUtils.damp(mouse.current.y, APP.mouse.ty, 3.2, dt)

    /* ---- model choreography ---- */
    if (R.model) {
      const idle = 1 - c.caseRise
      R.model.rotation.y = c.yaw + mouse.current.x * 0.035 * idle
      R.model.rotation.x = mouse.current.y * 0.02 * idle
      R.model.position.set(
        c.mx,
        -0.42 * c.nest + Math.sin(t * 0.85) * 0.05 * idle,
        0
      )
    }

    /* ---- cups: rest pose + fold + detach + explode ---- */
    if (R.pivotL && R.pivotR) {
      const roll = DIM.rollRest * (1 - c.fold * 0.35)
      R.pivotL.rotation.set(0, -DIM.yawRest - 0.92 * c.fold, -roll)
      R.pivotR.rotation.set(0, DIM.yawRest + 0.92 * c.fold, roll)
    }
    if (R.cushionL) {
      R.cushionL.position.z = -2.25 - 2.55 * c.detachL - 2.6 * c.explode
      R.cushionL.position.y = Math.sin(t * 3.1) * 0.06 * Math.min(1, c.detachL) * (1 - c.explode)
      R.cushionL.rotation.x = 0.09 * Math.sin(Math.min(1, c.detachL) * Math.PI) + 0.05 * c.explode
    }
    if (R.cushionR) {
      R.cushionR.position.z = -2.25 - 2.55 * c.detachR
      R.cushionR.position.y = Math.sin(t * 3.4 + 1.3) * 0.06 * Math.min(1, c.detachR)
      R.cushionR.rotation.x = 0.09 * Math.sin(Math.min(1, c.detachR) * Math.PI + 0.4)
    }
    if (R.parts.shell) R.parts.shell.position.z = 4.9 * c.explode
    if (R.parts.chassis) R.parts.chassis.position.z = 0.45 + 3.5 * c.explode
    if (R.parts.board) R.parts.board.position.z = 0.2 + 2.02 * c.explode
    if (R.parts.driver) R.parts.driver.position.z = -0.5 - 0.15 * c.explode
    if (R.parts.baffle) R.parts.baffle.position.z = -1.52 - 0.9 * c.explode

    /* ---- precision controls ---- */
    if (R.crown) R.crown.rotation.y = c.crownSpin
    if (R.button) {
      const press = (1 - Math.abs(1 - 2 * THREE.MathUtils.clamp((APP.progress - 0.403) / 0.014, 0, 1)))
      R.button.scale.set(1 - 0.09 * press, 0.62, 0.62)
    }

    /* ---- Smart Case ---- */
    if (R.case) {
      const e = 1 - Math.pow(1 - c.caseRise, 3)
      R.case.visible = c.caseRise > 0.001
      // rises from below AND in front of the cups, settling around them
      R.case.position.y = -20.4 + 17.95 * e
      R.case.position.z = 9.0 * (1 - e)
      R.case.rotation.y = -0.1 * e
    }
    if (R.flap) R.flap.rotation.x = 2.55 * c.flap

    /* ---- colorway state machine ---- */
    let target
    if (APP.colorOverride != null && c.colorAuto) {
      target = APP.colorOverride
    } else if (c.colorAuto) {
      // use RAW progress so the finish always lands on its exact stop
      target = Math.max(0, Math.min(4, Math.round((APP.raw - 0.118) / 0.154 * 4)))
      APP.autoIdx = target
    } else if (APP.colorOverride != null) {
      target = APP.colorOverride
    } else {
      target = APP.autoIdx ?? 0
    }
    APP.finishName = COLORWAYS[target].name
    APP.finishIdx = target
    colorFrac.current = applyColorway(M, colorFrac.current, target, 2.4, dt)

    /* ---- world matrices + anchor solve ---- */
    st.scene.updateMatrixWorld()
    modelPos.current.copy(R.model ? R.model.position : tmpV.current.set(0, 0, 0))
    for (const [name, ref] of R.anchors) {
      const o = ref.current
      if (!o) continue
      o.getWorldPosition(anchorWorld.get(name))
    }

    /* ---- camera ---- */
    resolveCamera(APP.progress, modelPos.current, anchorWorld, camDesired.current, camTgt.current, camOut.current)
    // mouse parallax in camera space
    const az = Math.atan2(camera.position.x - camTgt.current.x, camera.position.z - camTgt.current.z)
    const right = tmpV.current.set(Math.cos(az), 0, -Math.sin(az))
    const px = right.x * mouse.current.x * 0.55
    const pz = right.z * mouse.current.x * 0.55
    const py = -mouse.current.y * 0.38

    damp3(camera.position, [camDesired.current.x + px, camDesired.current.y + py, camDesired.current.z + pz], 4.6, dt)
    damp3(look.current, camTgt.current, 5.4, dt)
    camera.lookAt(look.current)

    const aspect = st.viewport.aspect ?? st.size.width / st.size.height
    const fovBoost = aspect < 1.05 ? Math.min(1.65, 1.02 / Math.max(0.4, aspect)) : 1
    const nv = camOut.current.fov * fovBoost
    if (Math.abs(camera.fov - nv) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, nv, 4.5, dt)
      camera.updateProjectionMatrix()
    }

    /* ---- dynamic studio lights — highlights glide with travel ---- */
    if (keyLight.current && keyTarget.current && rimLight.current && rimTarget.current) {
      keyLight.current.target = keyTarget.current
      rimLight.current.target = rimTarget.current
      const gx = camTgt.current.x, gy = camTgt.current.y, gz = camTgt.current.z
      const drift = Math.sin(t * 0.16) * 0.35 + c.explode * 0.5
      const kAz = az + 0.85 + drift
      keyLight.current.position.set(gx + Math.cos(kAz) * 13, gy + 8.2, gz + Math.sin(kAz) * 13)
      keyTarget.current.position.set(gx, gy, gz)
      const rAz = az - 2.35 + drift * 0.5
      rimLight.current.position.set(gx + Math.cos(rAz) * 11, gy + 4.6, gz + Math.sin(rAz) * 11)
      rimTarget.current.position.set(gx, gy + 1, gz)
      rimLight.current.intensity = 1.9 + c.explode * 0.7 + c.caseRise * 0.5
      keyLight.current.intensity = 2.6 + c.explode * 0.5
    }

    /* ---- anchor projection for HUD ---- */
    const w = st.size.width, h = st.size.height
    APP.anchorXY.clear?.()
    for (const [name, vec] of anchorWorld) {
      const prj = tmpV.current.copy(vec).project(camera)
      APP.anchorXY.set(name, {
        x: (prj.x * 0.5 + 0.5) * w,
        y: (-prj.y * 0.5 + 0.5) * h,
        behind: prj.z > 1 || prj.z < -1,
      })
    }

    /* ---- backdrop color per stage ---- */
    const bg = BG[c.stage]
    if (bg !== lastBg.current) {
      lastBg.current = bg
      document.documentElement.style.setProperty('--stage-bg', bg)
    }
  })

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight ref={keyLight} intensity={2.6} color="#fff7ee" position={[10, 12, 12]} />
      <directionalLight ref={rimLight} intensity={1.9} color="#dfe8ff" position={[-10, 6, -9]} />
      <object3D ref={keyTarget} />
      <object3D ref={rimTarget} />
      <pointLight position={[0, 2, 14]} intensity={30} color="#ffffff" />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#5a5e64']} />
        {/* top softbox */}
        <Lightformer intensity={9} position={[0, 10, 2]} rotation-x={Math.PI / 2} scale={[14, 5, 1]} color="#ffffff" />
        {/* rear hair-line strip */}
        <Lightformer intensity={7} position={[0, 4, -10]} scale={[12, 1.6, 1]} color="#ffffff" />
        {/* side strips */}
        <Lightformer intensity={3.2} position={[-10, 2, 2]} rotation-y={Math.PI / 2} scale={[2.6, 11, 1]} color="#f2f5f9" />
        <Lightformer intensity={3.2} position={[10, 2, -2]} rotation-y={-Math.PI / 2} scale={[2.6, 11, 1]} color="#f2f5f9" />
        {/* front fill */}
        <Lightformer intensity={2.4} position={[0, 1.5, 12]} rotation-y={Math.PI} scale={[9, 3.2, 1]} color="#fafbfc" />
        {/* warm kicker */}
        <Lightformer intensity={1.4} position={[6, -3, 6]} rotation-y={-Math.PI / 4} scale={[3, 3, 1]} color="#ffe9d8" />
      </Environment>

      <AirpodsMax M={M} R={R} />
      <SmartCase M={M} R={R} />

      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={0.52}
        scale={34}
        blur={2.9}
        far={11}
        resolution={512}
        color="#141821"
        frames={Infinity}
      />
    </>
  )
}
