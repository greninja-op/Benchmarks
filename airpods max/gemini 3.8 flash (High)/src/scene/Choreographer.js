import * as THREE from 'three';
import { COLORWAYS } from './Colorways.js';

/**
 * Choreographer
 * Drives the 7-stage scroll choreography, camera matrices, PBR material interpolation,
 * mechanical part animations, and dynamic lighting.
 */
export class Choreographer {
  constructor({
    camera,
    model,
    lighting,
    leaderLines,
    sound,
    onColorwayChange
  }) {
    this.camera = camera;
    this.model = model;
    this.lighting = lighting;
    this.leaderLines = leaderLines;
    this.sound = sound;
    this.onColorwayChange = onColorwayChange;

    this.currentScroll = 0;
    this.targetScroll = 0;
    this.isFreeOrbit = false;

    // Camera target vector
    this.lookAtTarget = new THREE.Vector3(0, 0.35, 0);
    this.currentLookAt = new THREE.Vector3(0, 0.35, 0);

    // Audio state tracking
    this.lastSnapped = false;
    this.lastCrownAngle = 0;
    this.lastColorway = 'silver';
  }

  setFreeOrbit(enabled) {
    this.isFreeOrbit = enabled;
  }

  /**
   * Linear interpolation helper
   */
  lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  /**
   * Smooth step helper
   */
  smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  update(scrollProgress, delta, time) {
    this.currentScroll = scrollProgress;

    // 1. Dynamic Lighting Update
    this.lighting.updateLighting(scrollProgress, time);

    // If Free Orbit mode is active, user is controlling camera directly
    if (this.isFreeOrbit) {
      this.leaderLines.update(scrollProgress, window.innerWidth, window.innerHeight);
      return;
    }

    const m = this.model;
    const cam = this.camera;

    // ==========================================
    // STAGE 1: HERO ENTRANCE (0.00 - 0.12)
    // ==========================================
    if (scrollProgress <= 0.12) {
      const t = this.smoothstep(0.0, 0.12, scrollProgress);

      // Camera
      cam.position.set(
        this.lerp(0.0, 0.12, t),
        this.lerp(0.42, 0.38, t),
        this.lerp(3.7, 3.4, t)
      );
      this.lookAtTarget.set(0, 0.32, 0);

      // Model: front 3/4 pose with subtle floating breathing motion
      const breath = Math.sin(time * 1.5) * 0.02;
      m.rootGroup.position.set(0, breath, 0);
      m.rootGroup.rotation.set(
        this.lerp(0.06, 0.04, t),
        this.lerp(-0.25, -0.15, t),
        0
      );

      // Reset parts
      m.leftCushionGroup.position.z = 0.20;
      m.rightCushionGroup.position.z = 0.20;
      m.smartCaseGroup.position.y = -2.8;
      m.leftCupPivot.rotation.y = 0;
      m.rightCupPivot.rotation.y = 0;
      m.headbandGroup.position.y = 0;
      m.leftCupPivot.position.y = 0.28;
      m.rightCupPivot.position.y = 0.28;
      m.materials.aluminumTranslucent.transmission = 0;

      this.resetExplodedLayers();
    }

    // ==========================================
    // STAGE 2: DYNAMIC COLORWAY MORPHING (0.12 - 0.26)
    // ==========================================
    else if (scrollProgress > 0.12 && scrollProgress <= 0.26) {
      const t = this.smoothstep(0.12, 0.26, scrollProgress);

      cam.position.set(
        this.lerp(0.12, 0.45, t),
        this.lerp(0.38, 0.44, t),
        this.lerp(3.4, 3.1, t)
      );
      this.lookAtTarget.set(0, 0.32, 0);

      m.rootGroup.position.set(0, 0, 0);
      m.rootGroup.rotation.set(
        this.lerp(0.04, 0.12, t),
        this.lerp(-0.15, 0.65, t), // smooth orbit to showcase finishes
        0
      );

      // Interpolate colors across the 5 signature finishes
      const colorProgress = (scrollProgress - 0.12) / 0.14; // 0 to 1
      let activeColorKey = 'silver';
      if (colorProgress < 0.2) activeColorKey = 'silver';
      else if (colorProgress < 0.4) activeColorKey = 'spaceGray';
      else if (colorProgress < 0.6) activeColorKey = 'skyBlue';
      else if (colorProgress < 0.8) activeColorKey = 'pink';
      else activeColorKey = 'green';

      if (activeColorKey !== this.lastColorway) {
        this.lastColorway = activeColorKey;
        m.setColorway(activeColorKey);
        if (this.onColorwayChange) this.onColorwayChange(activeColorKey);
      }

      this.resetExplodedLayers();
    }

    // ==========================================
    // STAGE 3: MACRO ZOOM: DIGITAL CROWN & BUTTON (0.26 - 0.44)
    // ==========================================
    else if (scrollProgress > 0.26 && scrollProgress <= 0.44) {
      const t = this.smoothstep(0.26, 0.44, scrollProgress);

      // Extreme Macro close-up on the upper right ear cup
      cam.position.set(
        this.lerp(0.45, 0.94, t),
        this.lerp(0.44, 0.88, t),
        this.lerp(3.1, 1.48, t)
      );
      this.lookAtTarget.set(
        this.lerp(0.0, 0.84, t),
        this.lerp(0.32, 0.72, t),
        this.lerp(0.0, 0.05, t)
      );

      m.rootGroup.position.set(0, 0, 0);
      m.rootGroup.rotation.set(
        this.lerp(0.12, 0.26, t),
        this.lerp(0.65, -0.42, t),
        this.lerp(0.0, 0.14, t)
      );

      // Digital Crown physical knurling rotation along its local axis
      const crownTurn = scrollProgress * 36;
      m.digitalCrown.rotation.y = crownTurn;

      // Play subtle haptic clicks as crown spins
      if (Math.abs(crownTurn - this.lastCrownAngle) > 0.4) {
        this.lastCrownAngle = crownTurn;
        this.sound.playCrownClick(1.2);
      }

      this.resetExplodedLayers();
    }

    // ==========================================
    // STAGE 4: CANOPY & CUSHION TEXTILE MACRO (0.44 - 0.58)
    // ==========================================
    else if (scrollProgress > 0.44 && scrollProgress <= 0.58) {
      const t = this.smoothstep(0.44, 0.58, scrollProgress);

      // Glides from canopy mesh to cushion textile
      if (t < 0.5) {
        const subT = t * 2.0;
        cam.position.set(
          this.lerp(0.94, 0.28, subT),
          this.lerp(0.88, 1.54, subT),
          this.lerp(1.48, 1.35, subT)
        );
        this.lookAtTarget.set(0, 1.45, 0); // Focus on breathable canopy
      } else {
        const subT = (t - 0.5) * 2.0;
        cam.position.set(
          this.lerp(0.28, 0.68, subT),
          this.lerp(1.54, 0.36, subT),
          this.lerp(1.35, 1.25, subT)
        );
        this.lookAtTarget.set(0.62, 0.32, 0.15); // Focus on inner knitted 'R'
      }

      m.rootGroup.rotation.set(
        this.lerp(0.26, -0.16, t),
        this.lerp(-0.42, 0.38, t),
        0
      );

      this.resetExplodedLayers();
    }

    // ==========================================
    // STAGE 5: MAGNETIC CUSHION DETACH & SNAP-BACK (0.58 - 0.72)
    // ==========================================
    else if (scrollProgress > 0.58 && scrollProgress <= 0.72) {
      const t = this.smoothstep(0.58, 0.72, scrollProgress);

      cam.position.set(
        this.lerp(0.68, 0.0, t),
        this.lerp(0.36, 0.32, t),
        this.lerp(1.25, 2.75, t)
      );
      this.lookAtTarget.set(0, 0.28, 0);

      m.rootGroup.rotation.set(
        this.lerp(-0.16, 0.04, t),
        this.lerp(0.38, 0.0, t),
        0
      );

      // Detach: 0.0 -> lifts out to 0.72 -> snaps back to 0.20
      let detachDist = 0;
      if (t < 0.5) {
        // Unseating phase
        const subT = t * 2.0;
        detachDist = this.lerp(0, 0.78, subT);
        this.lastSnapped = false;
      } else {
        // Return and snap phase
        const subT = (t - 0.5) * 2.0;
        detachDist = this.lerp(0.78, 0.0, subT);

        // Magnetic snap trigger
        if (subT > 0.85 && !this.lastSnapped) {
          this.lastSnapped = true;
          this.sound.playMagneticSnap();
        }
      }

      m.leftCushionGroup.position.z = 0.20 + detachDist;
      m.leftCushionGroup.rotation.y = detachDist * 0.15;

      m.rightCushionGroup.position.z = 0.20 + detachDist;
      m.rightCushionGroup.rotation.y = -detachDist * 0.15;

      this.resetExplodedLayers();
    }

    // ==========================================
    // STAGE 6: ENGINEERING EXPLODED VIEW (0.72 - 0.88)
    // ==========================================
    else if (scrollProgress > 0.72 && scrollProgress <= 0.88) {
      const t = this.smoothstep(0.72, 0.88, scrollProgress);

      cam.position.set(
        this.lerp(0.0, 1.45, t),
        this.lerp(0.32, 0.40, t),
        this.lerp(2.75, 2.85, t)
      );
      this.lookAtTarget.set(
        this.lerp(0.0, 0.82, t),
        this.lerp(0.28, 0.32, t),
        0
      );

      m.rootGroup.rotation.set(
        this.lerp(0.04, 0.06, t),
        this.lerp(0.0, -0.62, t), // 3/4 side profile matching reference image 5
        0
      );

      // Separate exploded layers along X axis
      const explodeFactor = Math.sin(t * Math.PI); // smoothly expands then reassembles
      m.materials.aluminumTranslucent.transmission = explodeFactor * 0.75;

      m.explodedLayers.forEach(layer => {
        layer.mesh.position.x = layer.offsetX * explodeFactor;
        if (layer.rotY) layer.mesh.rotation.y = layer.rotY * explodeFactor;
      });

      // Keep left cushion normal
      m.leftCushionGroup.position.z = 0.20;
    }

    // ==========================================
    // STAGE 7: SMART CASE FINALE (0.88 - 1.00)
    // ==========================================
    else if (scrollProgress > 0.88) {
      const t = this.smoothstep(0.88, 1.00, scrollProgress);

      this.resetExplodedLayers();

      // Camera pulls back to full case framing
      cam.position.set(
        this.lerp(1.45, 0.0, t),
        this.lerp(0.40, 0.18, t),
        this.lerp(2.85, 3.45, t)
      );
      this.lookAtTarget.set(0, -0.15, 0);

      m.rootGroup.rotation.set(0, 0, 0);

      // 1. Ear cups swivel flat (90 degrees) to fit inside Smart Case
      const swivelAngle = this.lerp(0, Math.PI / 2, t);
      m.leftCupPivot.rotation.y = swivelAngle;
      m.rightCupPivot.rotation.y = -swivelAngle;

      // 2. Smart Case rises up from below into position
      const caseY = this.lerp(-2.8, -0.32, t);
      m.smartCaseGroup.position.y = caseY;

      // 3. Headphones glide down slightly into case cradles
      const dropY = this.lerp(0, -0.28, t);
      m.headbandGroup.position.y = dropY;
      m.leftCupPivot.position.y = 0.28 + dropY;
      m.rightCupPivot.position.y = 0.28 + dropY;

      // 4. Articulated magnetic flap folds shut over cups
      // Swings from open (-110 deg) to closed (0 deg)
      const flapAngle = this.lerp(-Math.PI * 0.65, 0.0, Math.max(0, (t - 0.35) / 0.65));
      m.flapHingeGroup.rotation.x = flapAngle;
    }

    // Smooth camera lookAt interpolation
    this.currentLookAt.lerp(this.lookAtTarget, 0.12);
    cam.lookAt(this.currentLookAt);

    // Update screen-space leader lines
    this.leaderLines.update(scrollProgress, window.innerWidth, window.innerHeight);
  }

  resetExplodedLayers() {
    this.model.materials.aluminumTranslucent.transmission = 0;
    this.model.explodedLayers.forEach(layer => {
      layer.mesh.position.x = 0;
      layer.mesh.rotation.y = 0;
    });
  }
}
