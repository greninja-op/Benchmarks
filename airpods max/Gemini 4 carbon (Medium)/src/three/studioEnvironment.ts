import * as THREE from 'three';

export interface StudioRig {
  envMap: THREE.Texture;
  lightGroup: THREE.Group;
  keyLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  bottomBounce: THREE.DirectionalLight;
  contactShadowMesh: THREE.Mesh;
  contactShadowMat: THREE.MeshBasicMaterial;
  dispose: () => void;
}

/**
 * Generates a high-dynamic-range Apple-style product photography studio environment
 * using PMREMGenerator and floating-point emissive softbox panels + dark negative-fill flags.
 * High contrast between bright softboxes and dark negative fill creates authentic silky
 * specular roll-off on bead-blasted anodized aluminum and mirror-polished stainless steel.
 */
export function createStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): StudioRig {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x1c1e24);

  // Studio cyclorama dome (soft neutral mid-gray gradient so metals never look pitch black)
  const domeGeo = new THREE.SphereGeometry(30, 48, 32);
  const domeColors: number[] = [];
  const pos = domeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / 30; // -1 to +1
    const t = THREE.MathUtils.clamp(ny * 0.5 + 0.5, 0, 1);
    const v = THREE.MathUtils.lerp(0.28, 0.72, Math.pow(t, 0.85));
    domeColors.push(v, v, v * 1.03);
  }
  domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(domeColors, 3));
  const domeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const addSoftbox = (
    w: number,
    h: number,
    position: [number, number, number],
    lookAt: [number, number, number],
    colorHex: number,
    intensity: number
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const c = new THREE.Color(colorHex).multiplyScalar(intensity);
    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    envScene.add(mesh);
  };

  // Overhead hero softbox (sculpts the headband arch & upper cup shoulders)
  addSoftbox(16, 10, [0, 14, 4], [0, 0, 0], 0xffffff, 5.2);

  // Tall left key strip-box (signature vertical specular band on curved aluminum cup)
  addSoftbox(6.5, 18, [-12, 3, 9], [0, 0, 0], 0xf8fbff, 6.0);

  // Tall right rim strip-box (highlights the Digital Crown knurling & right cup contour)
  addSoftbox(6.0, 18, [12.5, 3.5, 8], [0, 0, 0], 0xffffff, 5.6);

  // Back edge kicker softboxes for silhouette separation
  addSoftbox(14, 12, [-8, 6, -12], [0, 0, 0], 0xeaf2ff, 4.2);
  addSoftbox(14, 12, [8, 6, -12], [0, 0, 0], 0xfff8f2, 3.8);

  // Front subtle fill card
  addSoftbox(12, 8, [0, -1, 15], [0, 0, 0], 0xffffff, 2.1);

  // Dark negative-fill flags on outer flanks (essential for metallic edge contrast)
  addSoftbox(8, 18, [-15, 0, -1], [0, 0, 0], 0x090a0d, 1.0);
  addSoftbox(8, 18, [15, 0, -1], [0, 0, 0], 0x090a0d, 1.0);

  // Floor bounce reflector
  addSoftbox(22, 22, [0, -13, 0], [0, 0, 0], 0xe8ecf2, 1.85);

  const renderTarget = pmrem.fromScene(envScene, 0.035);
  const envMap = renderTarget.texture;
  scene.environment = envMap;

  // Clean up temporary envScene geometries
  domeGeo.dispose();
  domeMat.dispose();
  pmrem.dispose();

  // Dynamic real-time studio light rig (rotates/glides smoothly with scroll progress)
  const lightGroup = new THREE.Group();
  scene.add(lightGroup);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
  keyLight.position.set(4.5, 6.2, 5.8);
  lightGroup.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xf0f6ff, 1.55);
  rimLight.position.set(-5.2, 4.0, -4.5);
  lightGroup.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xfff9f5, 0.9);
  fillLight.position.set(-4.0, 1.5, 6.0);
  lightGroup.add(fillLight);

  const bottomBounce = new THREE.DirectionalLight(0xeef2f8, 0.55);
  bottomBounce.position.set(0, -6.0, 2.5);
  lightGroup.add(bottomBounce);

  // Soft radial studio contact shadow beneath the product
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(128, 128, 8, 128, 128, 124);
  grad.addColorStop(0, 'rgba(15, 18, 26, 0.36)');
  grad.addColorStop(0.42, 'rgba(15, 18, 26, 0.16)');
  grad.addColorStop(0.78, 'rgba(15, 18, 26, 0.03)');
  grad.addColorStop(1, 'rgba(15, 18, 26, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 256, 256);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.78,
  });
  const contactShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.5), contactShadowMat);
  contactShadowMesh.rotation.x = -Math.PI / 2;
  contactShadowMesh.position.set(0, -2.18, 0);
  scene.add(contactShadowMesh);

  return {
    envMap,
    lightGroup,
    keyLight,
    rimLight,
    fillLight,
    bottomBounce,
    contactShadowMesh,
    contactShadowMat,
    dispose: () => {
      renderTarget.dispose();
      shadowTex.dispose();
      contactShadowMesh.geometry.dispose();
      contactShadowMat.dispose();
    },
  };
}
