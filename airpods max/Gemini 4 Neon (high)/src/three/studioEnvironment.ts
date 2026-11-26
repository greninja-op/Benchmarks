import * as THREE from 'three';

export interface StudioRig {
  envTexture: THREE.Texture;
  keyLight: THREE.DirectionalLight;
  rimLightA: THREE.DirectionalLight;
  rimLightB: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  ambientLight: THREE.HemisphereLight;
  updateDynamicLighting: (progress: number, timeSec: number) => void;
  dispose: () => void;
}

/**
 * Generates an Apple-grade photography studio HDRI via PMREMGenerator.
 * Uses crisp softbox strips, overhead diffuser banks, and negative-fill dark cards
 * so anodized aluminum cups catch silky, high-contrast metallic specular sweeps.
 */
function buildStudioEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x1e2128);

  // Gradient dome for clean studio cyclorama ambient reflection
  const domeGeo = new THREE.SphereGeometry(28, 32, 24);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0xf6f8fc) },
      horizonColor: { value: new THREE.Color(0xd2d7e0) },
      bottomColor: { value: new THREE.Color(0x3a3e47) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = normalize(wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = vWorldPos.y;
        vec3 col = h >= 0.0
          ? mix(horizonColor, topColor, pow(h, 0.55))
          : mix(horizonColor, bottomColor, pow(-h, 0.65));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const addSoftbox = (
    w: number,
    h: number,
    colorHex: number,
    intensity: number,
    pos: [number, number, number],
    lookAt: [number, number, number] = [0, 0, 0]
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const col = new THREE.Color(colorHex).multiplyScalar(intensity);
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    envScene.add(mesh);
  };

  // Overhead master diffuser bank (gives top edge of headband & aluminum shoulders a crisp bright roll-off)
  addSoftbox(14, 9, 0xffffff, 2.5, [0, 12, 2]);
  // Primary left vertical strip softbox (creates classic Apple vertical specular highlight band on ear cups)
  addSoftbox(5.5, 16, 0xf8fbff, 3.2, [-13, 3, 9]);
  // Right warm-neutral key strip softbox
  addSoftbox(6.5, 15, 0xfff8f0, 2.7, [13, 4, 8]);
  // Rear-top rim strip (illuminates chrome telescoping arms & Digital Crown knurling edges)
  addSoftbox(14, 4.5, 0xeef5ff, 3.4, [0, 8, -13]);
  // Low front bounce fill card
  addSoftbox(12, 4, 0xf2f4f8, 1.35, [0, -7, 11]);

  // Negative-fill dark cards (essential for realistic metallic contrast on anodized aluminum & chrome!)
  addSoftbox(5, 14, 0x0b0d12, 1.0, [-9, 0, 13]);
  addSoftbox(5, 14, 0x0b0d12, 1.0, [9, -1, 13]);
  addSoftbox(16, 6, 0x14171e, 1.0, [0, -11, 0]);

  const rt = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();
  domeGeo.dispose();
  domeMat.dispose();

  return rt.texture;
}

export function createStudioRig(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): StudioRig {
  const envTexture = buildStudioEnvironmentMap(renderer);
  scene.environment = envTexture;
  scene.environmentIntensity = 1.18;

  const ambientLight = new THREE.HemisphereLight(0xf6f8fc, 0x8e95a3, 0.55);
  scene.add(ambientLight);

  // Primary directional studio key light
  const keyLight = new THREE.DirectionalLight(0xfffcf8, 1.85);
  keyLight.position.set(4.5, 6.2, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 22;
  keyLight.shadow.camera.left = -3.5;
  keyLight.shadow.camera.right = 3.5;
  keyLight.shadow.camera.top = 3.5;
  keyLight.shadow.camera.bottom = -3.5;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.015;
  scene.add(keyLight);

  // Dynamic sweeping rim light A (cool silver-white studio edge)
  const rimLightA = new THREE.DirectionalLight(0xdcebff, 1.45);
  rimLightA.position.set(-5.8, 3.6, -4.2);
  scene.add(rimLightA);

  // Dynamic sweeping rim light B (warm-balanced accent for anodized highlights)
  const rimLightB = new THREE.DirectionalLight(0xfff1e2, 0.95);
  rimLightB.position.set(5.2, -1.2, -4.5);
  scene.add(rimLightB);

  // Soft front fill so inner acoustic mesh and knit texture always read clearly
  const fillLight = new THREE.DirectionalLight(0xf3f6fc, 0.65);
  fillLight.position.set(-2.5, 1.5, 6.0);
  scene.add(fillLight);

  const updateDynamicLighting = (progress: number, timeSec: number) => {
    // Sweep key and rim lights gracefully across the curved anodized aluminum as user scrolls
    const sweepAngle = progress * Math.PI * 2.6 + Math.sin(timeSec * 0.35) * 0.12;
    const macroBoost =
      progress > 0.25 && progress < 0.46
        ? Math.sin(((progress - 0.25) / 0.21) * Math.PI)
        : 0;

    keyLight.position.set(
      Math.cos(sweepAngle * 0.65) * 5.6 + macroBoost * 1.4,
      5.4 + Math.sin(sweepAngle * 0.8) * 1.5,
      5.0 + Math.sin(sweepAngle * 0.5) * 1.8
    );
    keyLight.intensity = 1.8 + macroBoost * 0.55;

    // Rim light glides tightly around the Digital Crown & anodized shoulder during macro zoom
    const rimAngle = -sweepAngle * 0.9 + 1.1;
    rimLightA.position.set(
      Math.cos(rimAngle) * 6.0,
      3.5 + Math.cos(sweepAngle) * 1.8,
      Math.sin(rimAngle) * 5.4
    );
    rimLightA.intensity = 1.4 + macroBoost * 0.65;

    rimLightB.position.set(
      -Math.cos(rimAngle * 0.7) * 5.2,
      -0.8 + Math.sin(sweepAngle * 1.2) * 1.6,
      -4.2 + Math.cos(rimAngle) * 1.5
    );
  };

  return {
    envTexture,
    keyLight,
    rimLightA,
    rimLightB,
    fillLight,
    ambientLight,
    updateDynamicLighting,
    dispose: () => {
      envTexture.dispose();
    },
  };
}
