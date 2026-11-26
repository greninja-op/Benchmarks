import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Lenis from 'lenis';
import confetti from 'canvas-confetti';

import { buildAirPodsMaxModel } from './scene/AirPodsModel.js';
import { setupStudioEnvironment } from './scene/StudioEnvironment.js';
import { LeaderLinesOverlay } from './scene/LeaderLines.js';
import { Choreographer } from './scene/Choreographer.js';
import { sound } from './scene/AudioEngine.js';
import { COLORWAYS } from './scene/Colorways.js';

class AirPodsShowcaseApp {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.canvas = document.getElementById('canvas3d');
    this.ambientBackdrop = document.getElementById('ambientBackdrop');

    this.currentColorway = 'silver';
    this.isFreeOrbit = false;
    this.scrollProgress = 0;
    this.targetScrollProgress = 0;

    this.lastTime = performance.now();

    this.initThree();
    this.initScene();
    this.initLenis();
    this.initUI();
    this.initEventListeners();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. WebGLRenderer with ACES Filmic Tone Mapping and soft shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 2. Camera: Cinematic Apple focal length (34 deg FOV)
    this.camera = new THREE.PerspectiveCamera(
      34,
      window.innerWidth / window.innerHeight,
      0.1,
      50
    );
    this.camera.position.set(0, 0.40, 3.8);

    // 3. Orbit Controls (Disabled by default, toggleable via UI button)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 6.0;
    this.controls.enabled = false;
  }

  initScene() {
    this.scene = new THREE.Scene();

    // 1. Studio Softbox Environment & Lights
    this.lighting = setupStudioEnvironment(this.scene, this.renderer);

    // 2. Build High-Precision 3D AirPods Max & Smart Case
    this.model = buildAirPodsMaxModel(this.renderer);
    this.scene.add(this.model.rootGroup);

    // 3. 3D-to-2D Screen Space Leader Lines Overlay
    this.leaderLines = new LeaderLinesOverlay(document.body, this.camera, this.model.anchors);

    // 4. Choreographer
    this.choreographer = new Choreographer({
      camera: this.camera,
      model: this.model,
      lighting: this.lighting,
      leaderLines: this.leaderLines,
      sound,
      onColorwayChange: (colorKey) => this.applyColorwayUI(colorKey, false)
    });
  }

  computeScrollProgress() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.getElementById('scrollContainer')?.scrollHeight || 0
    );
    const maxScroll = Math.max(1, scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(1, scrollY / maxScroll));
  }

  initLenis() {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      autoRaf: false
    });

    this.lenis.on('scroll', (e) => {
      if (this.isFreeOrbit) return;
      const scrollY = e.scroll;
      const maxScroll = e.limit || (document.documentElement.scrollHeight - window.innerHeight);
      this.targetScrollProgress = Math.max(0, Math.min(1, scrollY / (maxScroll || 1)));
    });

    // Native scroll fallback listener to ensure 100% responsiveness
    window.addEventListener('scroll', () => {
      if (this.isFreeOrbit) return;
      this.targetScrollProgress = this.computeScrollProgress();
    }, { passive: true });
  }

  initUI() {
    this.navBtns = document.querySelectorAll('.nav-link-btn');
    this.railDots = document.querySelectorAll('.rail-dot');
    this.swatches = document.querySelectorAll('.color-swatch');
    this.contentWrappers = document.querySelectorAll('.scroll-section .content-wrapper');
    this.dockLabel = document.getElementById('dockColorName');

    // Stage targets for jump clicks
    this.stageScrollMap = [0.0, 0.18, 0.35, 0.50, 0.65, 0.80, 0.95];

    // Nav stage clicks
    this.navBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const stageIdx = parseInt(btn.dataset.stage, 10);
        this.scrollToStage(stageIdx);
      });
    });

    // Rail dot clicks
    this.railDots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        const stageIdx = parseInt(dot.dataset.stage, 10);
        this.scrollToStage(stageIdx);
      });
    });

    // Color Swatches
    this.swatches.forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        const colorKey = swatch.dataset.color;
        this.applyColorway(colorKey);
      });
    });

    // Audio Mute Toggle
    const audioBtn = document.getElementById('audioToggleBtn');
    const audioLabel = document.getElementById('audioLabel');
    audioBtn.addEventListener('click', () => {
      const muted = sound.toggleMute();
      if (muted) {
        audioLabel.textContent = 'Muted';
        audioBtn.classList.remove('active');
      } else {
        audioLabel.textContent = 'Audio On';
        audioBtn.classList.add('active');
        sound.playSpatialChime();
      }
    });

    // 360 Orbit Toggle
    const orbitBtn = document.getElementById('orbitToggleBtn');
    orbitBtn.addEventListener('click', () => {
      this.isFreeOrbit = !this.isFreeOrbit;
      this.controls.enabled = this.isFreeOrbit;
      this.choreographer.setFreeOrbit(this.isFreeOrbit);

      if (this.isFreeOrbit) {
        orbitBtn.classList.add('active');
        document.getElementById('orbitLabel').textContent = 'Exit Orbit';
        this.controls.target.copy(this.choreographer.lookAtTarget);
        this.container.style.pointerEvents = 'auto';
        this.canvas.style.pointerEvents = 'auto';
        this.lenis.stop();
      } else {
        orbitBtn.classList.remove('active');
        document.getElementById('orbitLabel').textContent = '360° Inspect';
        this.container.style.pointerEvents = 'none';
        this.canvas.style.pointerEvents = 'none';
        this.lenis.start();
      }
    });

    // Purchase Buttons
    const triggerConfetti = () => {
      sound.playSpatialChime();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#0071e3', '#ffffff', '#e1e3e6', '#7a98ab']
      });
    };

    document.getElementById('navBuyBtn').addEventListener('click', triggerConfetti);
    document.getElementById('finaleBuyBtn').addEventListener('click', triggerConfetti);
  }

  scrollToStage(stageIdx) {
    if (this.isFreeOrbit) {
      // Exit orbit mode if user clicks a stage jump
      document.getElementById('orbitToggleBtn').click();
    }

    const targetP = this.stageScrollMap[stageIdx] || 0;
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.getElementById('scrollContainer')?.scrollHeight || 0
    );
    const maxScroll = Math.max(1, scrollHeight - window.innerHeight);
    const targetY = targetP * maxScroll;

    this.lenis.scrollTo(targetY, { duration: 1.2 });
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  applyColorway(colorKey) {
    this.currentColorway = colorKey;
    this.model.setColorway(colorKey);
    this.applyColorwayUI(colorKey, true);
    sound.playSpatialChime();
  }

  applyColorwayUI(colorKey, syncModel = false) {
    const colorway = COLORWAYS[colorKey] || COLORWAYS.silver;

    // Update ambient radial backdrop gradient
    if (this.ambientBackdrop) {
      this.ambientBackdrop.style.background = colorway.bgGradient;
    }

    // Toggle theme dark class on body
    if (colorKey === 'spaceGray') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }

    // Update dock label
    if (this.dockLabel) {
      this.dockLabel.textContent = colorway.name;
    }

    // Update active swatch
    this.swatches.forEach((s) => {
      if (s.dataset.color === colorKey) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    if (syncModel) {
      this.model.setColorway(colorKey);
    }
  }

  updateActiveStageUI(progress) {
    let activeStage = 0;
    if (progress < 0.12) activeStage = 0;
    else if (progress < 0.26) activeStage = 1;
    else if (progress < 0.44) activeStage = 2;
    else if (progress < 0.58) activeStage = 3;
    else if (progress < 0.72) activeStage = 4;
    else if (progress < 0.88) activeStage = 5;
    else activeStage = 6;

    // Update nav links
    this.navBtns.forEach((btn, idx) => {
      if (idx === activeStage) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Update rail dots
    this.railDots.forEach((dot, idx) => {
      if (idx === activeStage) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    // Update content wrappers visibility
    this.contentWrappers.forEach((wrap, idx) => {
      if (idx === activeStage) wrap.classList.add('visible');
      else wrap.classList.remove('visible');
    });
  }

  initEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.targetScrollProgress = this.computeScrollProgress();
    });

    // Mouse parallax micro-tilt (subtle tactile Apple interaction)
    window.addEventListener('mousemove', (e) => {
      if (this.isFreeOrbit) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      this.model.rootGroup.position.x = nx * 0.04;
      this.model.rootGroup.position.y = -ny * 0.04;
    });
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const elapsedTime = now / 1000;

    // 1. Lenis smooth scroll update
    if (this.lenis && !this.isFreeOrbit) {
      this.lenis.raf(time);
    }

    // 2. Smoothly scrub scroll progress with easing
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.14;

    // 3. Update Choreographer
    this.choreographer.update(this.scrollProgress, delta, elapsedTime);

    // 4. Update UI stage state
    this.updateActiveStageUI(this.scrollProgress);

    // 5. Update Orbit Controls if free look enabled
    if (this.isFreeOrbit && this.controls) {
      this.controls.update();
    }

    // 6. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new AirPodsShowcaseApp();
});
