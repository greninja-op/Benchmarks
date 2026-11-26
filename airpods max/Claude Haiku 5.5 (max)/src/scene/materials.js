import * as THREE from 'three';

/** The five finishes from the brief. Hex values are sRGB approximations, converted to linear by three.js. */
export const FINISHES = [
  { id: 'silver', name: 'Silver', cup: '#d8dadf', band: '#eceef1', knit: '#e7e9ec', fabric: '#d9dbe0' },
  { id: 'space-gray', name: 'Space Gray', cup: '#4d5159', band: '#3c4046', knit: '#43474e', fabric: '#383c43' },
  { id: 'sky-blue', name: 'Sky Blue', cup: '#8fb7df', band: '#3f6f9a', knit: '#5482ae', fabric: '#36618a' },
  { id: 'pink', name: 'Pink', cup: '#eab9c3', band: '#d59ba9', knit: '#e2acb8', fabric: '#c98b99' },
  { id: 'green', name: 'Green', cup: '#abc6a6', band: '#7c987b', knit: '#9ab797', fabric: '#728f71' },
];

const KEYS = ['cup', 'band', 'knit', 'fabric'];
const COLORS = FINISHES.map((f) => Object.fromEntries(KEYS.map((k) => [k, new THREE.Color(f[k])])));
const WHITE = new THREE.Color(1, 1, 1);

/** Live palette. setColorway() writes interpolated colors into it. */
export function createPalette() {
  return {
    cup: new THREE.Color(), band: new THREE.Color(), knit: new THREE.Color(), fabric: new THREE.Color(), t: 0,
  };
}

/** t runs from 0 (Silver) to FINISHES.length - 1 (Green). Fractional values blend neighbours. */
export function setColorway(palette, t) {
  const last = FINISHES.length - 1;
  const c = THREE.MathUtils.clamp(t, 0, last);
  const i = Math.min(Math.floor(c), last - 1);
  const f = c - i;
  palette.t = c;
  for (const k of KEYS) palette[k].copy(COLORS[i][k]).lerp(COLORS[i + 1][k], f);
  return palette;
}
/** PBR materials. Finish-driven colors are written by applyPalette(). */
export function createMaterials(T) {
  const M = {};
  M.cup = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.92,
    roughness: 0.26,
    roughnessMap: T.grainRough,
    clearcoat: 0.18,
    clearcoatRoughness: 0.24,
  });
  M.button = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.7, roughness: 0.3 });
  M.plate = {
    L: new THREE.MeshStandardMaterial({ map: T.grilleMapL, normalMap: T.grilleNormal, roughness: 0.55, metalness: 0.15 }),
    R: new THREE.MeshStandardMaterial({ map: T.grilleMapR, normalMap: T.grilleNormal, roughness: 0.55, metalness: 0.15 }),
  };
  M.sleeve = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.6,
    sheen: 0.5,
    sheenRoughness: 0.5,
    normalMap: T.fabricNormal,
    normalScale: new THREE.Vector2(0.25, 0.25),
    side: THREE.DoubleSide,
  });
  M.canopy = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: T.knitMap,
    normalMap: T.knitNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.8,
    sheen: 1,
    sheenRoughness: 0.42,
    alphaMap: T.perfAlpha,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  M.cushion = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: T.knitMap,
    normalMap: T.knitNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.82,
    sheen: 1,
    sheenRoughness: 0.42,
  });
  M.chrome = new THREE.MeshPhysicalMaterial({ color: 0xf1f2f4, metalness: 1, roughness: 0.06 });
  M.steel = new THREE.MeshPhysicalMaterial({ color: 0x2b2e33, metalness: 0.85, roughness: 0.32 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.85 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 });
  M.copper = new THREE.MeshStandardMaterial({ color: 0xb8733a, metalness: 1, roughness: 0.32 });
  M.pcb = new THREE.MeshStandardMaterial({ map: T.pcb, roughness: 0.45 });
  M.chip = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.35, metalness: 0.3 });
  M.battery = new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.5, metalness: 0.6 });
  M.driver = new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  M.caseFabric = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.72,
    normalMap: T.caseNormal,
    normalScale: new THREE.Vector2(0.15, 0.15),
    sheen: 0.5,
    sheenRoughness: 0.5,
    side: THREE.DoubleSide,
  });
  return M;
}

/** Copies the live palette into every finish-driven material. Sheen is a lighter tint of its base. */
export function applyPalette(M, p) {
  M.cup.color.copy(p.cup);
  M.button.color.copy(p.cup).multiplyScalar(1.06);
  M.plate.L.color.copy(p.cup);
  M.plate.R.color.copy(p.cup);
  M.sleeve.color.copy(p.band);
  M.sleeve.sheenColor.copy(p.band).lerp(WHITE, 0.35);
  M.canopy.color.copy(p.knit);
  M.canopy.sheenColor.copy(p.knit).lerp(WHITE, 0.3);
  M.cushion.color.copy(p.knit);
  M.cushion.sheenColor.copy(p.knit).lerp(WHITE, 0.3);
  M.caseFabric.color.copy(p.fabric);
  M.caseFabric.sheenColor.copy(p.fabric).lerp(WHITE, 0.25);
}
