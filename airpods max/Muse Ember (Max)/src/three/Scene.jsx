import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import AirPodsMaxModel from './AirPodsMaxModel';

function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
function seg(p, a, b) { return smooth((p - a) / (b - a)); }

/** camera + rig keyframes across 0..1 */
function choreography(p) {
  // default front-three-quarter
  const cam = { pos: new THREE.Vector3(0, 0.6, 7.2), tgt: new THREE.Vector3(0, 0.7, 0) };
  const rig = { ry: 0.45, rx: 0.05, y: 0, scale: 1 };
  let crownSpin = p * 2, detach = 0, explode = 0, caseP = 0, flat = 0;

  if (p < 0.12) {
    const t = smooth(p / 0.12);
    cam.pos.set(lerp(0, 0, t), lerp(1.4, 0.6, t), lerp(9, 7.2, t));
    rig.ry = lerp(-0.5, 0.45, t);
  } else if (p < 0.26) {
    const t = smooth((p - 0.12) / 0.14);
    cam.pos.set(lerp(0, 1.2, t), 0.6, lerp(7.2, 6.4, t));
    rig.ry = lerp(0.45, 1.1, t);
  } else if (p < 0.44) {
    const t = smooth((p - 0.26) / 0.18);
    cam.pos.set(lerp(1.2, 2.6, t), lerp(0.6, 1.0, t), lerp(6.4, 2.6, t));
    cam.tgt.set(lerp(0, 1.2, t), lerp(0.7, 0.9, t), 0);
    rig.ry = lerp(1.1, 1.9, t);
    crownSpin = p * 2 + t * Math.PI * 3;
  } else if (p < 0.58) {
    const t = smooth((p - 0.44) / 0.14);
    cam.pos.set(lerp(2.6, -1.8, t), lerp(1.0, 2.0, t), lerp(2.6, 4.2, t));
    cam.tgt.set(lerp(1.2, -0.4, t), lerp(0.9, 1.6, t), 0);
    rig.ry = lerp(1.9, 0.2, t);
    rig.rx = lerp(0.05, -0.25, t);
    crownSpin = p * 2 + Math.PI * 3;
  } else if (p < 0.72) {
    const t = smooth((p - 0.58) / 0.14);
    cam.pos.set(lerp(-1.8, 0, t), lerp(2.0, 0.8, t), lerp(4.2, 6.8, t));
    cam.tgt.set(lerp(-0.4, 0, t), lerp(1.6, 0.7, t), 0);
    rig.ry = lerp(0.2, 0.45, t);
    rig.rx = lerp(-0.25, 0.05, t);
    // detach curve: out then snap back
    detach = Math.sin(t * Math.PI);
  } else if (p < 0.88) {
    const t = smooth((p - 0.72) / 0.16);
    cam.pos.set(lerp(0, 3.4, t), lerp(0.8, 0.7, t), lerp(6.8, 5.2, t));
    cam.tgt.set(0, 0.7, 0);
    rig.ry = lerp(0.45, 1.35, t);
    explode = Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5);
    if (t > 0.85) explode = lerp(explode, 0, smooth((t - 0.85) / 0.15));
  } else {
    const t = smooth((p - 0.88) / 0.12);
    cam.pos.set(lerp(3.4, 0, t), lerp(0.7, 0.4, t), lerp(5.2, 8.2, t));
    cam.tgt.set(0, lerp(0.7, 0.1, t), 0);
    rig.ry = lerp(1.35, 0, t);
    flat = t;
    caseP = t;
    explode = 0;
  }
  return { cam, rig, crownSpin, detach, explode, caseP, flat };
}

export default function Scene({ colorway, progressRef, overlayRefs }) {
  const model = useRef();
  const keyLight = useRef();
  const rimLight = useRef();
  const { camera, size } = useThree();
  const cur = useMemo(() => ({
    pos: new THREE.Vector3(0, 1.4, 9), tgt: new THREE.Vector3(0, 0.7, 0),
    ry: -0.5, rx: 0.05, y: 0,
  }), []);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  const project = (obj, el, line, label) => {
    if (!obj || !el || !line || !el.style) return;
    obj.getWorldPosition(tmp);
    tmp.project(camera);
    const x = (tmp.x * 0.5 + 0.5) * size.width;
    const y = (-tmp.y * 0.5 + 0.5) * size.height;
    const visible = tmp.z < 1;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = visible ? 1 : 0;
    if (label) {
      const lx = parseFloat(label.dataset.x || '0');
      const ly = parseFloat(label.dataset.y || '0');
      line.setAttribute('x1', x); line.setAttribute('y1', y);
      line.setAttribute('x2', lx); line.setAttribute('y2', ly);
      line.style.opacity = visible ? 1 : 0;
    }
  };

  useFrame((state, delta) => {
    const p = progressRef.current;
    const { cam, rig, crownSpin, detach, explode, caseP, flat } = choreography(p);
    const d = Math.min(1, delta * 4.5);

    cur.pos.lerp(cam.pos, d); cur.tgt.lerp(cam.tgt, d);
    cur.ry = lerp(cur.ry, rig.ry, d); cur.rx = lerp(cur.rx, rig.rx, d);
    camera.position.copy(cur.pos);
    camera.lookAt(cur.tgt);

    // dynamic light shifting — speculars glide across aluminum
    const t = state.clock.elapsedTime;
    if (keyLight.current) {
      keyLight.current.position.set(
        Math.cos(p * Math.PI * 2 + 0.6) * 5 + Math.sin(t * 0.3) * 0.4,
        4 + Math.sin(p * Math.PI) * 1.5, 4.5);
      keyLight.current.intensity = 2.2 + Math.sin(p * Math.PI * 2) * 0.4;
    }
    if (rimLight.current) {
      rimLight.current.position.set(Math.sin(p * Math.PI * 2.5) * 6, 2.5, -4.5);
      rimLight.current.intensity = 3 + p * 1.5;
    }

    const m = model.current;
    if (!m) return;
    m.root.rotation.y = cur.ry;
    m.root.rotation.x = cur.rx;
    m.root.position.y = -0.7 + Math.sin(t * 0.8) * 0.03 * (1 - p * 0.5);

    if (m.crown) m.crown.rotation.z = crownSpin;

    // Stage 5 — cushion detach
    const dz = detach * 1.15;
    if (m.leftCushion) m.leftCushion.position.x = -dz;
    if (m.rightCushion) m.rightCushion.position.x = dz;

    // Stage 6 — exploded view (right cup layers along X)
    const ex = explode * 1.05;
    if (m.shellR) m.shellR.position.x = ex * 1.4;
    if (m.elecR) m.elecR.position.x = ex * 0.5;
    if (m.driverR) m.driverR.position.x = ex * -0.25;
    if (m.baffleR) m.baffleR.position.x = ex * -0.9;
    if (m.shellL) m.shellL.position.x = -ex * 1.4;
    if (m.elecL) m.elecL.position.x = -ex * 0.5;
    if (m.driverL) m.driverL.position.x = ex * 0.25;
    if (m.baffleL) m.baffleL.position.x = ex * 0.9;
    const openCush = explode * 1.6 + dz * 0.4;
    if (m.leftCushion && explode > 0) m.leftCushion.position.x = -openCush;
    if (m.rightCushion && explode > 0) m.rightCushion.position.x = openCush;

    // Stage 3/4 cup micro-angle + Stage 7 swivel flat
    if (m.leftCup) m.leftCup.rotation.y = 0.18 + flat * 1.25;
    if (m.rightCup) m.rightCup.rotation.y = -0.18 - flat * 1.25;

    // Stage 7 — Smart Case rise + flap
    if (m.caseGroup) {
      m.caseGroup.position.y = lerp(-3.4, 0.1, smooth(caseP));
      m.caseGroup.position.z = lerp(-0.6, -0.9, smooth(caseP));
      m.root.position.y = lerp(m.root.position.y, -0.7 - caseP * 0.55, 0.08);
    }
    if (m.caseFlap) {
      // open at arrival, shut at very end
      const flapOpen = smooth(caseP / 0.6) * (1 - smooth((caseP - 0.75) / 0.25));
      m.caseFlap.rotation.x = -flapOpen * 1.9;
    }

    // leader-line projection
    const o = overlayRefs?.current;
    if (o && o.crownWrap && o.explWrap) {
      const showCrown = p > 0.26 && p < 0.46;
      const showExpl = p > 0.72 && p < 0.88;
      o.crownWrap.style.opacity = showCrown ? 1 : 0;
      o.explWrap.style.opacity = showExpl ? 1 : 0;
      if (showCrown) {
        project(m.crownAnchor, o.crownDot, o.crownLine, o.crownCard);
        project(m.noiseAnchor, o.noiseDot, o.noiseLine, o.noiseCard);
      }
      if (showExpl) {
        project(m.driverAnchorR, o.drvDot, o.drvLine, o.drvCard);
        project(m.baffleAnchorR, o.bafDot, o.bafLine, o.bafCard);
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#f5f5f7']} />
      <fog attach="fog" args={['#f5f5f7', 12, 24]} />

      <ambientLight intensity={0.55} />
      <directionalLight ref={keyLight} position={[4, 5, 4]} intensity={2.2} color="#ffffff" />
      <directionalLight ref={rimLight} position={[-5, 2.5, -4]} intensity={3} color="#dfe8ff" />
      <directionalLight position={[0, 3, -2]} intensity={0.5} color="#fff2e2" />

      <AirPodsMaxModel ref={model} colorway={colorway} />

      <ContactShadows position={[0, -2.1, 0]} opacity={0.42} scale={12} blur={2.6} far={4} color="#1a1a22" />

      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer form="circle" intensity={5} position={[0, 5, -9]} scale={3} />
          <Lightformer intensity={2.5} position={[-5, 1, -1]} scale={[8, 1.5]} />
          <Lightformer intensity={2.5} position={[5, 1, -1]} scale={[8, 1.5]} />
          <Lightformer intensity={1.2} position={[0, 5, 5]} scale={[6, 2]} color="#fff4e6" />
        </group>
      </Environment>
    </>
  );
}
