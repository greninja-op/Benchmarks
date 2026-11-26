// Custom studio HDRI: gradient cyclorama + emissive softboxes, prefiltered with PMREM.
import * as THREE from 'three';

export function buildStudioEnv(renderer) {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(60, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        void main(){
          float y = vDir.y;
          vec3 top = vec3(0.95, 0.955, 0.965);
          vec3 mid = vec3(0.55, 0.56, 0.58);
          vec3 bot = vec3(0.16, 0.16, 0.17);
          vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.65)) : mix(mid, bot, pow(-y, 0.55));
          // subtle horizon band like a studio sweep
          c += vec3(0.25) * exp(-pow(y * 9.0, 2.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  scene.add(dome);

  const box = (w, h, pos, intensity, color = 0xffffff) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(36, 22, [0, 32, 0], 2.4);                 // overhead softbox
  box(12, 34, [-30, 6, 14], 5.0);               // key softbox, camera-left
  box(4, 42, [28, 4, -6], 7.5);                 // hard strip, right
  box(4, 40, [18, 4, 24], 3.2);                 // front-right strip
  box(30, 5, [0, 14, -30], 4.5, 0xf4f7ff);      // cool rim / kicker
  box(40, 9, [0, -3, 34], 1.0);                 // front fill
  box(6, 30, [-22, 2, -20], 3.0, 0xfff6ec);     // warm back-left kicker

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  return rt.texture;
}
