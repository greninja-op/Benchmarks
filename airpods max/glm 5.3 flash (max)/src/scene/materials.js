import * as THREE from 'three'
import { knit, canopy, meshPlate, baffleHoles, aluminum, caseGrain } from '../textures.js'
import { COLORWAYS } from '../store.js'

/* ------------------------------------------------------------------ */
/*  Central PBR material registry. One instance per semantic surface;  */
/*  colorway morphing lerps a handful of shared materials per frame.   */
/* ------------------------------------------------------------------ */

export function createMaterials() {
  const knitTex = knit()
  const canopyTex = canopy()
  const aluTex = aluminum()
  const grainTex = caseGrain()

  const M = {}

  M.alu = new THREE.MeshStandardMaterial({
    color: '#e7e9ec', metalness: 0.92, roughness: 0.25,
    bumpMap: aluTex.bump, bumpScale: 0.012, envMapIntensity: 1.25,
  })

  // cups use the same recipe but let stage logic control env intensity
  M.aluCup = M.alu.clone()

  M.crown = new THREE.MeshStandardMaterial({
    color: '#dfe2e6', metalness: 0.9, roughness: 0.3,
    bumpMap: aluTex.bump, bumpScale: 0.02, envMapIntensity: 1.1,
  })

  M.chrome = new THREE.MeshStandardMaterial({
    color: '#f2f3f5', metalness: 1.0, roughness: 0.07, envMapIntensity: 1.35,
  })

  M.soft = new THREE.MeshStandardMaterial({
    color: '#eceef1', roughness: 0.52, metalness: 0.0, envMapIntensity: 0.55,
  })

  M.canopy = new THREE.MeshStandardMaterial({
    color: '#f1f2f4', map: canopyTex.map, bumpMap: canopyTex.bump, bumpScale: 0.05,
    roughness: 0.85, metalness: 0.0, envMapIntensity: 0.4, side: THREE.DoubleSide,
  })

  M.canopyBack = new THREE.MeshStandardMaterial({
    color: '#b9bcc1', roughness: 0.9, metalness: 0.0, envMapIntensity: 0.25, side: THREE.DoubleSide,
  })

  M.cushion = new THREE.MeshStandardMaterial({
    color: '#f3f3f5', map: knitTex.map, bumpMap: knitTex.bump, bumpScale: 0.09,
    roughness: 0.78, metalness: 0.0, envMapIntensity: 0.45,
  })

  M.cushionMeshL = new THREE.MeshStandardMaterial({
    color: '#dcded8', map: meshPlate('L').map, bumpMap: meshPlate('L').map, bumpScale: 0.05,
    roughness: 0.86, metalness: 0.0, envMapIntensity: 0.4, side: THREE.DoubleSide,
  })
  M.cushionMeshR = new THREE.MeshStandardMaterial({
    color: '#dcded8', map: meshPlate('R').map, bumpMap: meshPlate('R').map, bumpScale: 0.05,
    roughness: 0.86, metalness: 0.0, envMapIntensity: 0.4, side: THREE.DoubleSide,
  })

  M.baffle = new THREE.MeshStandardMaterial({
    color: '#222428', map: baffleHoles().map, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.5,
    side: THREE.DoubleSide,
  })

  M.dark = new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.45, metalness: 0.25 })
  M.chip = new THREE.MeshStandardMaterial({ color: '#0d0e11', roughness: 0.35, metalness: 0.5 })
  M.flex = new THREE.MeshStandardMaterial({ color: '#c2662b', roughness: 0.5, metalness: 0.1 })
  M.magRing = new THREE.MeshStandardMaterial({ color: '#3c3f45', metalness: 0.9, roughness: 0.32 })
  M.driverCone = new THREE.MeshStandardMaterial({ color: '#101215', roughness: 0.34, metalness: 0.55, side: THREE.DoubleSide })
  M.screw = new THREE.MeshStandardMaterial({ color: '#8a8d93', metalness: 1.0, roughness: 0.35 })

  M.caseBody = new THREE.MeshStandardMaterial({
    color: '#2e5671', bumpMap: grainTex.bump, bumpScale: 0.05,
    roughness: 0.88, metalness: 0.0, envMapIntensity: 0.5,
  })
  M.caseTrim = new THREE.MeshStandardMaterial({
    color: '#c9ccd1', roughness: 0.45, metalness: 0.55, envMapIntensity: 0.8,
  })

  return M
}

/* ------------------ colorway morph (called per frame) -------------- */
const cA = new THREE.Color()
const cB = new THREE.Color()

function lerpMat(mat, hexA, hexB, t) {
  cA.set(hexA); cB.set(hexB)
  mat.color.copy(cA).lerp(cB, t)
}

/**
 * Damped colorway application. `current` = fractional colorway pos 0..4,
 * target = damping goal. Returns new fractional pos.
 */
export function applyColorway(M, current, target, lambda, dt) {
  // move fractional position toward the integer target
  const next = THREE.MathUtils.damp(current, target, lambda, dt)
  const i0 = Math.floor(THREE.MathUtils.clamp(next, 0, COLORWAYS.length - 1))
  const i1 = Math.min(COLORWAYS.length - 1, i0 + 1)
  const t = THREE.MathUtils.clamp(next - i0, 0, 1)
  const A = COLORWAYS[i0], B = COLORWAYS[i1]

  lerpMat(M.alu, A.alu, B.alu, t)
  M.aluCup.color.copy(M.alu.color)
  lerpMat(M.crown, A.alu, B.alu, t)
  lerpMat(M.soft, A.soft, B.soft, t)
  lerpMat(M.canopy, A.canopy, B.canopy, t)
  lerpMat(M.canopyBack, A.soft, B.soft, t)
  lerpMat(M.cushion, A.cushion, B.cushion, t)
  lerpMat(M.cushionMeshL, A.mesh, B.mesh, t)
  lerpMat(M.cushionMeshR, A.mesh, B.mesh, t)
  lerpMat(M.baffle, A.plate, B.plate, t)
  lerpMat(M.caseBody, A.case, B.case, t)
  lerpMat(M.caseTrim, A.trim, B.trim, t)
  return next
}
