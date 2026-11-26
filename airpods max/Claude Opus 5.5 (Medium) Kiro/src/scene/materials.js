// PBR material library + colorway palette.
import * as THREE from 'three';
import { makeGrainNormal, makeKnit, makeLetterMesh, makeCanopy, makeLeather, makePCB, makeChipLabel } from './textures.js';

export const PALETTE = [
  { name: 'Silver',     swatch: '#e3e4e6', alu: '#dcdde0', band: '#efefed', canopy: '#e6e6e3', cushion: '#e2e2df', mesh: '#cfcfcc', case: '#ebeae6' },
  { name: 'Space Gray', swatch: '#5c5d61', alu: '#626368', band: '#2c2c2e', canopy: '#38383b', cushion: '#46474a', mesh: '#2a2b2e', case: '#2e2f32' },
  { name: 'Sky Blue',   swatch: '#a9c3d6', alu: '#aec5d8', band: '#2f5779', canopy: '#5a83a5', cushion: '#88a4c2', mesh: '#56708f', case: '#2c5476' },
  { name: 'Pink',       swatch: '#efcfc6', alu: '#ecd0c7', band: '#efd4cc', canopy: '#eed2ca', cushion: '#edd0c7', mesh: '#d4ada3', case: '#e6c1b6' },
  { name: 'Green',      swatch: '#c9d3bd', alu: '#c6d0b9', band: '#dde5d3', canopy: '#d3dcc8', cushion: '#d0d9c3', mesh: '#b1bea3', case: '#b7c5a5' },
];
const KEYS = ['alu', 'band', 'canopy', 'cushion', 'mesh', 'case'];
const linear = PALETTE.map((p) => Object.fromEntries(KEYS.map((k) => [k, new THREE.Color(p[k])])));

export function createMaterials() {
  const grain = makeGrainNormal(512, 2.0, 7);
  grain.repeat.set(36, 14);
  const softGrain = makeGrainNormal(256, 1.2, 9);
  softGrain.repeat.set(30, 3);
  const knit = makeKnit(512, 32);
  const cushionMap = knit.map.clone(); cushionMap.repeat.set(10, 2.2); cushionMap.needsUpdate = true;
  const cushionNormal = knit.normalMap.clone(); cushionNormal.repeat.set(10, 2.2); cushionNormal.needsUpdate = true;
  const canopy = makeCanopy(256, 16);
  [canopy.map, canopy.alphaMap, canopy.normalMap].forEach((t) => t.repeat.set(26, 3));
  const meshL = makeLetterMesh('L');
  const meshR = makeLetterMesh('R');
  const leather = makeLeather(512, 40);
  leather.normalMap.repeat.set(3, 3);

  const M = {};
  M.alu = new THREE.MeshPhysicalMaterial({
    color: PALETTE[0].alu, metalness: 0.92, roughness: 0.25,
    normalMap: grain, normalScale: new THREE.Vector2(0.07, 0.07),
    clearcoat: 0.15, clearcoatRoughness: 0.35, envMapIntensity: 1.15,
  });
  M.steel = new THREE.MeshPhysicalMaterial({ color: '#f0f0f2', metalness: 1, roughness: 0.06, envMapIntensity: 1.4 });
  M.band = new THREE.MeshPhysicalMaterial({
    color: PALETTE[0].band, roughness: 0.62, metalness: 0, sheen: 0.35, sheenRoughness: 0.6,
    normalMap: softGrain, normalScale: new THREE.Vector2(0.25, 0.25),
  });
  M.canopy = new THREE.MeshPhysicalMaterial({
    color: PALETTE[0].canopy, map: canopy.map, alphaMap: canopy.alphaMap, normalMap: canopy.normalMap,
    alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide,
    roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff'),
  });
  M.cushion = new THREE.MeshPhysicalMaterial({
    color: PALETTE[0].cushion, map: cushionMap, normalMap: cushionNormal, normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ffffff'),
  });
  const meshMat = (t) => new THREE.MeshPhysicalMaterial({
    color: PALETTE[0].mesh, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.95, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff'),
  });
  M.meshL = meshMat(meshL);
  M.meshR = meshMat(meshR);
  M.case = new THREE.MeshPhysicalMaterial({
    color: PALETTE[0].case, roughness: 0.78, metalness: 0, normalMap: leather.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55), sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffffff'),
  });
  M.caseLining = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.95, side: THREE.BackSide });
  M.darkPlastic = new THREE.MeshStandardMaterial({ color: '#1c1c1f', roughness: 0.55, metalness: 0.05 });
  M.liner = new THREE.MeshStandardMaterial({ color: '#202023', roughness: 0.7, side: THREE.BackSide });
  M.baffle = new THREE.MeshStandardMaterial({ color: '#3a3b3f', roughness: 0.62, metalness: 0.05 });
  M.black = new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.35, clearcoat: 0.6 });
  M.void = new THREE.MeshBasicMaterial({ color: '#020203' });
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#0a0a0c', roughness: 0.05, clearcoat: 1, metalness: 0.2 });
  M.nickel = new THREE.MeshPhysicalMaterial({ color: '#cfd1d4', metalness: 1, roughness: 0.28 });
  M.magnetRing = new THREE.MeshPhysicalMaterial({ color: '#c9cbcf', metalness: 1, roughness: 0.22, emissive: '#7fb8ff', emissiveIntensity: 0 });
  M.copper = new THREE.MeshPhysicalMaterial({ color: '#c9774a', metalness: 1, roughness: 0.3 });
  M.kapton = new THREE.MeshPhysicalMaterial({ color: '#c8862f', roughness: 0.35, metalness: 0, clearcoat: 0.8, transmission: 0 });
  M.pcb = new THREE.MeshStandardMaterial({ map: makePCB(), roughness: 0.5, metalness: 0.1 });
  M.chip = new THREE.MeshStandardMaterial({ map: makeChipLabel('H1'), roughness: 0.4, metalness: 0.2 });
  M.cone = new THREE.MeshPhysicalMaterial({ color: '#2a2a2d', roughness: 0.4, clearcoat: 0.4 });
  M.rubber = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.9 });
  M.whitePlastic = new THREE.MeshPhysicalMaterial({ color: '#d9d9d6', roughness: 0.55 });
  return M;
}

const tmpA = new THREE.Color(), tmpB = new THREE.Color();
/** Interpolate the colorway at fractional index t (0..4). */
export function applyPalette(M, t) {
  const i = Math.max(0, Math.min(PALETTE.length - 1, Math.floor(t)));
  const j = Math.min(PALETTE.length - 1, i + 1);
  const f = Math.max(0, Math.min(1, t - i));
  const set = (mat, key) => mat.color.copy(tmpA.copy(linear[i][key]).lerp(tmpB.copy(linear[j][key]), f));
  set(M.alu, 'alu'); set(M.band, 'band'); set(M.canopy, 'canopy'); set(M.cushion, 'cushion');
  set(M.meshL, 'mesh'); set(M.meshR, 'mesh'); set(M.case, 'case');
}
