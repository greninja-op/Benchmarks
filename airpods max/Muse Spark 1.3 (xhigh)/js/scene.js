/**
 * scene.js
 * ---------------------------------------------------------------------------
 * Studio scene foundation for the AirPods Max scroll showcase.
 *
 *   createScene(THREE, renderer, container)
 *
 * - Renderer : ACES Filmic tone mapping, sRGB output, PCFSoft shadows,
 *              antialias, pixel ratio capped at 2. If `renderer` is
 *              omitted a WebGLRenderer is created and appended to
 *              `container`; a passed-in renderer is reconfigured in
 *              place (the usual case when the page owns the canvas).
 * - Camera   : PerspectiveCamera, 38 deg vertical FOV.
 * - Env      : custom "RoomEnvironment-like" studio built as a tiny
 *              scene of emissive softbox planes over a gradient
 *              backdrop, baked once with PMREMGenerator.fromScene().
 *              Assigned to scene.environment (reflections / IBL only;
 *              scene.background stays null so page CSS shows through).
 * - Lights   : shadow-casting key directional + two rim directionals
 *              (no shadow) + low hemisphere fill. updateLights() swings
 *              key/rim azimuth with scroll progress (and a gentle time
 *              sway) so specular highlights glide across surfaces.
 * - Ground   : ShadowMaterial contact-shadow plane at y = -1.1 where
 *              the product group is expected to rest / float above.
 * - Dust     : 200-point floating particle system for depth.
 * - Resize   : window resize + ResizeObserver on the container.
 *
 * Returns { scene, camera, renderer, envMap, lights, updateLights,
 *           dust, updateDust, ground, dispose }
 * where `lights = { key, rim, rimFill, hemisphere }`.
 *
 * Three.js r160+ ESM (importmap `three`). Imports nothing itself.
 */

export function createScene(THREE, renderer, container) {
  if (!THREE) throw new Error('createScene: THREE is required');

  const FOV = 38;
  const GROUND_Y = -1.1;
  const MAX_PIXEL_RATIO = 2;

  /* ------------------------------------------------------------------ */
  /* Container size (falls back to the window when no container given)  */
  /* ------------------------------------------------------------------ */

  function containerSize() {
    const w = container ? container.clientWidth : 0;
    const h = container ? container.clientHeight : 0;
    return {
      width: w > 0 ? w : window.innerWidth,
      height: h > 0 ? h : window.innerHeight,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Renderer                                                           */
  /* ------------------------------------------------------------------ */

  const createdRenderer = !renderer;
  if (createdRenderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    const { width, height } = containerSize();
    renderer.setSize(width, height);
    if (container) container.appendChild(renderer.domElement);
  }

  // Configure whichever renderer we ended up with (r160 colour API).
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

  /* ------------------------------------------------------------------ */
  /* Scene + camera                                                     */
  /* ------------------------------------------------------------------ */

  const scene = new THREE.Scene();
  // Keep the background transparent so the page's own backdrop (CSS
  // gradient etc.) remains visible; the env map below is lighting-only.
  scene.background = null;

  const { width, height } = containerSize();
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
  camera.position.set(0, 0.35, 4.4);
  camera.lookAt(0, 0, 0);

  /* ------------------------------------------------------------------ */
  /* Studio environment (PMREM from a tiny emissive-softbox scene)      */
  /*                                                                    */
  /* RoomEnvironment-style: a gradient room plus several bright planes */
  /* that act as softboxes. Colours > 1 make PMREM treat them as HDR   */
  /* emitters, which is what gives metals their long studio streaks.   */
  /* ------------------------------------------------------------------ */

  function buildStudioEnvMap() {
    const envScene = new THREE.Scene();

    // Gradient backdrop: vertical canvas gradient on an inward sphere.
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 16;
    gradCanvas.height = 256;
    const gctx = gradCanvas.getContext('2d');
    const grad = gctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#3a3f4a'); // ceiling, cool gray
    grad.addColorStop(0.45, '#181a20'); // horizon
    grad.addColorStop(1.0, '#050506'); // floor, near black
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 16, 256);
    const gradTex = new THREE.CanvasTexture(gradCanvas);
    gradTex.colorSpace = THREE.SRGBColorSpace;

    const room = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 16),
      new THREE.MeshBasicMaterial({ map: gradTex, side: THREE.BackSide })
    );
    envScene.add(room);

    // Softboxes: MeshBasicMaterial planes with HDR colour values.
    const softbox = (w, h, intensity, position, lookAtOrigin = true) => {
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      mat.color.setRGB(intensity, intensity, intensity);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.copy(position);
      if (lookAtOrigin) mesh.lookAt(0, 0, 0);
      envScene.add(mesh);
      return mesh;
    };

    softbox(14, 7, 9.0, new THREE.Vector3(0, 10, 0)); // overhead key softbox
    softbox(10, 4, 6.5, new THREE.Vector3(-9, 3, -2)); // left strip
    softbox(10, 4, 6.5, new THREE.Vector3(9, 3, -2)); // right strip
    softbox(12, 3, 3.2, new THREE.Vector3(0, 2.5, -10)); // rear rim strip
    softbox(8, 3, 1.1, new THREE.Vector3(0, 1.5, 10)); // front fill (dim)

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    return envMap;
  }

  const envMap = buildStudioEnvMap();
  scene.environment = envMap;

  /* ------------------------------------------------------------------ */
  /* Lights                                                             */
  /* ------------------------------------------------------------------ */

  const hemisphere = new THREE.HemisphereLight(0xdfe8ff, 0x1a1a1e, 0.35);
  scene.add(hemisphere);

  // Key: the only shadow-casting light. Position (and therefore the
  // highlight sweep) is driven by updateLights().
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);

  // Rims: cool / warm edge lights from behind the product, no shadow.
  const rim = new THREE.DirectionalLight(0xcfe4ff, 3.2);
  scene.add(rim);
  scene.add(rim.target);

  const rimFill = new THREE.DirectionalLight(0xffe9d0, 1.1);
  scene.add(rimFill);
  scene.add(rimFill.target);

  const lights = { key, rim, rimFill, hemisphere };

  /* ------------------------------------------------------------------ */
  /* Ground contact-shadow plane                                        */
  /* ------------------------------------------------------------------ */

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.34 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ------------------------------------------------------------------ */
  /* Floating dust particles (depth cue)                                */
  /* ------------------------------------------------------------------ */

  const DUST_COUNT = 200;
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  const dustSpeeds = new Float32Array(DUST_COUNT);
  {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (rand() - 0.5) * 7; // x
      dustPositions[i * 3 + 1] = GROUND_Y + rand() * 3.6; // y
      dustPositions[i * 3 + 2] = -2.2 + rand() * 3.4; // z
      dustSpeeds[i] = 0.02 + rand() * 0.05;
    }
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

  const dustMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false; // positions move; skip stale bounds culling
  scene.add(dust);

  /** Slow upward drift + faint horizontal sway for the dust field. */
  function updateDust(t) {
    const pos = dustGeometry.attributes.position.array;
    const top = GROUND_Y + 3.6;
    for (let i = 0; i < DUST_COUNT; i++) {
      let y = pos[i * 3 + 1] + dustSpeeds[i] * 0.016;
      if (y > top) y = GROUND_Y; // recycle at the floor
      pos[i * 3 + 1] = y;
      pos[i * 3] += Math.sin(t * 0.4 + i) * 0.00022;
    }
    dustGeometry.attributes.position.needsUpdate = true;
    dustMaterial.opacity = 0.28 + Math.sin(t * 0.25) * 0.06; // breathe
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-driven light animation                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Swing the key/rim azimuth so specular highlights glide across the
   * aluminium and knit as the user scrolls, with a gentle idle sway
   * from `t` (seconds). Call every frame from the render loop.
   *
   * @param {number} t              elapsed seconds
   * @param {number} scrollProgress 0..1 across the showcase section
   */
  function updateLights(t, scrollProgress = 0) {
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
    const sway = Math.sin(t * 0.35) * 0.12;

    // Key orbits from front-right to front-left across the scroll.
    const keyAngle = THREE.MathUtils.lerp(0.65, -0.65, p) + sway;
    key.position.set(
      Math.sin(keyAngle) * 6,
      5.2 + Math.sin(t * 0.22) * 0.35,
      Math.cos(keyAngle) * 6
    );
    key.target.position.set(0, 0, 0);
    key.intensity = 2.4 + p * 0.6;

    // Main rim stays behind the product, counter-sweeping the key so
    // the edge highlight travels in the opposite direction.
    const rimAngle = THREE.MathUtils.lerp(-2.4, 2.4, p) + sway * 0.6;
    rim.position.set(Math.sin(rimAngle) * 5, 2.6, -Math.abs(Math.cos(rimAngle)) * 5 - 2);
    rim.target.position.set(0, 0.1, 0);
    rim.intensity = 2.6 + p * 1.2;

    // Warm fill rim drifts slowly on time alone for living highlights.
    const fillAngle = 2.1 + Math.sin(t * 0.18) * 0.5;
    rimFill.position.set(Math.sin(fillAngle) * 5, 1.4, -4);
    rimFill.target.position.set(0, 0.1, 0);

    // Dust is time-driven, so fold it into the per-frame update.
    updateDust(t);
  }

  /* ------------------------------------------------------------------ */
  /* Resize handling                                                    */
  /* ------------------------------------------------------------------ */

  function onResize() {
    const { width: w, height: h } = containerSize();
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onResize);
  let observer = null;
  if (container && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(onResize);
    observer.observe(container);
  }
  onResize(); // settle initial size/aspect immediately

  /** Remove listeners / observers and free GPU resources. */
  function dispose() {
    window.removeEventListener('resize', onResize);
    if (observer) observer.disconnect();
    dustGeometry.dispose();
    dustMaterial.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
    if (envMap) envMap.dispose();
    if (createdRenderer) renderer.dispose();
  }

  return { scene, camera, renderer, envMap, lights, updateLights, dust, updateDust, ground, dispose };
}
