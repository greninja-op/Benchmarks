import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import AirPodsMax, { camState } from './AirPodsMax'
import { scrollState, anchors, anchorObjects } from '../lib/shared'

function CameraRig() {
  const { camera } = useThree()
  const tgt = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    desired.copy(camState.pos)
    desired.x += scrollState.mouseX * 0.22
    desired.y += -scrollState.mouseY * 0.14
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 4.5, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 4.5, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 4.5, dt)
    tgt.x = THREE.MathUtils.damp(tgt.x, camState.tgt.x, 5, dt)
    tgt.y = THREE.MathUtils.damp(tgt.y, camState.tgt.y, 5, dt)
    tgt.z = THREE.MathUtils.damp(tgt.z, camState.tgt.z, 5, dt)
    camera.lookAt(tgt)
  })
  return null
}

/** Projects every registered 3D socket to screen space for the DOM leader lines. */
function AnchorProjector() {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    for (const key of Object.keys(anchors)) {
      const obj = anchorObjects[key]
      const a = anchors[key]
      if (!obj) { a.behind = true; continue }
      obj.getWorldPosition(v)
      if (key === 'canopy') v.y += 1.32 // top of the arch, not torus centre
      if (key === 'caseFlap') v.y += 0.9
      v.project(camera)
      a.behind = v.z > 1 || v.z < -1
      a.sx = (v.x * 0.5 + 0.5) * size.width
      a.sy = (-v.y * 0.5 + 0.5) * size.height
    }
  })
  return null
}

/** Studio lights whose angles glide with scroll — speculars sweep the aluminium. */
function StudioLights() {
  const key = useRef(), rim = useRef(), fill = useRef()
  useFrame(() => {
    const p = scrollState.progress
    const ang = -0.6 + p * Math.PI * 1.6
    if (key.current) key.current.position.set(Math.sin(ang) * 5, 3.4 + Math.sin(p * 9) * 0.4, 3.6)
    if (rim.current) rim.current.position.set(Math.cos(ang + 2.2) * 5.5, 1.6, -3.6)
    if (fill.current) fill.current.intensity = 0.5 + Math.sin(p * Math.PI) * 0.35
  })
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight ref={key} intensity={2.2} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4}
        shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0002} />
      <directionalLight ref={rim} intensity={1.6} color="#cfe4ff" />
      <directionalLight ref={fill} position={[-3, 0.5, 4]} intensity={0.6} color="#fff1e0" />
      <spotLight position={[0, 6, 2]} angle={0.5} penumbra={1} intensity={0.7} />
    </>
  )
}

export default function Scene() {
  return (
    <>
      <StudioLights />
      {/* custom in-code studio HDRI — softboxes only, no external assets */}
      <Environment resolution={256}>
        <color attach="background" args={['#101014']} />
        <Lightformer intensity={4} position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#ffffff" />
        <Lightformer intensity={3} position={[-4, 1, 2]} rotation-y={Math.PI / 2} scale={[5, 2, 1]} color="#eef3ff" />
        <Lightformer intensity={3} position={[4, 0.5, 2]} rotation-y={-Math.PI / 2} scale={[5, 2, 1]} color="#fff0e2" />
        <Lightformer intensity={1.4} position={[0, 1, -4]} scale={[7, 2.5, 1]} color="#dfe9ff" />
        <Lightformer intensity={0.8} position={[0, -3, 2]} rotation-x={-Math.PI / 2} scale={[6, 3, 1]} color="#ffffff" />
      </Environment>

      <AirPodsMax />
      <CameraRig />
      <AnchorProjector />
      <ContactShadows position={[0, -2.82, 0]} opacity={0.32} scale={11} blur={2.6} far={4.2} resolution={512} color="#1a1c22" />
    </>
  )
}
