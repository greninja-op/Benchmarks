import * as THREE from 'three';
import type { ProceduralTextureSuite } from './proceduralTextures';

export interface SmartCaseRig {
  root: THREE.Group;
  flapPivot: THREE.Group;
  outerMaterial: THREE.MeshStandardMaterial;
  innerMaterial: THREE.MeshStandardMaterial;
  setOpenAmount: (open01: number) => void; // 0 = closed, 1 = wide open
  dispose: () => void;
}

/**
 * Builds the iconic contoured Apple AirPods Max Smart Case:
 * - Wraparound matte soft-touch shell with left/right ear-cup lobes & central vertical crease
 * - Curved bottom cutaway windows revealing the gleaming anodized aluminum lower rims
 * - Articulated magnetic top flap with embossed perimeter seam ridge
 */
export function createSmartCase(textures: ProceduralTextureSuite): SmartCaseRig {
  const root = new THREE.Group();
  root.name = 'SmartCaseRoot';

  const outerMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#dfe2e7'),
    roughness: 0.78,
    metalness: 0.04,
    normalMap: textures.smartCaseNormal,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughnessMap: textures.smartCaseRoughness,
  });

  const innerMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#cfd3da'),
    roughness: 0.94,
    metalness: 0.0,
    normalMap: textures.smartCaseNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    side: THREE.DoubleSide,
  });

  const geometries: THREE.BufferGeometry[] = [];

  /**
   * Sculpted wraparound twin-lobe front & back clamshell profile matching reference 1000227208.jpg
   * Outer width ≈ 2.26, height ≈ 1.24, depth ≈ 0.56 (cradles the two flat-swiveled ear cups cleanly)
   */
  const buildShellFace = (zSign: 1 | -1): THREE.Mesh => {
    const segU = 72;
    const segV = 28;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV; // 0 = bottom edge, 1 = top edge
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU; // 0 = far left, 1 = far right
        const sx = (u - 0.5) * 2.0; // -1..1
        const absX = Math.abs(sx);

        // Twin-lobe AirPods Max Smart Case silhouette:
        // Top line is relatively straight across the cups, outer sides flare into an iconic angled wing,
        // bottom dips into two rounded circular lobes separated by a central upward arch!
        const lobeCenter = 0.52;
        const lobeDist = Math.abs(absX - lobeCenter) / 0.52;
        const lobeRound = Math.sqrt(Math.max(0.0, 1.0 - Math.min(1.0, lobeDist * lobeDist)));

        // Top boundary curves gently down toward the outer wing tips
        const yTop = 0.49 - Math.pow(absX, 2.6) * 0.24;

        // Bottom boundary forms the two deep ear-cup lobes with a clean center bridge arch
        const centerNotch = Math.exp(-Math.pow(absX / 0.16, 2.0)) * 0.24;
        const outerSweep = Math.pow(Math.max(0, absX - 0.52) / 0.48, 1.45) * 0.54;
        const yBottom = -0.66 + centerNotch + outerSweep - lobeRound * 0.08;

        // Horizontal width narrows gently near bottom lobes and flares to the mid-height wing corners
        const midWing = Math.sin(v * Math.PI);
        const halfWidth = 0.96 + midWing * 0.22;
        const x = sx * halfWidth;
        const y = THREE.MathUtils.lerp(yBottom, yTop, v);

        // 3D depth sculpting: puffed softly around each ear cup lobe, pinched nicely at the center vertical crease,
        // and tapering smoothly to the outer wraparound seam!
        const edgeWrap = Math.sin(Math.min(1, Math.max(0, (1.0 - absX) * 1.15)) * Math.PI * 0.5);
        const verticalPuff = Math.sin(v * Math.PI);
        const cupDome =
          Math.exp(-Math.pow((absX - 0.46) / 0.42, 2.0)) * 0.16 * Math.pow(verticalPuff, 0.65);
        const centerCrease =
          zSign > 0
            ? Math.exp(-Math.pow(absX / 0.065, 2.0)) * (1.0 - v * 0.55) * 0.095
            : Math.exp(-Math.pow(absX / 0.08, 2.0)) * 0.04;

        const baseDepth = 0.145 * Math.pow(edgeWrap, 0.45) * (0.52 + 0.48 * verticalPuff);
        const z = zSign * (baseDepth + cupDome - centerCrease);

        positions.push(x, y, z);
        normals.push(0, 0, zSign);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;

        // Cut out iconic lower aluminum-reveal crescent slots along the front & back lower lobe arcs
        const uMid = (iu + 0.5) / segU;
        const vMid = (iv + 0.5) / segV;
        const absX = Math.abs((uMid - 0.5) * 2.0);
        const isCutout =
          vMid > 0.055 &&
          vMid < 0.155 &&
          absX > 0.18 &&
          absX < 0.78 &&
          Math.abs(vMid - (0.095 + Math.pow((absX - 0.48) / 0.34, 2.0) * 0.045)) < 0.036;

        if (!isCutout) {
          if (zSign > 0) {
            indices.push(a, b, d, a, d, c);
          } else {
            indices.push(a, d, b, a, c, d);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geometries.push(geo);

    const mesh = new THREE.Mesh(geo, outerMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const frontShell = buildShellFace(1);
  const backShell = buildShellFace(-1);
  root.add(frontShell, backShell);

  // Inner microfiber lining (slightly recessed behind front & back shells so cutouts show authentic layered thickness)
  const frontLining = frontShell.clone();
  frontLining.material = innerMaterial;
  frontLining.scale.set(0.985, 0.985, 0.86);
  const backLining = backShell.clone();
  backLining.material = innerMaterial;
  backLining.scale.set(0.985, 0.985, 0.86);
  root.add(frontLining, backLining);

  // Side gusset & bottom lobe curved edge-binding trim uniting front & back shells cleanly
  const buildEdgeGusset = () => {
    const segs = 96;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs; // goes around left side -> bottom lobes -> right side
      const sx = -1.0 + t * 2.0;
      const absX = Math.abs(sx);
      const lobeDist = Math.abs(absX - 0.52) / 0.52;
      const lobeRound = Math.sqrt(Math.max(0.0, 1.0 - Math.min(1.0, lobeDist * lobeDist)));
      const centerNotch = Math.exp(-Math.pow(absX / 0.16, 2.0)) * 0.24;
      const outerSweep = Math.pow(Math.max(0, absX - 0.52) / 0.48, 1.45) * 0.54;
      const yBottom = -0.66 + centerNotch + outerSweep - lobeRound * 0.08;
      pts.push(new THREE.Vector3(sx * 0.99, yBottom, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 96, 0.068, 14, false);
    tubeGeo.scale(1.0, 1.0, 2.15);
    geometries.push(tubeGeo);
    const mesh = new THREE.Mesh(tubeGeo, outerMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  root.add(buildEdgeGusset());

  // Articulated Magnetic Top Flap (hinged at the top-rear spine so it folds cleanly over the front!)
  const flapPivot = new THREE.Group();
  flapPivot.name = 'SmartCaseFlapPivot';
  flapPivot.position.set(0, 0.50, -0.12);
  root.add(flapPivot);

  const buildMagneticFlap = () => {
    const flapGroup = new THREE.Group();

    // Top horizontal bridge spanning from back spine (+0) to front bend (+0.44)
    const bridgeGeo = new THREE.BoxGeometry(1.08, 0.034, 0.44);
    geometries.push(bridgeGeo);
    const bridge = new THREE.Mesh(bridgeGeo, outerMaterial);
    bridge.position.set(0, 0.015, 0.22);
    bridge.castShadow = true;
    flapGroup.add(bridge);

    // Smooth curved spine bend at the front lip
    const bendGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.08, 18, 1, false, 0, Math.PI * 0.5);
    bendGeo.rotateZ(Math.PI * 0.5);
    geometries.push(bendGeo);
    const bend = new THREE.Mesh(bendGeo, outerMaterial);
    bend.position.set(0, -0.015, 0.41);
    flapGroup.add(bend);

    // Iconic wide rounded-rectangle magnetic front tongue (matches 1000227208.jpg)
    const w = 0.54;
    const h = 0.47;
    const r = 0.18;
    const shape = new THREE.Shape();
    shape.moveTo(-w, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, -h + r);
    shape.absarc(w - r, -h + r, r, 0, -Math.PI * 0.5, true);
    shape.lineTo(-w + r, -h);
    shape.absarc(-w + r, -h + r, r, -Math.PI * 0.5, -Math.PI, true);
    shape.closePath();

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.012,
      bevelSegments: 5,
      curveSegments: 24,
    });
    geometries.push(extrudeGeo);

    const tongue = new THREE.Mesh(extrudeGeo, outerMaterial);
    tongue.position.set(0, -0.015, 0.425);
    tongue.rotation.x = -0.04;
    tongue.castShadow = true;
    tongue.receiveShadow = true;
    flapGroup.add(tongue);

    // Subtle embossed perimeter stitch/heat-seal line inset inside the flap tongue
    const inset = 0.036;
    const seamPts: THREE.Vector3[] = [];
    const ri = r - inset;
    const wi = w - inset;
    const hi = h - inset;
    seamPts.push(new THREE.Vector3(-wi, -0.01, 0.459));
    seamPts.push(new THREE.Vector3(-wi, -hi + ri, 0.459));
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI * 0.5;
      seamPts.push(new THREE.Vector3(-wi + ri + Math.cos(a) * ri, -hi + ri + Math.sin(a) * ri, 0.459));
    }
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 1.5 + (i / 12) * Math.PI * 0.5;
      seamPts.push(new THREE.Vector3(wi - ri + Math.cos(a) * ri, -hi + ri + Math.sin(a) * ri, 0.459));
    }
    seamPts.push(new THREE.Vector3(wi, -0.01, 0.459));

    const seamCurve = new THREE.CatmullRomCurve3(seamPts);
    const seamGeo = new THREE.TubeGeometry(seamCurve, 64, 0.0055, 8, false);
    geometries.push(seamGeo);
    const seamMat = innerMaterial;
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.position.set(0, -0.015, 0.0);
    seam.rotation.x = -0.04;
    flapGroup.add(seam);

    return flapGroup;
  };

  flapPivot.add(buildMagneticFlap());

  const setOpenAmount = (open01: number) => {
    const clamped = Math.max(0, Math.min(1, open01));
    // Smoothly swings open backward (-135 degrees) so headphones glide cleanly into the case
    flapPivot.rotation.x = -clamped * Math.PI * 0.76;
  };

  return {
    root,
    flapPivot,
    outerMaterial,
    innerMaterial,
    setOpenAmount,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      outerMaterial.dispose();
      innerMaterial.dispose();
    },
  };
}
