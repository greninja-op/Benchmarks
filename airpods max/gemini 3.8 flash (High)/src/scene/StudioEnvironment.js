import * as THREE from 'three';
import { createStudioEnvironmentTexture } from './ProceduralTextures.js';

/**
 * StudioEnvironment
 * Creates Apple-grade studio lighting with dynamic specular highlights,
 * soft rim grazing lights, and a realistic contact shadow floor.
 */
export function setupStudioEnvironment(scene, renderer) {
  // 1. Generate Studio HDRI Environment Map
  const envMap = createStudioEnvironmentTexture(renderer);
  scene.environment = envMap;

  // 2. Key Softbox Light (Upper Front Right)
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(3.5, 4.2, 4.0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 15;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);

  // 3. Fill Softbox Light (Upper Front Left - cooler tone)
  const fillLight = new THREE.DirectionalLight(0xe8f0ff, 1.4);
  fillLight.position.set(-3.5, 3.2, 3.0);
  scene.add(fillLight);

  // 4. Dynamic Rim / Edge Light (Behind & below to trace the curved aluminum chamfer)
  const rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
  rimLight.position.set(0, 2.5, -4.0);
  scene.add(rimLight);

  // 5. Specular Glint Light (Follows camera / scroll to sweep highlights across aluminum)
  const glintLight = new THREE.PointLight(0xffffff, 1.8, 12, 1.5);
  glintLight.position.set(1.5, 1.5, 2.5);
  scene.add(glintLight);

  // 6. Ambient Baseline Fill
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  // 7. Ground Contact Shadow Receiver
  const shadowGeo = new THREE.PlaneGeometry(10, 10);
  const shadowMat = new THREE.ShadowMaterial({
    opacity: 0.16
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.25;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  /**
   * Update dynamic lighting during scroll
   */
  function updateLighting(scrollProgress, time) {
    // Dynamic light shifting across scroll progress
    // As the user scrolls, the key and rim lights sweep around the anodized cups
    const angle = scrollProgress * Math.PI * 2.2 + Math.sin(time * 0.4) * 0.2;
    keyLight.position.x = Math.cos(angle) * 4.0;
    keyLight.position.z = Math.sin(angle) * 3.5 + 1.5;

    rimLight.position.x = -Math.cos(angle) * 3.8;
    rimLight.position.z = -Math.sin(angle) * 3.8;

    glintLight.position.x = Math.sin(angle * 1.5) * 2.2;
    glintLight.position.y = 0.8 + Math.cos(angle) * 0.6;
  }

  return {
    keyLight,
    fillLight,
    rimLight,
    glintLight,
    shadowPlane,
    updateLighting
  };
}
