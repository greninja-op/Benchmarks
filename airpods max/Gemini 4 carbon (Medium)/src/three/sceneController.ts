import * as THREE from 'three';
import { COLORWAYS, ColorwaySpec, LEADER_CALLOUTS } from '../data/colorways';
import { AirPodsMaxAssembly, createAirPodsMaxAssembly } from './airpodsModel';
import { createStudioEnvironment, StudioRig } from './studioEnvironment';

export interface ProjectedAnchor {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
}

export interface SceneTelemetry {
  scrollProgress: number;
  stageIndex: number;
  activeColorIndex: number;
  crownOpacity: number;
  explodedOpacity: number;
  anchors: Record<string, ProjectedAnchor>;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

interface PoseState {
  camPos: THREE.Vector3;
  camTarget: THREE.Vector3;
  fov: number;
  rootRot: THREE.Vector3;
  headsetY: number;
  leftSwivelY: number;
  leftTiltZ: number;
  rightSwivelY: number;
  rightTiltZ: number;
  stemInwardAngle: number;
  armExtend: number;
}

export class AirPodsSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private studio: StudioRig;
  private model: AirPodsMaxAssembly;

  private targetScroll = 0;
  private smoothScroll = 0;

  private mouseTarget = new THREE.Vector2(0, 0);
  private mouseSmooth = new THREE.Vector2(0, 0);

  // Colorway state: supports both automatic Stage 2 morphing & manual swatch selection
  private manualColorOverride: number | null = null;
  private colorTransitionFrom: ColorwaySpec = COLORWAYS[0];
  private colorTransitionTo: ColorwaySpec = COLORWAYS[0];
  private colorTransitionProgress = 1;
  private currentActiveColorIdx = 0;

  private rafId = 0;
  private lastTime = performance.now();
  private onTelemetry?: (telemetry: SceneTelemetry) => void;
  private projVec = new THREE.Vector3();

  constructor(container: HTMLElement, onTelemetry?: (telemetry: SceneTelemetry) => void) {
    this.container = container;
    this.onTelemetry = onTelemetry;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      60
    );
    this.camera.position.set(0, 0.25, 6.4);

    this.studio = createStudioEnvironment(this.renderer, this.scene);
    this.model = createAirPodsMaxAssembly();
    this.scene.add(this.model.rootGroup);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });

    this.animate();
  }

  public setScrollProgress(progress: number) {
    this.targetScroll = THREE.MathUtils.clamp(progress, 0, 1);
  }

  public selectColorway(index: number, lockManual = true) {
    const clamped = THREE.MathUtils.clamp(index, 0, COLORWAYS.length - 1);
    if (lockManual) {
      this.manualColorOverride = clamped;
    }
    if (clamped !== this.currentActiveColorIdx) {
      this.colorTransitionFrom = COLORWAYS[this.currentActiveColorIdx];
      this.colorTransitionTo = COLORWAYS[clamped];
      this.colorTransitionProgress = 0;
      this.currentActiveColorIdx = clamped;
    }
  }

  public clearManualColorOverride() {
    this.manualColorOverride = null;
  }

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handlePointerMove = (e: PointerEvent) => {
    const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    this.mouseTarget.set(nx, ny);
  };

  /**
   * Computes continuous interpolated camera & kinematic headset pose for scroll s in [0, 1].
   */
  private evaluatePose(s: number): PoseState {
    const isMobile = this.camera.aspect < 0.85;
    const mobileDistScale = isMobile ? 1.32 : 1.0;

    // Define keyframe poses aligned with the 7 scroll stages
    const heroPose: PoseState = {
      camPos: new THREE.Vector3(0, 0.35, 6.35 * mobileDistScale),
      camTarget: new THREE.Vector3(0, 0.32, 0),
      fov: 32,
      rootRot: new THREE.Vector3(0.04, -0.22 + s * 1.4, 0),
      headsetY: 0.1,
      leftSwivelY: -1.85,
      leftTiltZ: 0.26,
      rightSwivelY: 1.85,
      rightTiltZ: -0.26,
      stemInwardAngle: 0.25,
      armExtend: 0.0,
    };

    const colorsPose: PoseState = {
      camPos: new THREE.Vector3(0.15, 0.30, 5.95 * mobileDistScale),
      camTarget: new THREE.Vector3(0, 0.28, 0),
      fov: 32,
      rootRot: new THREE.Vector3(0.03, 0.26 * Math.sin(((s - 0.12) / 0.14) * Math.PI), 0),
      headsetY: 0.08,
      leftSwivelY: -1.78,
      leftTiltZ: 0.25,
      rightSwivelY: 1.78,
      rightTiltZ: -0.25,
      stemInwardAngle: 0.25,
      armExtend: 0.03,
    };

    // Stage 3: Extreme Macro of Digital Crown, Chrome Stem, ANC Button & Mic Slit (4.22.11 PM.jpeg)
    const crownPose: PoseState = {
      camPos: new THREE.Vector3(0.76, 0.92, 2.22 * (isMobile ? 1.24 : 1.0)),
      camTarget: new THREE.Vector3(1.12, 0.34, 0.04),
      fov: 28,
      rootRot: new THREE.Vector3(0.10, -0.06, 0.02),
      headsetY: 0.05,
      leftSwivelY: -1.75,
      leftTiltZ: 0.24,
      rightSwivelY: 0.42,
      rightTiltZ: -0.20,
      stemInwardAngle: 0.24,
      armExtend: 0.05,
    };

    // Stage 4A: Breathable Knit-Mesh Canopy Macro (44% - 50%)
    const canopyMacroPose: PoseState = {
      camPos: new THREE.Vector3(0.28, 2.68, 2.65 * mobileDistScale),
      camTarget: new THREE.Vector3(0, 2.16, 0),
      fov: 30,
      rootRot: new THREE.Vector3(0.16, 0.22, 0),
      headsetY: 0.0,
      leftSwivelY: -1.95,
      leftTiltZ: 0.24,
      rightSwivelY: 1.95,
      rightTiltZ: -0.24,
      stemInwardAngle: 0.24,
      armExtend: 0.02,
    };

    // Stage 4B: Memory Foam Ear Cushion & Inner Woven "R" Acoustic Mesh Macro (50% - 58%)
    const cushionMacroPose: PoseState = {
      camPos: new THREE.Vector3(0.45, -0.18, 2.38 * (isMobile ? 1.22 : 1.0)),
      camTarget: new THREE.Vector3(1.02, -0.44, -0.04),
      fov: 29,
      rootRot: new THREE.Vector3(-0.04, -0.12, 0),
      headsetY: 0.04,
      leftSwivelY: -2.45,
      leftTiltZ: 0.23,
      rightSwivelY: 2.74,
      rightTiltZ: -0.20,
      stemInwardAngle: 0.23,
      armExtend: 0.02,
    };

    // Stage 5: Magnetic Ear Cushion Detach & Snap-Back (4.22.10 PM.jpeg)
    const detachPose: PoseState = {
      camPos: new THREE.Vector3(0, 0.14, 6.25 * mobileDistScale),
      camTarget: new THREE.Vector3(0, 0.02, 0),
      fov: 32,
      rootRot: new THREE.Vector3(0.02, 0, 0),
      headsetY: 0.18,
      leftSwivelY: -2.92,
      leftTiltZ: 0.21,
      rightSwivelY: 2.92,
      rightTiltZ: -0.21,
      stemInwardAngle: 0.22,
      armExtend: 0.02,
    };

    // Stage 6: 5-Layer Horizontal Engineering Exploded View (4.22.11 PM (1).jpeg)
    const explodedPose: PoseState = {
      camPos: new THREE.Vector3(2.04, -0.34, 4.48 * (isMobile ? 1.38 : 1.0)),
      camTarget: new THREE.Vector3(2.04, -0.46, -0.16),
      fov: 31,
      rootRot: new THREE.Vector3(0.02, 0.0, 0),
      headsetY: 0.04,
      leftSwivelY: -2.5,
      leftTiltZ: 0.22,
      rightSwivelY: -1.32,
      rightTiltZ: -0.05,
      stemInwardAngle: 0.16,
      armExtend: 0.04,
    };

    // Stage 7: Smart Case Finale (4.22.12 PM.jpeg)
    const caseLocalU = THREE.MathUtils.clamp((s - 0.88) / 0.12, 0, 1);
    const descendT = smootherstep(0.18, 0.70, caseLocalU);
    const casePose: PoseState = {
      camPos: new THREE.Vector3(0, 0.34, 6.55 * mobileDistScale),
      camTarget: new THREE.Vector3(0, 0.24, 0),
      fov: 32,
      rootRot: new THREE.Vector3(0.01, 0, 0),
      headsetY: THREE.MathUtils.lerp(0.68, 0.02, descendT),
      leftSwivelY: -0.05,
      leftTiltZ: 0.14,
      rightSwivelY: 0.05,
      rightTiltZ: -0.14,
      stemInwardAngle: 0.12,
      armExtend: 0.0,
    };

    const blendPose = (a: PoseState, b: PoseState, t: number): PoseState => ({
      camPos: a.camPos.clone().lerp(b.camPos, t),
      camTarget: a.camTarget.clone().lerp(b.camTarget, t),
      fov: THREE.MathUtils.lerp(a.fov, b.fov, t),
      rootRot: a.rootRot.clone().lerp(b.rootRot, t),
      headsetY: THREE.MathUtils.lerp(a.headsetY, b.headsetY, t),
      leftSwivelY: THREE.MathUtils.lerp(a.leftSwivelY, b.leftSwivelY, t),
      leftTiltZ: THREE.MathUtils.lerp(a.leftTiltZ, b.leftTiltZ, t),
      rightSwivelY: THREE.MathUtils.lerp(a.rightSwivelY, b.rightSwivelY, t),
      rightTiltZ: THREE.MathUtils.lerp(a.rightTiltZ, b.rightTiltZ, t),
      stemInwardAngle: THREE.MathUtils.lerp(a.stemInwardAngle, b.stemInwardAngle, t),
      armExtend: THREE.MathUtils.lerp(a.armExtend, b.armExtend, t),
    });

    if (s < 0.12) {
      return blendPose(heroPose, colorsPose, smootherstep(0.08, 0.12, s));
    }
    if (s < 0.26) {
      return blendPose(colorsPose, crownPose, smootherstep(0.22, 0.26, s));
    }
    if (s < 0.44) {
      return blendPose(crownPose, canopyMacroPose, smootherstep(0.39, 0.44, s));
    }
    if (s < 0.51) {
      return blendPose(canopyMacroPose, cushionMacroPose, smootherstep(0.48, 0.51, s));
    }
    if (s < 0.58) {
      return blendPose(cushionMacroPose, detachPose, smootherstep(0.54, 0.58, s));
    }
    if (s < 0.72) {
      return blendPose(detachPose, explodedPose, smootherstep(0.68, 0.72, s));
    }
    if (s < 0.88) {
      return blendPose(explodedPose, casePose, smootherstep(0.84, 0.88, s));
    }
    return casePose;
  }

  private getStageIndex(s: number): number {
    if (s < 0.12) return 0;
    if (s < 0.26) return 1;
    if (s < 0.44) return 2;
    if (s < 0.58) return 3;
    if (s < 0.72) return 4;
    if (s < 0.88) return 5;
    return 6;
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Frame-rate independent exponential damping for ultra-fluid 60fps scroll choreography
    const scrollLerp = 1 - Math.exp(-10.5 * dt);
    this.smoothScroll = THREE.MathUtils.lerp(this.smoothScroll, this.targetScroll, scrollLerp);
    if (Math.abs(this.targetScroll - this.smoothScroll) < 0.00005) {
      this.smoothScroll = this.targetScroll;
    }

    const mouseLerp = 1 - Math.exp(-6.0 * dt);
    this.mouseSmooth.lerp(this.mouseTarget, mouseLerp);

    const s = this.smoothScroll;
    const pose = this.evaluatePose(s);

    // ---------------------------------------------------------
    // 1. Apply Camera & Subtle Mouse Micro-Parallax
    // ---------------------------------------------------------
    // Dampen parallax slightly during extreme macro / exploded callouts so leader lines stay calm
    const parallaxScale = s > 0.26 && s < 0.88 ? 0.032 : 0.065;
    this.camera.position.copy(pose.camPos);
    this.camera.position.x += this.mouseSmooth.x * parallaxScale;
    this.camera.position.y += -this.mouseSmooth.y * parallaxScale * 0.75;

    if (Math.abs(this.camera.fov - pose.fov) > 0.01) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(pose.camTarget);

    this.model.rootGroup.rotation.set(
      pose.rootRot.x + this.mouseSmooth.y * parallaxScale * 0.65,
      pose.rootRot.y + this.mouseSmooth.x * parallaxScale * 0.85,
      pose.rootRot.z
    );
    this.model.headsetGroup.position.y = pose.headsetY;

    // Telescoping stainless-steel arm extension & inward angle
    this.model.leftCup.stemPivot.rotation.z = pose.stemInwardAngle;
    this.model.leftCup.gimbalPivot.rotation.z = -pose.stemInwardAngle;
    this.model.rightCup.stemPivot.rotation.z = -pose.stemInwardAngle;
    this.model.rightCup.gimbalPivot.rotation.z = pose.stemInwardAngle;

    const baseRodY = -0.34 - pose.armExtend;
    this.model.leftCup.gimbalPivot.position.y = baseRodY + 0.02;
    this.model.rightCup.gimbalPivot.position.y = baseRodY + 0.02;

    // Ear cup gimbal swivel & inward tilt
    this.model.leftCup.swivelGroup.rotation.set(0, pose.leftSwivelY, pose.leftTiltZ);
    this.model.rightCup.swivelGroup.rotation.set(0, pose.rightSwivelY, pose.rightTiltZ);

    // ---------------------------------------------------------
    // 2. Dynamic Studio Light Shifting (Specular Gliding!)
    // ---------------------------------------------------------
    const lightAzimuth = s * Math.PI * 1.65 + this.mouseSmooth.x * 0.18;
    this.studio.keyLight.position.set(
      Math.cos(lightAzimuth) * 5.6 + 1.5,
      5.8 + Math.sin(s * Math.PI * 2) * 1.2,
      Math.sin(lightAzimuth) * 4.2 + 4.0
    );
    this.studio.rimLight.position.set(
      -Math.cos(lightAzimuth * 0.8) * 5.8,
      4.2 + Math.cos(s * Math.PI * 3) * 1.1,
      -3.8 + Math.sin(lightAzimuth) * 2.5
    );

    // ---------------------------------------------------------
    // 3. Stage 2 (12%–26%) Dynamic Colorway Morphing + Swatches
    // ---------------------------------------------------------
    if (this.manualColorOverride !== null) {
      if (this.colorTransitionProgress < 1) {
        this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + dt * 2.8);
        const eased = smoothstep(0, 1, this.colorTransitionProgress);
        this.model.applyInterpolatedColorway(
          this.colorTransitionFrom,
          this.colorTransitionTo,
          eased
        );
      }
    } else {
      // Sequence smoothly through Silver -> Space Gray -> Pink -> Green -> Sky Blue across Stage 2
      // (Landing on Sky Blue at 26% so Stage 3 Crown Macro matches 4.22.11 PM.jpeg!)
      const scrollOrder = [0, 1, 3, 4, 2]; // Silver, Space Gray, Pink, Green, Sky Blue
      if (s <= 0.12) {
        this.currentActiveColorIdx = scrollOrder[0];
        this.model.applyInterpolatedColorway(COLORWAYS[0], COLORWAYS[0], 1);
      } else if (s < 0.26) {
        const u = THREE.MathUtils.clamp((s - 0.12) / 0.14, 0, 0.9999);
        const scaled = u * (scrollOrder.length - 1);
        const seg = Math.floor(scaled);
        const frac = smoothstep(0.12, 0.88, scaled - seg);
        const fromIdx = scrollOrder[seg];
        const toIdx = scrollOrder[Math.min(scrollOrder.length - 1, seg + 1)];
        this.currentActiveColorIdx = frac > 0.5 ? toIdx : fromIdx;
        this.model.applyInterpolatedColorway(COLORWAYS[fromIdx], COLORWAYS[toIdx], frac);
      } else {
        const landedIdx = scrollOrder[scrollOrder.length - 1]; // Sky Blue
        this.currentActiveColorIdx = landedIdx;
        this.model.applyInterpolatedColorway(COLORWAYS[landedIdx], COLORWAYS[landedIdx], 1);
      }
    }

    // ---------------------------------------------------------
    // 4. Stage 3 (26%–44%) Digital Crown Rotation & ANC Press
    // ---------------------------------------------------------
    if (this.model.rightCup.crownDial) {
      const crownScroll = THREE.MathUtils.clamp((s - 0.24) / 0.22, 0, 1);
      this.model.rightCup.crownDial.rotation.y = crownScroll * Math.PI * 10 + now * 0.00035;
    }
    if (this.model.rightCup.ancButton) {
      // Subtle tactile button press demonstration around 36% scroll
      const pressPulse = Math.exp(-Math.pow((s - 0.365) / 0.022, 2));
      this.model.rightCup.ancButton.position.y = 0.022 - pressPulse * 0.014;
    }

    // ---------------------------------------------------------
    // 5. Stage 5 (58%–72%) Magnetic Ear Cushion Detach & Snap
    // ---------------------------------------------------------
    let detachAmount = 0;
    if (s > 0.58 && s < 0.72) {
      const u = (s - 0.58) / 0.14;
      if (u < 0.44) {
        detachAmount = smootherstep(0.08, 0.42, u);
      } else if (u < 0.64) {
        detachAmount = 1.0;
      } else {
        // Crisp magnetic snap-back acceleration near seat
        const back = 1 - smootherstep(0.64, 0.94, u);
        detachAmount = Math.pow(back, 1.35);
      }
    }

    // ---------------------------------------------------------
    // 6. Stage 6 (72%–88%) 5-Layer Horizontal Exploded View
    // ---------------------------------------------------------
    let explodeAmount = 0;
    if (s > 0.72 && s < 0.88) {
      const u = (s - 0.72) / 0.16;
      if (u < 0.30) {
        explodeAmount = smootherstep(0.04, 0.30, u);
      } else if (u < 0.72) {
        explodeAmount = 1.0;
      } else {
        explodeAmount = 1 - smootherstep(0.72, 0.96, u);
      }
    }

    // Apply Cushion Detach (both cups in Stage 5) + Right Cup 5-Layer Explosion (Stage 6)
    // Left Cup cushion detach:
    this.model.leftCup.cushionLayer.position.set(
      detachAmount * 0.82, // shifts outward in cup local space (-X in world)
      -detachAmount * 0.46,
      -detachAmount * 0.48
    );
    this.model.leftCup.cushionLayer.rotation.set(
      detachAmount * 0.18,
      detachAmount * 0.35,
      -detachAmount * 0.26
    );

    // Right Cup 5-layer horizontal explosion + Stage 5 detach:
    // Recall local +Z is outer aluminum shell (screen LEFT in Stage 6), local -Z is cushion (screen RIGHT in Stage 6)!
    this.model.rightCup.shellLayer.position.z = explodeAmount * 0.44;
    if (this.model.rightCup.electronicsLayer) {
      this.model.rightCup.electronicsLayer.visible = explodeAmount > 0.004;
      this.model.rightCup.electronicsLayer.position.z = 0.09 - explodeAmount * 0.24;
    }
    this.model.rightCup.driverLayer.visible = explodeAmount > 0.004 || detachAmount > 0.02;
    this.model.rightCup.driverLayer.position.z = 0.045 - explodeAmount * 0.80;
    this.model.rightCup.baffleLayer.position.z = -explodeAmount * 1.38;

    this.model.rightCup.cushionLayer.position.set(
      -detachAmount * 0.82,
      -detachAmount * 0.46,
      -detachAmount * 0.48 - explodeAmount * 2.02
    );
    this.model.rightCup.cushionLayer.rotation.set(
      detachAmount * 0.18,
      -detachAmount * 0.35,
      detachAmount * 0.26
    );

    // ---------------------------------------------------------
    // 7. Stage 7 (88%–100%) Contoured Smart Case & Magnetic Flap
    // ---------------------------------------------------------
    if (s > 0.865) {
      this.model.smartCaseGroup.visible = true;
      const u = THREE.MathUtils.clamp((s - 0.88) / 0.12, 0, 1);
      const caseRise = smootherstep(0.0, 0.42, u);
      this.model.smartCaseGroup.position.y = THREE.MathUtils.lerp(-3.8, -0.52, caseRise);

      // Magnetic front saddle flap folds smoothly from open (-138 deg) to closed (0 deg)
      const flapClose = smootherstep(0.62, 0.94, u);
      this.model.smartCaseFlapPivot.rotation.x = THREE.MathUtils.lerp(-2.4, 0.0, flapClose);
    } else {
      this.model.smartCaseGroup.visible = false;
    }

    // Contact shadow tracking
    const shadowY = s > 0.88 ? -1.92 : -2.14;
    this.studio.contactShadowMesh.position.y = shadowY;
    this.studio.contactShadowMesh.position.x = explodeAmount * 2.0;
    this.studio.contactShadowMat.opacity = THREE.MathUtils.lerp(0.75, 0.35, explodeAmount);

    // Render WebGL2 frame
    this.renderer.render(this.scene, this.camera);

    // ---------------------------------------------------------
    // 8. Project Exact 3D Hardware Sockets -> 2D Screen Space
    // ---------------------------------------------------------
    if (this.onTelemetry) {
      const crownOpacity =
        smoothstep(0.275, 0.31, s) * (1 - smoothstep(0.40, 0.43, s));
      const explodedOpacity =
        smoothstep(0.755, 0.785, s) * (1 - smoothstep(0.835, 0.865, s));

      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const anchors: Record<string, ProjectedAnchor> = {};

      if (crownOpacity > 0.01 || explodedOpacity > 0.01) {
        this.scene.updateMatrixWorld();
        for (const callout of LEADER_CALLOUTS) {
          const opacity = callout.stage === 'crown' ? crownOpacity : explodedOpacity;
          const socketObj = this.model.sockets[callout.socketKey];
          if (socketObj && opacity > 0.01) {
            socketObj.getWorldPosition(this.projVec);
            this.projVec.project(this.camera);
            const sx = (this.projVec.x * 0.5 + 0.5) * w;
            const sy = (-this.projVec.y * 0.5 + 0.5) * h;
            anchors[callout.id] = {
              id: callout.id,
              x: sx,
              y: sy,
              visible: this.projVec.z < 1,
              opacity,
            };
          } else {
            anchors[callout.id] = { id: callout.id, x: 0, y: 0, visible: false, opacity: 0 };
          }
        }
      }

      this.onTelemetry({
        scrollProgress: s,
        stageIndex: this.getStageIndex(s),
        activeColorIndex: this.currentActiveColorIdx,
        crownOpacity,
        explodedOpacity,
        anchors,
      });
    }
  };

  public dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.studio.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
