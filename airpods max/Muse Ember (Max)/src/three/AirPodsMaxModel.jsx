import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { knitTextures, microGrain, canopyAlpha, acousticMesh, baffleTexture, leatherTextures } from './textures';

/**
 * High-detail parametric AirPods Max.
 * Exposes animated nodes via ref for scroll choreography.
 */
const AirPodsMaxModel = forwardRef(function AirPodsMaxModel({ colorway }, ref) {
  const root = useRef();
  const headband = useRef();
  const leftCup = useRef();
  const rightCup = useRef();
  const leftCushion = useRef();
  const rightCushion = useRef();
  const crown = useRef();
  const canopy = useRef();
  const caseGroup = useRef();
  const caseFlap = useRef();
  const crownAnchor = useRef();
  const noiseAnchor = useRef();
  const driverAnchorR = useRef();
  const baffleAnchorR = useRef();

  // exploded layer refs (right cup)
  const shellR = useRef(); const elecR = useRef(); const driverR = useRef(); const baffleR = useRef();
  const shellL = useRef(); const elecL = useRef(); const driverL = useRef(); const baffleL = useRef();

  useImperativeHandle(ref, () => ({
    root: root.current, headband: headband.current,
    leftCup: leftCup.current, rightCup: rightCup.current,
    leftCushion: leftCushion.current, rightCushion: rightCushion.current,
    crown: crown.current, canopy: canopy.current,
    caseGroup: caseGroup.current, caseFlap: caseFlap.current,
    crownAnchor: crownAnchor.current, noiseAnchor: noiseAnchor.current,
    driverAnchorR: driverAnchorR.current, baffleAnchorR: baffleAnchorR.current,
    shellR: shellR.current, elecR: elecR.current, driverR: driverR.current, baffleR: baffleR.current,
    shellL: shellL.current, elecL: elecL.current, driverL: driverL.current, baffleL: baffleL.current,
  }), [colorway]);

  const knit = useMemo(() => knitTextures(colorway.knit, colorway.knitDark), [colorway]);
  const grain = useMemo(() => microGrain(), []);
  const canopyA = useMemo(() => canopyAlpha(), []);
  const baffle = useMemo(() => baffleTexture(), []);
  const meshL = useMemo(() => acousticMesh('L', colorway.meshTint), [colorway]);
  const meshR = useMemo(() => acousticMesh('R', colorway.meshTint), [colorway]);
  const leather = useMemo(() => leatherTextures(colorway.case), [colorway]);

  const aluminumMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorway.aluminum),
    metalness: 0.92, roughness: 0.25,
    roughnessMap: grain.rough, bumpMap: grain.bump, bumpScale: 0.6,
    clearcoat: 0.5, clearcoatRoughness: 0.25,
    envMapIntensity: 1.35,
  }), []);

  const chromeMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#f4f5f7', metalness: 1.0, roughness: 0.06, envMapIntensity: 1.6, clearcoat: 0.4,
  }), []);

  const cushionMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorway.knit),
    bumpScale: 1.4,
    roughness: 0.9, metalness: 0.0, sheen: 1.0,
    sheenColor: new THREE.Color(colorway.knit), sheenRoughness: 0.6,
    envMapIntensity: 0.4,
  }), []);

  const canopyMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorway.canopy),
    bumpScale: 1.0,
    roughness: 0.85, metalness: 0, transparent: true,
    side: THREE.DoubleSide, envMapIntensity: 0.35,
  }), []);

  const sleeveMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorway.sleeve), roughness: 0.55, metalness: 0.05,
    clearcoat: 0.15, envMapIntensity: 0.7,
  }), []);

  const caseMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorway.case),
    roughness: 0.7, metalness: 0.02, clearcoat: 0.08, envMapIntensity: 0.6,
  }), []);

  const darkPlastic = useMemo(() => new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.5, metalness: 0.3 }), []);
  const boardMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d1a12', roughness: 0.4, metalness: 0.6 }), []);
  const copperMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b46a3c', roughness: 0.3, metalness: 1 }), []);
  const magnetMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8f98', roughness: 0.25, metalness: 1 }), []);
  const diaphragmMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#101114', roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }), []);

  // smooth PBR colorway morphing — lerp live materials toward targets
  const targets = useMemo(() => ({
    aluminum: new THREE.Color(), knit: new THREE.Color(), canopy: new THREE.Color(),
    sleeve: new THREE.Color(), case: new THREE.Color(), sheen: new THREE.Color(),
  }), []);
  targets.aluminum.set(colorway.aluminum);
  targets.knit.set(colorway.knit);
  targets.canopy.set(colorway.canopy);
  targets.sleeve.set(colorway.sleeve);
  targets.case.set(colorway.case);
  targets.sheen.set(colorway.knit);
  // (re)bind procedural maps when colorway family changes
  cushionMat.map = knit.map; cushionMat.bumpMap = knit.bumpMap; cushionMat.needsUpdate = false;
  canopyMat.map = knit.map; canopyMat.bumpMap = knit.bumpMap; canopyMat.alphaMap = canopyA; canopyMat.needsUpdate = false;
  caseMat.map = leather; caseMat.needsUpdate = false;
  useFrame((_, delta) => {
    const k = Math.min(1, delta * 3.2);
    aluminumMat.color.lerp(targets.aluminum, k);
    cushionMat.color.lerp(targets.knit, k);
    if (cushionMat.sheenColor) cushionMat.sheenColor.lerp(targets.sheen, k);
    canopyMat.color.lerp(targets.canopy, k);
    sleeveMat.color.lerp(targets.sleeve, k);
    caseMat.color.lerp(targets.case, k);
  });

  // Headband arch curve
  const archCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.55, 0.4, 0),
    new THREE.Vector3(-1.35, 1.5, 0),
    new THREE.Vector3(-0.7, 2.35, 0),
    new THREE.Vector3(0, 2.55, 0),
    new THREE.Vector3(0.7, 2.35, 0),
    new THREE.Vector3(1.35, 1.5, 0),
    new THREE.Vector3(1.55, 0.4, 0),
  ]), []);

  const frameGeo = useMemo(() => new THREE.TubeGeometry(archCurve, 64, 0.16, 16, false), [archCurve]);
  const canopyGeo = useMemo(() => {
    // curved canopy strip inside the arch
    const g = new THREE.PlaneGeometry(2.15, 0.62, 32, 8);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const arch = Math.cos((x / 2.4) * Math.PI * 0.62) * 0.55;
      pos.setZ(i, pos.getZ(i) * 0.15);
      pos.setY(i, pos.getY(i) + arch);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const knurl = useMemo(() => {
    // 44 ridges around crown
    const items = [];
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      items.push({ pos: [Math.cos(a) * 0.115, Math.sin(a) * 0.115, 0], rot: a });
    }
    return items;
  }, []);

  const CupAssembly = ({ side = 1, cushionRef, shellRef, elecRef, driverRef, baffleRef, meshTex, letter }) => (
    <group position={[side * 1.55, 0.15, 0]} rotation={[0, side * -0.18, side * 0.1]}>
      {/* telescoping arm */}
      <mesh position={[0, 1.05, 0]} material={chromeMat}>
        <cylinderGeometry args={[0.075, 0.075, 0.85, 32]} />
      </mesh>
      <mesh position={[side * 0.02, 1.32, 0]} material={chromeMat}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 32]} />
      </mesh>

      <group ref={side > 0 ? rightCup : leftCup}>
        {/* OUTER SHELL (explodes on X) */}
        <group ref={shellRef}>
          <RoundedBox args={[0.62, 1.55, 1.15]} radius={0.28} smoothness={8} material={aluminumMat} />
          {/* chamfer ring highlight */}
          <mesh position={[side * 0.28, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.52, 0.02, 12, 64]} />
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.15} transparent opacity={0.35} />
          </mesh>
          {/* mic slits bottom */}
          <mesh position={[0, -0.78, 0.18]} material={darkPlastic}>
            <boxGeometry args={[0.02, 0.02, 0.16]} />
          </mesh>
          <mesh position={[0, -0.78, -0.1]} material={darkPlastic}>
            <boxGeometry args={[0.02, 0.02, 0.12]} />
          </mesh>
          {/* side vent */}
          <mesh position={[side * 0.31, 0.35, 0.25]} rotation={[0, 0, 0.4]} material={darkPlastic}>
            <boxGeometry args={[0.015, 0.12, 0.025]} />
          </mesh>
          {side > 0 && (
            <>
              {/* Digital Crown */}
              <group position={[0.32, 0.62, 0.32]} rotation={[0, Math.PI / 2, 0]}>
                <group ref={crown}>
                  <mesh material={chromeMat}>
                    <cylinderGeometry args={[0.115, 0.115, 0.09, 48]} />
                  </mesh>
                  {knurl.map((k, i) => (
                    <mesh key={i} position={k.pos} rotation={[0, 0, k.rot]} material={chromeMat}>
                      <boxGeometry args={[0.018, 0.03, 0.09]} />
                    </mesh>
                  ))}
                  <mesh position={[0, 0, 0.048]}>
                    <circleGeometry args={[0.095, 48]} />
                    <meshStandardMaterial color="#e9eaee" roughness={0.35} metalness={0.6} />
                  </mesh>
                </group>
                <mesh ref={crownAnchor} position={[0, 0, 0.12]} visible={false}>
                  <sphereGeometry args={[0.02, 8, 8]} />
                </mesh>
              </group>
              {/* Noise control pill */}
              <mesh position={[0.32, 0.62, -0.18]} rotation={[0, Math.PI / 2, 0]} material={sleeveMat}>
                <capsuleGeometry args={[0.045, 0.1, 8, 16]} />
              </mesh>
              <mesh ref={noiseAnchor} position={[0.36, 0.62, -0.18]} visible={false}>
                <sphereGeometry args={[0.02, 8, 8]} />
              </mesh>
            </>
          )}
        </group>

        {/* ELECTRONICS / H1 + flex */}
        <group ref={elecRef}>
          <mesh position={[-side * 0.05, 0.1, 0]} material={boardMat}>
            <boxGeometry args={[0.1, 0.9, 0.7]} />
          </mesh>
          <mesh position={[-side * 0.05, -0.45, 0]} rotation={[0.3, 0, 0]}>
            <torusGeometry args={[0.32, 0.035, 12, 48, Math.PI * 1.4]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.5} />
          </mesh>
          <mesh position={[-side * 0.05, 0.55, 0.15]} material={copperMat}>
            <boxGeometry args={[0.06, 0.25, 0.08]} />
          </mesh>
          <mesh position={[-side * 0.05, 0.62, -0.2]} material={magnetMat}>
            <boxGeometry args={[0.12, 0.22, 0.18]} />
          </mesh>
        </group>

        {/* DRIVER */}
        <group ref={driverRef}>
          <mesh position={[-side * 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={diaphragmMat}>
            <cylinderGeometry args={[0.48, 0.52, 0.14, 64]} />
          </mesh>
          <mesh ref={side > 0 ? driverAnchorR : undefined} position={[0, 0.2, 0.4]} visible={false}>
            <sphereGeometry args={[0.02, 8, 8]} />
          </mesh>
          {[0.34, 0.4].map((r, i) => (
            <mesh key={i} position={[-side * 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={magnetMat}>
              <torusGeometry args={[r, 0.045, 16, 64]} />
            </mesh>
          ))}
          <mesh position={[-side * 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.3, 48]} />
            <meshStandardMaterial color="#1c1e24" roughness={0.6} />
          </mesh>
        </group>

        {/* BAFFLE + magnetic ring */}
        <group ref={baffleRef}>
          <mesh position={[side * 0.32, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.52, 64]} />
            <meshStandardMaterial map={baffle} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh ref={side > 0 ? baffleAnchorR : undefined} position={[side * 0.32, -0.3, 0.3]} visible={false}>
            <sphereGeometry args={[0.02, 8, 8]} />
          </mesh>
          <mesh position={[side * 0.3, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={magnetMat}>
            <torusGeometry args={[0.5, 0.03, 12, 64]} />
          </mesh>
          {[[-0.35, 0.3], [0.35, 0.3], [-0.35, -0.3], [0.35, -0.3]].map(([y, z], i) => (
            <mesh key={i} position={[side * 0.32, y * 1.2, z * 1.2]} material={magnetMat}>
              <sphereGeometry args={[0.035, 16, 16]} />
            </mesh>
          ))}
        </group>

        {/* CUSHION (detachable) */}
        <group ref={cushionRef}>
          <mesh position={[side * 0.62, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={cushionMat}>
            <torusGeometry args={[0.42, 0.21, 24, 64]} />
          </mesh>
          <mesh position={[side * 0.62, 0, 0]} rotation={[0, side * Math.PI / 2, 0]}>
            <circleGeometry args={[0.42, 48]} />
            <meshStandardMaterial map={meshTex} roughness={0.9} />
          </mesh>
          <mesh position={[side * 0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={darkPlastic}>
            <torusGeometry args={[0.5, 0.045, 12, 64]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  return (
    <group ref={root} position={[0, -0.7, 0]}>
      {/* HEADBAND */}
      <group ref={headband}>
        <mesh geometry={frameGeo} material={sleeveMat} />
        <mesh position={[0, 2.28, 0]} rotation={[-Math.PI / 2.4, 0, 0]} material={canopyMat} ref={canopy}>
          <primitive object={canopyGeo} attach="geometry" />
        </mesh>
        {/* sleeves */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.48, 0.85, 0]} rotation={[0, 0, s * 0.28]} material={sleeveMat}>
            <capsuleGeometry args={[0.17, 0.75, 8, 16]} />
          </mesh>
        ))}
      </group>

      <CupAssembly side={-1} cushionRef={leftCushion} shellRef={shellL} elecRef={elecL} driverRef={driverL} baffleRef={baffleL} meshTex={meshL} letter="L" />
      <CupAssembly side={1} cushionRef={rightCushion} shellRef={shellR} elecRef={elecR} driverRef={driverR} baffleRef={baffleR} meshTex={meshR} letter="R" />

      {/* SMART CASE */}
      <group ref={caseGroup} position={[0, -3.2, -0.6]} rotation={[0.15, 0, 0]}>
        <RoundedBox args={[3.6, 2.4, 1.5]} radius={0.55} smoothness={6} material={caseMat} position={[-0.85, 0, 0]} />
        <RoundedBox args={[3.6, 2.4, 1.5]} radius={0.55} smoothness={6} material={caseMat} position={[0.85, 0, 0]} />
        <group ref={caseFlap} position={[0, 1.15, 0.4]}>
          <RoundedBox args={[2.2, 0.9, 0.18]} radius={0.08} smoothness={4} material={caseMat} position={[0, -0.35, 0.35]} />
        </group>
        {/* case opening glow */}
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[3.1, 0.12, 1.1]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
});

export default AirPodsMaxModel;
