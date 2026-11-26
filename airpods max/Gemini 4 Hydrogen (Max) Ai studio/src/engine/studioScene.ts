import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { AirPodsColorway } from '../data/airpodsSpec';
import { buildAirPodsMaxRig, type AirPodsAnchors } from './airpodsModel';
import { computeChoreographyState, type ChoreographyState } from './choreography';
import { createProceduralTexturePack } from './textures';

export interface ProjectedAnchor {
  x: number;
  y: number;
  visible: boolean;
}

export type ProjectedAnchorsMap = Record<keyof AirPodsAnchors, ProjectedAnchor>;

export interface StudioFramePayload {
  state: ChoreographyState;
  anchors: ProjectedAnchorsMap;
  width: number;
  height: number;
}

export interface StudioSceneController {
  setTargetScroll: (progress: number) => void;
  setColorway: (colorway: AirPodsColorway) => void;
  setFreeOrbit: (enabled: boolean) => void;
  setPointerTilt: (nx: number, ny: number) => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
}

const _projVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetCamLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createStudioScene(
  container: HTMLElement,
  initialColorway: AirPodsColorway,
  onFrame: (payload: StudioFramePayload) => void,
  onContextLost?: (lost: boolean) => void,
): StudioSceneController {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.dataset.testid = 'airpods-webgl-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // Clean Apple minimalist studio backdrop (#f5f5f7) with subtle distance blend
  const studioBg = new THREE.Color('#f5f5f7');
  scene.background = studioBg;
  scene.fog = new THREE.Fog('#f5f5f7', 6.5, 14.0);

  // Studio Environment Reflections (PMREMGenerator + RoomEnvironment)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envRenderTarget.texture;
  roomEnv.dispose();
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 30);
  camera.position.set(0.55, 0.14, 3.35);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 0.85;
  controls.maxDistance = 5.5;
  controls.enabled = false;

  // --- Studio 3-Point + Softbox Lighting Rig ---
  const hemiLight = new THREE.HemisphereLight('#e4edfa', '#ececef', 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight('#fff8ef', 2.15);
  keyLight.position.set(2.8, 3.4, 3.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 12;
  keyLight.shadow.camera.left = -2.2;
  keyLight.shadow.camera.right = 2.2;
  keyLight.shadow.camera.top = 2.2;
  keyLight.shadow.camera.bottom = -2.2;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#dce7f7', 0.95);
  fillLight.position.set(-3.2, 1.4, 2.2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight('#f2f6ff', 1.45);
  rimLight.position.set(-2.0, 2.6, -3.4);
  scene.add(rimLight);

  const rectLights: THREE.RectAreaLight[] = [];
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const topSoftbox = new THREE.RectAreaLight('#ffffff', 2.4, 4.5, 2.0);
    topSoftbox.position.set(0, 3.8, 1.2);
    topSoftbox.lookAt(0, 0, 0);
    scene.add(topSoftbox);

    const sideSoftbox = new THREE.RectAreaLight('#f0f5ff', 1.8, 1.8, 3.5);
    sideSoftbox.position.set(3.4, 0.5, 1.6);
    sideSoftbox.lookAt(0, 0, 0);
    scene.add(sideSoftbox);
    rectLights.push(topSoftbox, sideSoftbox);
  }

  // Procedural Textures & AirPods Max Rig
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures = createProceduralTexturePack(maxAniso);
  const rig = buildAirPodsMaxRig(textures, initialColorway);
  scene.add(rig.root);

  // Soft studio contact shadow plane beneath model
  const shadowGeo = new THREE.PlaneGeometry(2.8, 1.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, -0.94, 0);
  scene.add(shadowPlane);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Mutable animation state
  let targetScroll = 0;
  let currentScroll = 0;
  let targetColorway = initialColorway;
  let colorwayTransitionRemaining = 0;
  let freeOrbit = false;
  let reducedMotion = false;
  let targetTiltX = 0;
  let targetTiltY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;
  let disposed = false;
  let frameId = 0;
  let renderBusy = false;
  let renderDirty = false;
  let lastTimestamp = performance.now();
  let viewWidth = width;
  let viewHeight = height;

  const anchorKeys = Object.keys(rig.anchors) as (keyof AirPodsAnchors)[];
  const projectedAnchors: ProjectedAnchorsMap = {
    crown: { x: 0, y: 0, visible: false },
    noiseButton: { x: 0, y: 0, visible: false },
    micSlit: { x: 0, y: 0, visible: false },
    expShell: { x: 0, y: 0, visible: false },
    expElectronics: { x: 0, y: 0, visible: false },
    expDriver: { x: 0, y: 0, visible: false },
    expBaffle: { x: 0, y: 0, visible: false },
    expCushion: { x: 0, y: 0, visible: false },
  };

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function stepAndRender(now: number) {
    const rawDelta = Math.min((now - lastTimestamp) / 1000, 0.05);
    lastTimestamp = now;
    const dt = Math.max(rawDelta, 0.001);

    if (reducedMotion || isSoftwareGl) {
      currentScroll = targetScroll;
      currentTiltX = targetTiltX;
      currentTiltY = targetTiltY;
    } else {
      currentScroll = THREE.MathUtils.damp(currentScroll, targetScroll, 8.5, dt);
      currentTiltX = THREE.MathUtils.damp(currentTiltX, targetTiltX, 6.0, dt);
      currentTiltY = THREE.MathUtils.damp(currentTiltY, targetTiltY, 6.0, dt);
    }

    const state = computeChoreographyState(currentScroll);

    // Morph PBR colorway smoothly
    const colorAlpha = reducedMotion || isSoftwareGl ? 1 : 1 - Math.exp(-9.0 * dt);
    rig.applyColorway(targetColorway, colorAlpha);
    if (reducedMotion || isSoftwareGl) {
      colorwayTransitionRemaining = 0;
    } else if (colorwayTransitionRemaining > 0) {
      colorwayTransitionRemaining = Math.max(0, colorwayTransitionRemaining - dt);
    }

    // Apply scroll choreography + subtle pointer parallax micro-tilt
    const tiltedState: ChoreographyState = freeOrbit
      ? state
      : {
          ...state,
          headsetRot: {
            x: state.headsetRot.x + currentTiltY * 0.065,
            y: state.headsetRot.y + currentTiltX * 0.09,
            z: state.headsetRot.z,
          },
        };
    rig.applyChoreography(tiltedState);

    // Dynamic studio light shifting so specular highlights glide across curved aluminum cups
    const keyRadius = 4.2;
    keyLight.position.set(
      Math.cos(state.keyLightAzimuth) * keyRadius,
      3.1 + Math.sin(state.scrollProgress * Math.PI) * 0.6,
      Math.sin(state.keyLightAzimuth) * keyRadius,
    );
    const rimRadius = 3.9;
    rimLight.position.set(
      Math.cos(state.rimLightAzimuth) * rimRadius,
      2.4,
      Math.sin(state.rimLightAzimuth) * rimRadius,
    );

    // Ground contact shadow follows headset X & scales subtly for Smart Case
    shadowPlane.position.x = state.headsetPos.x;
    shadowPlane.scale.set(
      1 + state.explodeFactor * 0.25 + state.smartCaseLift * 0.08,
      1,
      1,
    );
    shadowMat.opacity = 0.48 - state.explodeFactor * 0.14;

    if (freeOrbit) {
      controls.update();
    } else {
      _targetCamPos.set(state.cameraPos.x, state.cameraPos.y, state.cameraPos.z);
      _targetCamLook.set(state.cameraTarget.x, state.cameraTarget.y, state.cameraTarget.z);
      if (reducedMotion || isSoftwareGl) {
        camera.position.copy(_targetCamPos);
        controls.target.copy(_targetCamLook);
        camera.fov = state.cameraFov;
      } else {
        const camLambda = 9.0;
        camera.position.lerp(_targetCamPos, 1 - Math.exp(-camLambda * dt));
        controls.target.lerp(_targetCamLook, 1 - Math.exp(-camLambda * dt));
        camera.fov = THREE.MathUtils.damp(camera.fov, state.cameraFov, camLambda, dt);
      }
      camera.lookAt(controls.target);
      camera.updateProjectionMatrix();
    }

    // Update world matrices & project 3D anchors to 2D screen coordinates
    rig.root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    for (let i = 0; i < anchorKeys.length; i++) {
      const key = anchorKeys[i];
      rig.anchors[key].getWorldPosition(_projVec);
      _projVec.project(camera);
      const inFront = _projVec.z >= -1 && _projVec.z <= 1;
      projectedAnchors[key].x = (_projVec.x * 0.5 + 0.5) * viewWidth;
      projectedAnchors[key].y = (-_projVec.y * 0.5 + 0.5) * viewHeight;
      projectedAnchors[key].visible = inFront;
    }

    renderer.render(scene, camera);

    onFrame({
      state,
      anchors: projectedAnchors,
      width: viewWidth,
      height: viewHeight,
    });

    // Keep animating until scroll, tilt, and colorway settle
    const scrollDiff = Math.abs(targetScroll - currentScroll);
    const tiltDiff = Math.abs(targetTiltX - currentTiltX) + Math.abs(targetTiltY - currentTiltY);
    const needsMoreFrames =
      scrollDiff > 0.00035 ||
      tiltDiff > 0.001 ||
      colorwayTransitionRemaining > 0 ||
      freeOrbit;

    if (scrollDiff <= 0.00035) {
      currentScroll = targetScroll;
    }

    return needsMoreFrames;
  }

  function requestRender() {
    if (disposed) return;
    if (renderBusy) {
      renderDirty = true;
      return;
    }
    renderBusy = true;
    frameId = requestAnimationFrame((now) => {
      if (disposed) {
        renderBusy = false;
        return;
      }
      renderDirty = false;
      const keepGoing = stepAndRender(now);
      const done = () => {
        renderBusy = false;
        if (!disposed && (renderDirty || keepGoing)) {
          requestRender();
        }
      };
      if (isSoftwareGl) {
        afterDraw(done);
      } else {
        done();
      }
    });
  }

  const handleOrbitChange = () => {
    if (freeOrbit) requestRender();
  };
  controls.addEventListener('change', handleOrbitChange);

  const handleResize = () => {
    if (disposed) return;
    viewWidth = Math.max(container.clientWidth, 1);
    viewHeight = Math.max(container.clientHeight, 1);
    camera.aspect = viewWidth / viewHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewWidth, viewHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    requestRender();
  };

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  const handleContextLost = (e: Event) => {
    e.preventDefault();
    onContextLost?.(true);
  };
  const handleContextRestored = () => {
    onContextLost?.(false);
    requestRender();
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

  // Trigger initial paint
  requestRender();

  return {
    setTargetScroll: (progress: number) => {
      targetScroll = THREE.MathUtils.clamp(progress, 0, 1);
      requestRender();
    },
    setColorway: (colorway: AirPodsColorway) => {
      targetColorway = colorway;
      colorwayTransitionRemaining = isSoftwareGl || reducedMotion ? 0 : 0.65;
      requestRender();
    },
    setFreeOrbit: (enabled: boolean) => {
      freeOrbit = enabled;
      controls.enabled = enabled;
      requestRender();
    },
    setPointerTilt: (nx: number, ny: number) => {
      targetTiltX = THREE.MathUtils.clamp(nx, -1, 1);
      targetTiltY = THREE.MathUtils.clamp(ny, -1, 1);
      requestRender();
    },
    setReducedMotion: (reduced: boolean) => {
      reducedMotion = reduced;
      requestRender();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', handleOrbitChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      rig.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      textures.dispose();
      envRenderTarget.dispose();
      rectLights.forEach((l) => l.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
