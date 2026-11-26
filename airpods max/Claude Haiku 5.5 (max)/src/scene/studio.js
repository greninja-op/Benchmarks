import * as THREE from 'three';

/**
 * Studio environment built from emissive lightformers (softboxes, rim strips, floor bounce).
 * PMREM prefilters the scene into an environment map, so no HDR file is downloaded.
 */
export function createStudioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0.1, 0.1, 0.11);
  const panel = (w, h, rgb, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0], rgb[1], rgb[2]), side: THREE.DoubleSide }),
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(10, 7, [5.0, 4.9, 4.8], [-14, 10, 16]); // key softbox
  panel(8, 6, [1.8, 1.9, 2.1], [16, 4, 12]); // fill
  panel(22, 22, [1.1, 1.1, 1.1], [0, 22, 0]); // overhead diffuser
  panel(2.2, 18, [6.5, 6.5, 6.5], [-18, 2, -6]); // rim strip left
  panel(2.2, 18, [6.5, 6.5, 6.5], [18, 2, -6]); // rim strip right
  panel(40, 40, [0.12, 0.12, 0.13], [0, -12, 0]); // dim floor bounce

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035, 0.1, 100);
  pmrem.dispose();
  return rt.texture;
}

/** Key, rim and fill directional lights. The key casts the soft product shadow. */
export function createStudioLights(scene, shadowSize) {
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 140 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0xdfe8ff, 2.2);
  const fill = new THREE.DirectionalLight(0xfff3e6, 0.6);
  scene.add(key, key.target, rim, rim.target, fill, fill.target);
  return { key, rim, fill };
}

function placeOnSphere(light, az, el, dist) {
  light.position.set(
    Math.sin(az) * Math.cos(el) * dist,
    Math.sin(el) * dist + 2,
    Math.cos(az) * Math.cos(el) * dist,
  );
}

/** Key and rim lights orbit the product, so specular highlights glide across the cups while scrolling. */
export function animateLights(lights, p, t) {
  const az = -0.8 + p * 2.6;
  placeOnSphere(lights.key, az, 0.55 + 0.12 * Math.sin(p * 3.1 + 0.4), 60);
  placeOnSphere(lights.rim, az + Math.PI * 0.82 + 0.25 * Math.sin(t * 0.3), 0.25 + 0.08 * Math.cos(p * 4), 60);
  placeOnSphere(lights.fill, az - Math.PI * 0.5, 0.15, 60);
}
