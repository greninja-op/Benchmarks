import * as THREE from 'three';
import { superEllipsoid } from './geometry.js';

/** Half sizes in cm. a = length (X), b = depth (Z), c = height (Y). */
export const CASE = { a: 10.6, b: 5.4, c: 5.8 };

/**
 * Smart Case: an open bowl with a domed lid. The lid hinges along the back edge (Z = -b).
 * Both shells come from superellipsoid halves, rotated so the pole axis points up.
 */
export function buildSmartCase(M) {
  const root = new THREE.Group();
  root.name = 'smart-case';

  const bowlGeo = superEllipsoid({
    a: CASE.a, b: CASE.b, c: CASE.c, e1: 0.42, e2: 0.25, etaMin: -Math.PI / 2, etaMax: 0, nu: 40, nv: 96,
  });
  bowlGeo.rotateX(-Math.PI / 2);
  const bowl = new THREE.Mesh(bowlGeo, M.caseFabric);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  root.add(bowl);

  const lidGeo = superEllipsoid({
    a: CASE.a, b: CASE.b, c: CASE.c, e1: 0.42, e2: 0.25, etaMin: 0, etaMax: Math.PI / 2, nu: 40, nv: 96,
  });
  lidGeo.rotateX(-Math.PI / 2);
  lidGeo.translate(0, 0, CASE.b);
  const lid = new THREE.Mesh(lidGeo, M.caseFabric);
  lid.castShadow = true;
  lid.receiveShadow = true;
  const hinge = new THREE.Group();
  hinge.position.set(0, 0, -CASE.b);
  hinge.add(lid);
  root.add(hinge);

  return { root, hinge, bowl, lid };
}
