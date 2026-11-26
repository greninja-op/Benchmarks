// Studio HDRI built in code (PMREM of emissive softboxes) + animated key / rim lights.
import * as THREE from 'three';

export function createStudio(renderer, scene) {
  const env = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(50, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 top = vec3(1.05), hor = vec3(0.42), bot = vec3(0.16);
          vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.8)) : mix(hor, bot, pow(-h, 0.5));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  env.add(dome);
  const box = (w, h, intensity, pos, tint = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  box(22, 22, 5.5, [0, 22, 2]);           // overhead softbox
  box(5, 26, 9, [-20, 3, 8]);             // left strip
  box(5, 26, 7, [20, 4, -6], 0xeef4ff);   // right rim strip
  box(34, 5, 3.2, [0, 1.5, 24]);          // front fill band
  box(34, 4, 1.8, [4, -1, -24]);          // back kicker
  box(8, 8, 4, [14, 10, 16]);             // key highlight
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035);
  scene.environment = rt.texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 20 });
  key.shadow.bias = -0.0002; key.shadow.radius = 14; key.shadow.blurSamples = 20;
  const rim = new THREE.DirectionalLight(0xdfe9ff, 1.1);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a90, 0.35);
  scene.add(key, key.target, rim, rim.target, hemi);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.9; ground.receiveShadow = true;
  scene.add(ground);

  return {
    ground,
    update(S) {
      scene.environmentRotation.set(0, S.envRot, 0);
      const a = S.lightAz;
      key.position.set(Math.sin(a) * 1.2, 8, Math.cos(a) * 1.2);
      rim.position.set(Math.sin(a + 2.6) * 6, 2.5, Math.cos(a + 2.6) * 6);
      ground.material.opacity = 0.16 * (1 - S.dark);
      const c = Math.min(1, S.caseRise * 1.4);
      ground.position.y = -0.56 + (-0.8 + 0.56) * c * c * (3 - 2 * c);
    },
  };
}
