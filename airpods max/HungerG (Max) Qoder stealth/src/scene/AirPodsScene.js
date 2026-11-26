import * as THREE from 'three';
import { COLORWAYS, createAirPodsMax } from './model';

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function smoothstep(min, max, value) {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

function range(min, max, value) {
  return clamp((value - min) / (max - min), 0, 1);
}

const CAMERA_KEYS = [
  { p: 0, position: [8.7, 3.25, 12.3], target: [0, 0.55, 0], fov: 31, rootX: 0.65, rootY: 0, rotation: -0.12 },
  { p: 0.12, position: [7.9, 2.9, 11.7], target: [0.15, 0.48, 0], fov: 31, rootX: 0.45, rootY: 0, rotation: 0.2 },
  { p: 0.26, position: [6.4, 2.15, 10.7], target: [0.3, 0.42, 0], fov: 31, rootX: 0.15, rootY: 0, rotation: 0.48 },
  { p: 0.35, position: [4.05, 2.05, 3.55], target: [2.28, 0.72, 0.32], fov: 27, rootX: -0.5, rootY: 0, rotation: 0.04 },
  { p: 0.44, position: [4.45, 2.2, 4.25], target: [2.15, 0.55, 0.25], fov: 28, rootX: -0.5, rootY: 0, rotation: -0.04 },
  { p: 0.51, position: [3.7, 4.5, 5.9], target: [0.2, 2.72, 0], fov: 30, rootX: -0.2, rootY: 0, rotation: -0.3 },
  { p: 0.58, position: [0.55, 1.15, 7.7], target: [0, -0.25, 0], fov: 31, rootX: 0, rootY: 0, rotation: -0.08 },
  { p: 0.72, position: [6.8, 2.4, 12.8], target: [2.25, -0.15, 0], fov: 33, rootX: 0, rootY: 0, rotation: -0.55 },
  { p: 0.88, position: [6.8, 3.8, 11.6], target: [0, -1.15, 0], fov: 32, rootX: 0, rootY: 0, rotation: -0.12 },
  { p: 1, position: [6.2, 3.2, 12.7], target: [0, -1.55, 0], fov: 31, rootX: 0, rootY: -0.2, rotation: 0 },
];

function sampleCamera(progress) {
  let left = CAMERA_KEYS[0];
  let right = CAMERA_KEYS[CAMERA_KEYS.length - 1];
  for (let i = 0; i < CAMERA_KEYS.length - 1; i += 1) {
    if (progress >= CAMERA_KEYS[i].p && progress <= CAMERA_KEYS[i + 1].p) {
      left = CAMERA_KEYS[i];
      right = CAMERA_KEYS[i + 1];
      break;
    }
  }
  const t = smoothstep(left.p, right.p, progress);
  return {
    position: new THREE.Vector3(...left.position).lerp(new THREE.Vector3(...right.position), t),
    target: new THREE.Vector3(...left.target).lerp(new THREE.Vector3(...right.target), t),
    fov: lerp(left.fov, right.fov, t),
    rootX: lerp(left.rootX, right.rootX, t),
    rootY: lerp(left.rootY, right.rootY, t),
    rotation: lerp(left.rotation, right.rotation, t),
  };
}

function createStudioEnvironment(renderer) {
  const environment = new THREE.Scene();
  environment.background = new THREE.Color('#777b80');
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(24, 24, 24),
    new THREE.MeshBasicMaterial({ color: '#777b80', side: THREE.BackSide }),
  );
  environment.add(room);
  const softboxes = [
    { size: [8, 10], position: [6, 7, 5], color: '#ffffff', intensity: 5 },
    { size: [5, 9], position: [-7, 4, 2], color: '#e9f2ff', intensity: 4 },
    { size: [9, 4], position: [0, 9, -4], color: '#ffffff', intensity: 5 },
    { size: [3, 8], position: [3, 2, -8], color: '#fff4e8', intensity: 3 },
  ];
  for (const box of softboxes) {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(box.color).multiplyScalar(box.intensity) });
    const light = new THREE.Mesh(new THREE.PlaneGeometry(...box.size), material);
    light.position.set(...box.position);
    light.lookAt(0, 0, 0);
    environment.add(light);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  generator.compileCubemapShader();
  const target = generator.fromScene(environment, 0.035);
  generator.dispose();
  environment.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      object.material.dispose();
    }
  });
  return target;
}

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 126);
  gradient.addColorStop(0, 'rgba(15,18,22,0.28)');
  gradient.addColorStop(0.38, 'rgba(15,18,22,0.14)');
  gradient.addColorStop(1, 'rgba(15,18,22,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export class AirPodsExperience {
  constructor(canvas, { onFrame, onColorChange, onReady } = {}) {
    this.canvas = canvas;
    this.onFrame = onFrame;
    this.onColorChange = onColorChange;
    this.onReady = onReady;
    this.progress = 0;
    this.targetProgress = 0;
    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.manualColor = false;
    this.colorIndex = 0;
    this.disposed = false;
    this.lastTime = performance.now();
    this.elapsed = 0;
    this.frameCount = 0;
    this.frameSampleCount = 0;
    this.frameDurationTotal = 0;
    this.qualityReduced = false;
    this.width = 1;
    this.height = 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.5 : 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setClearColor('#f2f1ee', 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(31, 1, 0.08, 80);
    this.camera.position.set(...CAMERA_KEYS[0].position);
    this.environment = createStudioEnvironment(this.renderer);
    this.scene.environment = this.environment.texture;

    this.keyLight = new THREE.DirectionalLight('#fff8f0', 3.8);
    this.keyLight.position.set(5, 8, 7);
    this.keyLight.castShadow = true;
    const shadowSize = window.innerWidth < 760 ? 1024 : 2048;
    this.keyLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.keyLight.shadow.camera.left = -8;
    this.keyLight.shadow.camera.right = 8;
    this.keyLight.shadow.camera.top = 8;
    this.keyLight.shadow.camera.bottom = -8;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 28;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.025;
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.DirectionalLight('#d9eaff', 2.8);
    this.rimLight.position.set(-6, 4, -5);
    this.scene.add(this.rimLight);
    this.fillLight = new THREE.DirectionalLight('#ffffff', 1.15);
    this.fillLight.position.set(-3, 1, 7);
    this.scene.add(this.fillLight);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#a7a39b', 1.35));

    this.model = createAirPodsMax();
    this.scene.add(this.model.root);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ color: '#34383d', opacity: 0.16 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -4.46;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 6),
      new THREE.MeshBasicMaterial({ map: createShadowTexture(), transparent: true, depthWrite: false, opacity: 0.72 }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.set(0, -4.44, 0);
    this.scene.add(this.contactShadow);

    this.targetColor = new THREE.Color(COLORWAYS[0].aluminum);
    this.targetTextile = new THREE.Color(COLORWAYS[0].textile);
    this.targetCase = new THREE.Color(COLORWAYS[0].case);
    this.projected = new THREE.Vector3();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.handlePointer = (event) => {
      this.pointerTarget.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2,
      );
    };
    window.addEventListener('pointermove', this.handlePointer, { passive: true });
    this.resize();
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
    requestAnimationFrame(() => this.onReady?.());
  }

  setProgress(value) {
    this.targetProgress = clamp(value, 0, 1);
  }

  setColorway(index, manual = true) {
    const next = clamp(Math.round(index), 0, COLORWAYS.length - 1);
    if (manual) this.manualColor = true;
    if (next === this.colorIndex && this.targetColor) return;
    this.colorIndex = next;
    const colorway = COLORWAYS[next];
    this.targetColor.set(colorway.aluminum);
    this.targetTextile.set(colorway.textile);
    this.targetCase.set(colorway.case);
    this.onColorChange?.(next);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  updateModel(progress, delta) {
    const { root, left, right, headband, arms, smartCase } = this.model;
    const key = sampleCamera(progress);
    const pointerStrength = this.reducedMotion ? 0 : 1;
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-delta * 3.5));
    root.position.set(
      key.rootX * (this.width < 700 ? 0.1 : 1) + this.pointer.x * 0.045 * pointerStrength,
      key.rootY - this.pointer.y * 0.025 * pointerStrength,
      0,
    );
    root.rotation.set(
      -0.025 + this.pointer.y * 0.012 * pointerStrength,
      key.rotation + this.pointer.x * 0.025 * pointerStrength,
      0,
    );

    const detach = smoothstep(0.58, 0.645, progress) * (1 - smoothstep(0.675, 0.72, progress));
    const explode = smoothstep(0.72, 0.795, progress) * (1 - smoothstep(0.845, 0.89, progress));
    const fold = smoothstep(0.885, 0.935, progress);
    const caseIn = smoothstep(0.875, 0.915, progress);
    const caseDrop = smoothstep(0.925, 0.968, progress);
    const closeFlap = smoothstep(0.968, 0.996, progress);

    for (const side of [-1, 1]) {
      const cup = side > 0 ? right : left;
      cup.cup.position.set(
        side * (2.25 - 0.95 * fold) + (side > 0 ? explode * 1.2 : 0),
        -0.63 - 2.45 * fold - caseDrop * 0.18,
        0.24 * fold,
      );
      cup.cup.rotation.set(
        0,
        side * 0.045 * (1 - fold) - (side > 0 ? explode * 0.2 : 0),
        side * (Math.PI / 2) * fold + side * 0.018 * (1 - fold),
      );
      cup.cup.scale.setScalar(1 - fold * 0.25);
      cup.cushion.position.set(
        -side * (0.67 + detach * 1.06 + (side > 0 ? explode * 3.4 : 0)),
        detach * 0.12,
        side * detach * 0.48,
      );
      cup.cushion.rotation.set(0, side * detach * 0.36, side * detach * 0.05);
      cup.magnetRing.visible = detach > 0.04 || (side > 0 && explode > 0.04);
    }

    right.shell.position.x = explode * 3.2;
    right.rear.position.x = explode * 4.0;
    right.baffle.position.x = -0.39 - explode * 2.2;
    right.acoustic.position.x = -0.465 - explode * 2.8;
    right.driver.position.x = 0.08 + explode * 0.58;
    right.electronics.position.x = 0.27 - explode * 1.0;
    if (right.crown) right.crown.position.x = 0.61 + explode * 3.2;
    right.crown.rotation.x = smoothstep(0.28, 0.405, progress) * Math.PI * 3.2;

    headband.group.scale.y = 1 - fold * 0.75;
    headband.group.position.y = -fold * 2.8;
    arms.scale.y = 1 - fold * 0.75;
    arms.position.y = -fold * 2.8;
    const scale = 1 - fold * 0.16;
    root.scale.setScalar(scale);

    smartCase.group.visible = progress > 0.865;
    smartCase.group.position.y = -(1 - caseIn) * 1.7;
    smartCase.group.scale.setScalar(scale * (0.92 + caseIn * 0.08));
    smartCase.flapPivot.rotation.x = 1.65 * (1 - closeFlap);
    smartCase.inner.visible = closeFlap < 0.72;
    smartCase.flapInner.visible = closeFlap < 0.72;
    const headphonesVisible = closeFlap < 0.985;
    headband.group.visible = headphonesVisible;
    arms.visible = headphonesVisible;
    left.cup.visible = headphonesVisible;
    right.cup.visible = headphonesVisible;

    const colorEase = 1 - Math.exp(-delta * 5.5);
    for (const entry of this.model.colorEntries) {
      const target = entry.key === 'aluminum' ? this.targetColor : entry.key === 'textile' ? this.targetTextile : this.targetCase;
      entry.material.color.lerp(target, colorEase);
    }

    this.camera.position.copy(key.position);
    this.camera.fov = key.fov + (this.width < 700 ? 18 : 0);
    this.camera.updateProjectionMatrix();
    const target = key.target.clone();
    if (this.width < 700 && progress < 0.26) target.y += 0.55;
    if (this.width < 700 && progress > 0.88) target.y -= 0.25;
    this.camera.lookAt(target);
  }

  updateLights(progress) {
    const idle = this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.32);
    this.keyLight.position.set(5 + progress * 3 + idle * 1.2, 8 - progress * 1.4, 7 - progress * 2.2);
    this.rimLight.position.set(-6 + progress * 2 - idle, 4 + progress * 1.8, -5 + Math.cos(this.elapsed * 0.24) * 1.2);
    this.keyLight.intensity = 3.8 + Math.sin(progress * Math.PI) * 0.45;
    this.rimLight.intensity = 2.8 + Math.sin(progress * Math.PI) * 0.65;
    this.contactShadow.material.opacity = 0.72 - smoothstep(0.26, 0.44, progress) * 0.35;
  }

  projectAnchors() {
    const result = {};
    this.model.root.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
    for (const [name, object] of Object.entries(this.model.anchors)) {
      object.getWorldPosition(this.projected);
      this.projected.project(this.camera);
      result[name] = {
        x: (this.projected.x * 0.5 + 0.5) * this.width,
        y: (-this.projected.y * 0.5 + 0.5) * this.height,
        visible: this.projected.z > -1 && this.projected.z < 1,
      };
    }
    return result;
  }

  animate(now) {
    if (this.disposed) return;
    const rawDelta = (now - this.lastTime) / 1000;
    const delta = Math.min(rawDelta, 0.25);
    this.lastTime = now;
    this.elapsed += delta;
    this.frameCount += 1;
    if (rawDelta < 0.5) {
      this.frameSampleCount += 1;
      this.frameDurationTotal += rawDelta;
    }
    if (!this.qualityReduced && this.elapsed > 2.5 && this.frameSampleCount > 20) {
      const averageFrame = this.frameDurationTotal / this.frameSampleCount;
      if (averageFrame > 0.032) {
        this.qualityReduced = true;
        this.renderer.setPixelRatio(1);
        this.keyLight.shadow.mapSize.set(1024, 1024);
        this.keyLight.shadow.map?.dispose();
        this.keyLight.shadow.map = null;
        if (averageFrame > 0.07) this.renderer.shadowMap.enabled = false;
        this.resize();
      }
    }
    this.progress = THREE.MathUtils.damp(this.progress, this.targetProgress, this.reducedMotion ? 30 : 6.5, delta);
    if (!this.manualColor && this.progress >= 0.12 && this.progress < 0.26) {
      const index = Math.min(4, Math.floor(range(0.12, 0.26, this.progress) * 5));
      this.setColorway(index, false);
    }
    this.updateModel(this.progress, delta);
    this.updateLights(this.progress);
    if (this.renderer.shadowMap.enabled && this.frameCount % 2 === 0) this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(this.projectAnchors(), this.progress);
    this.frame = requestAnimationFrame(this.animate);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    window.removeEventListener('pointermove', this.handlePointer);
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
    this.environment.dispose();
    this.renderer.dispose();
  }
}
