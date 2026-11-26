import * as THREE from 'three';
import { COLORWAYS } from '../data/colorways';
import type { ProjectedAnchor, ShowcaseHUDState } from '../types/showcase';
import { createAirPodsMaxRig, type AirPodsMaxRig } from './airpodsMaxModel';
import { evaluateChoreography, type ChoreographyPose } from './choreography';
import { createProceduralTextureSuite, type ProceduralTextureSuite } from './proceduralTextures';
import { createStudioRig, type StudioRig } from './studioEnvironment';

export interface ShowcaseCallbacks {
  onFrame: (
    hud: ShowcaseHUDState,
    anchors: Record<string, ProjectedAnchor>,
    backdropHex: string
  ) => void;
}

export class ShowcaseEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSuite;
  private studio: StudioRig;
  private rig: AirPodsMaxRig;
  private callbacks: ShowcaseCallbacks;

  private rafId: number | null = null;
  private startTime = performance.now();
  private lastTime = performance.now();

  private targetProgress = 0;
  private smoothProgress = 0;

  // Subtle mouse-parallax micro-tilt
  private pointerTarget = { x: 0, y: 0 };
  private pointerSmooth = { x: 0, y: 0 };

  // Colorway control (auto-morphs on scroll through Stage 2, or smoothly locks to user-clicked swatch)
  private lockedColorIndex: number | null = null;
  private currentColorFloat = 0; // smooth continuous index in [0..4]

  // Pre-allocated scratch buffers (zero GC per frame)
  private pose: ChoreographyPose = {
    camPos: new THREE.Vector3(),
    camTarget: new THREE.Vector3(),
    fov: 34,
    headsetPos: new THREE.Vector3(),
    headsetRot: new THREE.Euler(),
    crownRotation: 0,
    detachAmount: 0,
    detachSplay: 0,
    explodeAmount: 0,
    cupSwivelCase: 0,
    smartCaseVisible: false,
    smartCaseY: -3.5,
    smartCaseOpen: 1,
    shadowOpacity: 0.5,
    colorAutoProgress: 0,
    stageIndex: 0,
  };
  private tmpVec = new THREE.Vector3();
  private tmpColorA = new THREE.Color();
  private tmpColorB = new THREE.Color();
  private projectedAnchors: Record<string, ProjectedAnchor> = {};

  private resizeObserver: ResizeObserver;
  private width = 1;
  private height = 1;

  constructor(container: HTMLElement, callbacks: ShowcaseCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.width = Math.max(1, container.clientWidth);
    this.height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(34, this.width / this.height, 0.1, 60);
    this.camera.position.set(0.42, 0.22, 4.45);

    this.textures = createProceduralTextureSuite();
    this.studio = createStudioRig(this.renderer, this.scene);
    this.rig = createAirPodsMaxRig(this.textures, COLORWAYS[0]);
    this.scene.add(this.rig.root);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });

    this.startLoop();
  }

  public setScrollProgress(p: number): void {
    this.targetProgress = Math.max(0, Math.min(1, p));
  }

  public selectColorway(index: number | null): void {
    this.lockedColorIndex = index;
  }

  private handlePointerMove = (e: PointerEvent) => {
    const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    this.pointerTarget.x = nx;
    this.pointerTarget.y = ny;
  };

  private handleResize(): void {
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  private startLoop(): void {
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      const timeSec = (now - this.startTime) / 1000;

      // Frame-rate independent exponential smoothing for buttery 60fps scroll scrubbing
      const damp = 1 - Math.exp(-9.5 * dt);
      this.smoothProgress += (this.targetProgress - this.smoothProgress) * damp;

      const pDamp = 1 - Math.exp(-5.0 * dt);
      this.pointerSmooth.x += (this.pointerTarget.x - this.pointerSmooth.x) * pDamp;
      this.pointerSmooth.y += (this.pointerTarget.y - this.pointerSmooth.y) * pDamp;

      // Evaluate 7-stage choreography pose
      const pose = evaluateChoreography(this.smoothProgress, timeSec, this.pose);

      // Determine target colorway float (0..4): auto-morph during Stage 2 unless user locked a swatch
      const desiredColor =
        this.lockedColorIndex !== null
          ? this.lockedColorIndex
          : this.smoothProgress < 0.12
          ? 0
          : this.smoothProgress <= 0.265
          ? pose.colorAutoProgress
          : Math.round(pose.colorAutoProgress); // settle cleanly on Sky Blue / Green or last finish

      const cDamp = 1 - Math.exp(-6.5 * dt);
      this.currentColorFloat += (desiredColor - this.currentColorFloat) * cDamp;
      const clampedColor = Math.max(0, Math.min(COLORWAYS.length - 1, this.currentColorFloat));
      const idxA = Math.floor(clampedColor);
      const idxB = Math.min(COLORWAYS.length - 1, idxA + 1);
      const blendT = clampedColor - idxA;
      this.rig.applyBlendedColorway(COLORWAYS[idxA], COLORWAYS[idxB], blendT);

      // Interpolate subtle studio backdrop tint
      this.tmpColorA.set(COLORWAYS[idxA].backdropTint);
      this.tmpColorB.set(COLORWAYS[idxB].backdropTint);
      const backdropHex = '#' + this.tmpColorA.lerp(this.tmpColorB, blendT).getHexString();

      // Apply subtle mouse-parallax micro-tilt (reduced during macro & Smart Case docking)
      const parallaxScale =
        pose.stageIndex === 2 || pose.stageIndex === 5
          ? 0.022
          : pose.stageIndex === 6
          ? 0.015
          : 0.065;

      this.rig.headsetGroup.position.copy(pose.headsetPos);
      this.rig.headsetGroup.rotation.set(
        pose.headsetRot.x + this.pointerSmooth.y * parallaxScale * 0.7,
        pose.headsetRot.y + this.pointerSmooth.x * parallaxScale,
        pose.headsetRot.z
      );

      // Apply mechanical animations
      this.rig.setCrownRotation(pose.crownRotation);
      this.rig.setCushionDetach(pose.detachAmount);
      this.rig.setExplodeAmount(pose.explodeAmount);

      // Cup swivel: handle Stage 5 outward splay vs Stage 7 flat Smart Case swivel cleanly
      if (pose.cupSwivelCase > 0.001) {
        this.rig.setCupSwivelForCase(pose.cupSwivelCase);
      } else {
        this.rig.setCupSwivelForCase(0);
        // Stage 5: subtly splay cups inward faces toward viewer so both honeycomb grilles gleam!
        if (pose.detachSplay > 0.001) {
          this.rig.rightCup.swivelPivot.rotation.y = pose.detachSplay * 0.92;
          this.rig.leftCup.swivelPivot.rotation.y = -pose.detachSplay * 0.92;
          this.rig.rightCup.tiltPivot.rotation.z = -THREE.MathUtils.lerp(0.305, 0.14, pose.detachSplay);
          this.rig.leftCup.tiltPivot.rotation.z = THREE.MathUtils.lerp(0.305, 0.14, pose.detachSplay);
        }
      }

      // Stage 6 Exploded View: straighten right cup vertically so all 5 layers align on a crisp horizontal engineering axis!
      if (pose.explodeAmount > 0.001) {
        this.rig.rightCup.tiltPivot.rotation.z = -THREE.MathUtils.lerp(
          0.305,
          0.02,
          pose.explodeAmount
        );
      }

      // Stage 7 Smart Case position & magnetic flap
      this.rig.smartCase.root.visible = pose.smartCaseVisible;
      this.rig.smartCase.root.position.y = pose.smartCaseY;
      this.rig.smartCase.root.rotation.y = this.pointerSmooth.x * 0.015;
      this.rig.smartCase.setOpenAmount(pose.smartCaseOpen);

      // Contact shadow opacity
      const shadowMat = this.rig.contactShadow.material as THREE.MeshBasicMaterial;
      shadowMat.opacity = pose.shadowOpacity;

      // Responsive FOV boost on narrow/portrait viewports so the full headset always fits comfortably
      const aspect = this.width / this.height;
      const mobileFovBoost = aspect < 0.85 ? (0.85 - aspect) * 18 : 0;
      const targetFov = pose.fov + mobileFovBoost;
      if (Math.abs(this.camera.fov - targetFov) > 0.01) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }

      this.camera.position.copy(pose.camPos);
      this.camera.position.x += this.pointerSmooth.x * 0.05;
      this.camera.position.y -= this.pointerSmooth.y * 0.035;
      this.camera.lookAt(pose.camTarget);

      // Update dynamic sweeping studio key & rim lights
      this.studio.updateDynamicLighting(this.smoothProgress, timeSec);

      // Update world matrices before projecting 3D hardware anchor sockets to 2D screen coordinates
      this.scene.updateMatrixWorld(true);
      this.camera.updateMatrixWorld(true);

      for (const [id, anchor] of Object.entries(this.rig.anchors)) {
        anchor.getWorldPosition(this.tmpVec);
        this.tmpVec.project(this.camera);
        const visible = this.tmpVec.z >= -1 && this.tmpVec.z <= 1;
        this.projectedAnchors[id] = {
          id,
          x: (this.tmpVec.x * 0.5 + 0.5) * this.width,
          y: (-this.tmpVec.y * 0.5 + 0.5) * this.height,
          visible,
          depth: this.tmpVec.z,
        };
      }

      this.renderer.render(this.scene, this.camera);

      this.callbacks.onFrame(
        {
          progress: this.smoothProgress,
          stageIndex: pose.stageIndex,
          activeColorwayIndex: Math.round(clampedColor),
          colorwayBlend: clampedColor,
          isColorLocked: this.lockedColorIndex !== null,
          crownAngleDeg: Math.round(THREE.MathUtils.radToDeg(pose.crownRotation)),
          explodeFactor: pose.explodeAmount,
          detachFactor: pose.detachAmount,
          caseCloseFactor: 1.0 - pose.smartCaseOpen,
        },
        this.projectedAnchors,
        backdropHex
      );
    };

    this.rafId = requestAnimationFrame(tick);
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.resizeObserver.disconnect();
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.rig.dispose();
    this.studio.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
