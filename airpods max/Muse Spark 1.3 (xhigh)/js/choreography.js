/**
 * choreography.js — scroll choreography for the AirPods Max showcase.
 *
 * Drives ONE persistent model through 7 scroll stages using smoothed
 * scroll progress (0..1). Self-contained: no Lenis / GSAP import needed.
 * If GSAP ScrollTrigger happens to be global we simply ignore it — the
 * lerp pipeline below is the single source of truth.
 *
 * Exposes: { setColorway, getProgress, destroy }
 */

/* ------------------------------------------------------------------ */
/*  Colorways                                                          */
/* ------------------------------------------------------------------ */

const COLORWAYS = [
  { id: "silver",    name: "Silver",    alu: "#e8e8ea", knit: "#f0f0f2" },
  { id: "space-gray",name: "Space Gray",alu: "#3a3d40", knit: "#2a2c2e" },
  { id: "sky-blue",  name: "Sky Blue",  alu: "#a7c1d9", knit: "#7fa8c9" },
  { id: "pink",      name: "Pink",      alu: "#f4c2c2", knit: "#e8a0bf" },
  { id: "green",     name: "Green",     alu: "#b5d3b5", knit: "#6ba57a" },
];

const COLORWAY_ALIASES = {
  "space gray": "space-gray",
  "spacegray": "space-gray",
  "space_gray": "space-gray",
  "sky blue": "sky-blue",
  "skyblue": "sky-blue",
  "sky_blue": "sky-blue",
};

/* ------------------------------------------------------------------ */
/*  Stage keyframes — progress edges, camera, model pose               */
/* ------------------------------------------------------------------ */
/*
 * `t` windows (S2..S7 feature params) are derived from the local stage t
 * inside applyStage — see featureT() below. Keyframes below describe the
 * continuous camera / model path; feature stages add their own effects.
 */

const STAGE_EDGES = [0, 0.12, 0.26, 0.44, 0.58, 0.72, 0.88, 1];

const KEYFRAMES = [
  // S1 Hero — front three-quarter
  { p: 0.0,  cam: [ 3.4, 0.4, 7.0], tgt: [0, 0.15, 0], rotY: -0.32, posY: 0.0 },
  // S2 Color — slow orbit
  { p: 0.12, cam: [ 3.4, 0.4, 7.0], tgt: [0, 0.15, 0], rotY: 0.0,   posY: 0.0 },
  { p: 0.26, cam: [ 5.2, 0.3, 6.0], tgt: [0, 0.15, 0], rotY: 0.6,   posY: 0.0 },
  // S3 Crown macro — pushed toward right cup (anchor-projected at runtime,
  //     approximated here by the end-of-orbit pose + live anchor offsets)
  { p: 0.44, cam: [ 3.1, 1.15, 3.4], tgt: [0.9, 0.9, 0], rotY: 0.55, posY: 0.1 },
  // S4 Knit macro — canopy underside -> ear cushion
  { p: 0.58, cam: [-1.4, -0.7, 3.1], tgt: [0.1, -0.25, 0], rotY: 0.42, posY: 0.0 },
  // S5 Cushion detach
  { p: 0.72, cam: [ 2.8, 0.5, 5.6], tgt: [0, 0.1, 0], rotY: 0.18, posY: 0.05 },
  // S6 Exploded — side three-quarter
  { p: 0.88, cam: [ 5.6, 0.9, 4.2], tgt: [0, 0.2, 0], rotY: -0.9, posY: 0.15 },
  // S7 Case finale — pulled back, slightly above
  { p: 1.0,  cam: [ 2.6, 1.6, 6.8], tgt: [0, -0.2, 0], rotY: -0.2, posY: -0.55 },
];

/* Which anchors get leader lines per stage index (1-based). */
const STAGE_ANCHORS = {
  3: ["crown", "noise"],
  4: ["canopy", "cushion"],
  6: ["driver", "h1", "shell"],
};

/* Callout copy shown for each anchor id. */
const CALLOUT_COPY = {
  crown:   { title: "Digital Crown",        body: "Precision-milled aluminium. Turn for effortless volume control.", chip: "Haptic" },
  noise:   { title: "Noise Control",        body: "Tap to switch between Active Noise Cancellation and Transparency.", chip: "ANC" },
  canopy:  { title: "Knit Mesh Canopy",     body: "Breathable engineered mesh distributes weight evenly across your head.", chip: "Comfort" },
  cushion: { title: "Memory-Foam Cushion",  body: "Acoustically sealed, protein-leather cushions. Magnetic, removable.", chip: "Sealed" },
  driver:  { title: "40 mm Dynamic Driver", body: "High-excursion acoustics for deep, controlled bass and crisp highs.", chip: "H1" },
  h1:      { title: "Apple H1 Chip",        body: "Computational audio tunes every frequency, 10x faster than real time.", chip: "10x" },
  shell:   { title: "Anodized Shell",       body: "Aerospace-grade aluminium, finished in five signature colours.", chip: "Alu" },
};

/* ------------------------------------------------------------------ */
/*  Easing + interpolation helpers                                     */
/* ------------------------------------------------------------------ */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

function lerpVec3(out, a, b, t) {
  out.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  return out;
}

/* Find stage index (1-based) + local t for a global progress value. */
function stageAt(p) {
  for (let i = 0; i < STAGE_EDGES.length - 1; i++) {
    const start = STAGE_EDGES[i];
    const end = STAGE_EDGES[i + 1];
    if (p >= start && p <= end) {
      const span = end - start || 1;
      return { stage: i + 1, local: clamp01((p - start) / span) };
    }
  }
  return p >= 1 ? { stage: 7, local: 1 } : { stage: 1, local: 0 };
}

/* Interpolate keyframe arrays at global progress p. Returns { cam, tgt, rotY, posY }. */
function sampleKeyframes(p, camOut, tgtOut) {
  if (p <= KEYFRAMES[0].p) {
    return { cam: lerpVec3(camOut, KEYFRAMES[0].cam, KEYFRAMES[0].cam, 0),
             tgt: lerpVec3(tgtOut, KEYFRAMES[0].tgt, KEYFRAMES[0].tgt, 0),
             rotY: KEYFRAMES[0].rotY, posY: KEYFRAMES[0].posY };
  }
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (p >= a.p && p <= b.p) {
      const span = b.p - a.p || 1;
      const e = smoothstep((p - a.p) / span);
      return {
        cam: lerpVec3(camOut, a.cam, b.cam, e),
        tgt: lerpVec3(tgtOut, a.tgt, b.tgt, e),
        rotY: lerp(a.rotY, b.rotY, e),
        posY: lerp(a.posY, b.posY, e),
      };
    }
  }
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  return { cam: lerpVec3(camOut, last.cam, last.cam, 0),
           tgt: lerpVec3(tgtOut, last.tgt, last.tgt, 0),
           rotY: last.rotY, posY: last.posY };
}

/* ------------------------------------------------------------------ */
/*  Main factory                                                       */
/* ------------------------------------------------------------------ */

export function createChoreography({ model, camera, scene, renderer, dom } = {}) {
  if (!model || !camera) {
    throw new Error("createChoreography requires { model, camera }.");
  }

  const THREE_V3 = camera.position && camera.position.isVector3;
  const modelObj = model.group || model;
  const scrollRoot = dom?.scroll || document.getElementById("scroll");
  let leadersSVG = dom?.leaders || document.getElementById("leaders");
  const swatchRoot = dom?.swatches || document.getElementById("swatches");
  const progressRoot = dom?.progress || document.getElementById("progress");
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LERP_FACTOR = reducedMotion ? 1 : 0.08;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let raf = 0;
  let destroyed = false;
  let targetProgress = 0;
  let smoothed = 0;
  let currentStage = 0;
  let manualColorway = -1; // -1 = auto-cycle allowed
  let appliedColorway = -1;
  let pointerX = 0;
  let pointerY = 0;
  let parX = 0;
  let parY = 0;
  let lastTime = performance.now();

  const camVec = new camera.position.constructor(0, 0, 0);
  const tgtVec = new camera.position.constructor(0, 0, 0);
  const worldVec = new camera.position.constructor(0, 0, 0);
  const crownWorld = new camera.position.constructor(0, 0, 0);
  const crownBaseOffset = new camera.position.constructor(1.2, 0.9, 0);
  const crownIsLive = { value: false };

  /* ---------------- scroll target ---------------- */

  function measureTarget() {
    if (!scrollRoot) return 0;
    const max = scrollRoot.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return clamp01(window.scrollY / max);
  }

  function onScroll() {
    targetProgress = measureTarget();
    if (targetProgress > 0.005) document.body.classList.add("has-scrolled");
  }

  /* ---------------- colorways ---------------- */

  function resolveColorway(input) {
    if (typeof input === "number") {
      const i = Math.round(input);
      return COLORWAYS[i] && i >= 0 ? COLORWAYS[i] : null;
    }
    if (!input) return null;
    const key = String(input).toLowerCase().trim();
    if (COLORWAY_ALIASES[key]) return COLORWAYS.find((c) => c.id === COLORWAY_ALIASES[key]);
    const value = String(input).toLowerCase().trim();
    return COLORWAYS.find((c) => c.id === value || c.name.toLowerCase() === value) || null;
  }

  function applyColorway(cw, { updateDom = true } = {}) {
    if (!cw || cw.id === null) return;
    if (appliedColorway === COLORWAYS.indexOf(cw)) return;
    appliedColorway = COLORWAYS.indexOf(cw);

    // Model API: string id, name, or full object — model picks what it needs.
    if (typeof model.setColorway === "function") {
      try {
        model.setColorway(cw.id, cw);
      } catch {
        try { model.setColorway(cw); } catch { /* model may not implement */ }
      }
    }

    if (updateDom) {
      document.documentElement.style.setProperty("--accent", cw.alu);
      document.documentElement.style.setProperty("--accent-knit", cw.knit);
      if (swatchRoot) {
        swatchRoot.querySelectorAll("button[data-color]").forEach((btn) => {
          const id = (btn.dataset.color || "").toLowerCase();
          const resolved = COLORWAY_ALIASES[id] || id;
          btn.classList.toggle("is-active", resolved === cw.id);
          btn.setAttribute("aria-pressed", String(resolved === cw.id));
        });
        const label = swatchRoot.querySelector(".swatch-label");
        if (label) label.textContent = cw.name;
      }
    }
  }

  function setColorway(input) {
    const cw = resolveColorway(input);
    if (!cw) return null;
    manualColorway = COLORWAYS.indexOf(cw);
    applyColorway(cw);
    return cw.id;
  }

  function autoCycleColorway(stage, local) {
    // S2 only: local t sweeps the 5 colorways; a manual tap overrides.
    if (stage !== 2) return;
    if (manualColorway >= 0) return;
    const idx = Math.min(COLORWAYS.length - 1, Math.floor(local * COLORWAYS.length));
    applyColorway(COLORWAYS[idx]);
  }

  function initSwatches() {
    if (!swatchRoot) return;
    const buttons = Array.from(swatchRoot.querySelectorAll("button[data-color]"));
    // Hydrate swatch paint if the markup only carries data-color.
    buttons.forEach((btn) => {
      const cw = resolveColorway(btn.dataset.color);
      if (cw) {
        btn.style.setProperty("--swatch", cw.alu);
        btn.title = cw.name;
      }
      btn.addEventListener("click", () => setColorway(btn.dataset.color));
    });
    if (buttons.length && appliedColorway < 0) {
      const first = resolveColorway(buttons[0].dataset.color) || COLORWAYS[0];
      applyColorway(first);
    } else if (appliedColorway < 0) {
      applyColorway(COLORWAYS[0]);
    }
  }

  /* ---------------- anchors + leader lines ---------------- */

  function resolveAnchor(id) {
    const candidates = [
      model.getAnchor?.(id),
      dom?.anchors?.[id],
      model.anchors?.[id],
      model.anchorPoints?.[id],
      model[id + "Anchor"],
      model[id],
    ];
    for (const c of candidates) {
      if (c && typeof c.getWorldPosition === "function") return c;
    }
    return null;
  }

  const leaders = []; // { id, anchor, line, ring, dot, card, offsetX }
  const calloutRoot = document.getElementById("callouts");

  function ensureLeaderDOM() {
    if (!leadersSVG || !leadersSVG.ownerSVGElement && leadersSVG.tagName !== "svg") {
      // #leaders may be a plain div — upgrade to SVG on the fly.
      if (leadersSVG && leadersSVG.tagName.toLowerCase() !== "svg") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "leaders";
        svg.setAttribute("aria-hidden", "true");
        leadersSVG.replaceWith(svg);
        leadersSVG = svg;
      }
    }
  }

  function buildLeader(id) {
    const anchor = resolveAnchor(id);
    if (!anchor) return null;
    const copy = CALLOUT_COPY[id] || { title: id, body: "", chip: "" };
    const NS = "http://www.w3.org/2000/svg";

    const line = document.createElementNS(NS, "line");
    const ring = document.createElementNS(NS, "circle");
    ring.setAttribute("r", "7");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "3");
    dot.classList.add("leader-dot");
    leadersSVG.append(line, ring, dot);

    // Reuse server-rendered card when present, else create one.
    let card = document.querySelector(`[data-callout="${id}"]`);
    if (!card) {
      card = document.createElement("aside");
      card.className = "callout";
      card.dataset.callout = id;
      card.innerHTML = `<h4>${copy.title}</h4><p>${copy.body}</p>` +
        (copy.chip ? `<span class="chip">${copy.chip}</span>` : "");
      (calloutRoot || document.body).appendChild(card);
    }

    const entry = { id, anchor, line, ring, dot, card, visible: false };
    leaders.push(entry);
    return entry;
  }

  function initLeaders() {
    ensureLeaderDOM();
    if (!leadersSVG) return;
    const ids = new Set(Object.values(STAGE_ANCHORS).flat());
    ids.forEach((id) => buildLeader(id));
  }

  function projectToScreen(obj, out) {
    obj.getWorldPosition(out);
    out.project(camera);
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: (out.x * 0.5 + 0.5) * w, y: (-out.y * 0.5 + 0.5) * h, behind: out.z > 1 };
  }

  function updateLeaders(stage) {
    const activeIds = new Set(STAGE_ANCHORS[stage] || []);
    const anyActive = activeIds.size > 0;
    if (leadersSVG) leadersSVG.classList.toggle("is-active", anyActive);

    for (const L of leaders) {
      const shouldShow = activeIds.has(L.id);
      if (!shouldShow || !L.anchor) {
        if (L.card) L.card.classList.remove("is-visible");
        L.line.setAttribute("opacity", "0");
        L.ring.setAttribute("opacity", "0");
        L.dot.setAttribute("opacity", "0");
        continue;
      }
      const p = projectToScreen(L.anchor, worldVec);
      if (p.behind || p.x < -80 || p.x > window.innerWidth + 80 ||
          p.y < -80 || p.y > window.innerHeight + 80) {
        L.line.setAttribute("opacity", "0");
        L.ring.setAttribute("opacity", "0");
        L.dot.setAttribute("opacity", "0");
        L.card.classList.remove("is-visible");
        continue;
      }
      // Card sits offset from the anchor; the line connects anchor -> card edge.
      const cx = p.x + (p.x < window.innerWidth / 2 ? 110 : -160);
      const cy = p.y - 56;
      const ex = cx + (p.x < window.innerWidth / 2 ? 0 : 150);
      L.line.setAttribute("x1", String(p.x)); L.line.setAttribute("y1", String(p.y));
      L.line.setAttribute("x2", String(ex));  L.line.setAttribute("y2", String(cy + 30));
      L.line.setAttribute("opacity", "1");
      L.ring.setAttribute("cx", String(p.x)); L.ring.setAttribute("cy", String(p.y));
      L.ring.setAttribute("opacity", "1");
      L.dot.setAttribute("cx", String(p.x));  L.dot.setAttribute("cy", String(p.y));
      L.dot.setAttribute("opacity", "1");
      L.card.style.transform = `translate(${cx}px, ${cy}px)`;
      L.card.classList.add("is-visible");
    }
  }

  /* ---------------- dynamic lights ---------------- */

  function updateLights(p, stage, local) {
    if (typeof scene?.updateLights === "function") {
      try { scene.updateLights(p); return; } catch { /* fall through */ }
    }
    if (typeof model.updateLights === "function") {
      try { model.updateLights(p); return; } catch { /* fall through */ }
    }
    const rim = scene?.rimLight || scene?.userData?.rimLight ||
      scene?.children?.find?.((c) => c.isLight && c.name === "rim");
    if (rim && rim.position) {
      const angle = p * Math.PI * 2 + (stage >= 6 ? 0.6 : 0);
      const radius = 6 + Math.sin(p * Math.PI) * 2;
      rim.position.set(Math.cos(angle) * radius, 2.5 + Math.sin(p * Math.PI * 2) * 1.2, Math.sin(angle) * radius);
    }
    const fill = scene?.userData?.fillLight;
    if (fill && fill.intensity !== undefined) {
      fill.intensity = 0.6 + 0.4 * Math.sin(stage * 1.3 + local);
    }
  }

  /* ---------------- feature stages ---------------- */

  function bell(local) {
    return Math.sin(Math.PI * clamp01(local));
  }

  function applyFeatures(stage, local, p) {
    // S3 — crown macro: crown rotates with local t, camera leans to anchor.
    if (typeof model.setCrownRotation === "function") {
      const crownT = stage === 3 ? local : p >= 0.44 ? 1 : 0;
      model.setCrownRotation(crownT * Math.PI * 2);
    } else if (model.crown?.rotation) {
      model.crown.rotation.y = (stage >= 3 ? local : 0) * Math.PI * 2;
    }

    // S5 — cushion detach: sin peak mid-stage, snap back at the end.
    if (stage === 5 || (p > 0.58 && p < 0.72)) {
      if (typeof model.setCushionDetach === "function") {
        model.setCushionDetach(bell(local));
      }
    } else if (p >= 0.72 && typeof model.setCushionDetach === "function") {
      model.setCushionDetach(0);
    }

    // S6 — exploded: bell curve (peak mid-stage), eases back by S7.
    if (typeof model.setExploded === "function") {
      model.setExploded(stage === 6 ? bell(local) : p > 0.88 ? 0 : 0);
    }

    // S7 — cup swivel + case flap. Lower into case, flap closes t 0.7..1.
    if (stage === 7 || p > 0.88) {
      if (typeof model.setCupSwivel === "function") model.setCupSwivel(local);
      if (typeof model.setCaseFlap === "function") {
        const flap = local < 0.7 ? 1 : 1 - smoothstep((local - 0.7) / 0.3);
        model.setCaseFlap(flap);
      }
      if (typeof model.setCaseFit === "function") model.setCaseFit(local);
      const cta = document.getElementById("cta");
      if (cta) cta.style.opacity = local > 0.7 ? String(smoothstep((local - 0.7) / 0.3)) : "0";
    }
  }

  /* ---------------- crown-anchored camera refinement ---------------- */

  function refineCrownCamera(stage, local, cam, tgt) {
    const crown = resolveAnchor("crown");
    if (!crown || stage !== 3) {
      crownIsLive.value = false;
      return;
    }
    crown.getWorldPosition(crownWorld);
    crownIsLive.value = true;
    // Camera target tracks the crown; position blends base keyframe -> macro
    // offset from the anchor so it stays glued when the model moves.
    const dist = lerp(3.4, 1.9, smoothstep(local));
    const macro = { x: crownWorld.x + 0.8, y: crownWorld.y + 0.55, z: crownWorld.z + dist * 0.72 };
    const blend = 0.55;
    cam.set(lerp(cam.x, macro.x, blend), lerp(cam.y, macro.y, blend), lerp(cam.z, macro.z, blend));
    tgt.set(crownWorld.x, crownWorld.y, crownWorld.z);
    void crownBaseOffset;
  }

  /* ---------------- reveal on scroll ---------------- */

  let observer = null;
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          observer.unobserve(e.target);
        }
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => observer.observe(el));
  }

  /* ---------------- progress dots ---------------- */

  let dots = [];
  function initProgress() {
    if (!progressRoot) return;
    dots = Array.from(progressRoot.querySelectorAll(".dot, button"));
    dots.forEach((dot, i) => {
      if (dot.tagName === "BUTTON" && !dot.dataset.stage) {
        dot.dataset.stage = String(i + 1);
        dot.setAttribute("aria-label", `Go to section ${i + 1}`);
        dot.addEventListener("click", () => {
          const target = scrollRoot?.children[i];
          target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
        });
      }
    });
  }

  function syncProgressDots(stage) {
    dots.forEach((dot) => {
      dot.classList.toggle("is-active", Number(dot.dataset.stage) === stage);
    });
  }

  /* ---------------- pointer parallax ---------------- */

  function onPointerMove(e) {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  /* ---------------- resize ---------------- */

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix?.();
    if (renderer && typeof renderer.setSize === "function") {
      renderer.setSize(w, h, false);
      if (typeof renderer.setPixelRatio === "function") renderer.setPixelRatio(DPR);
    }
    if (leadersSVG) {
      leadersSVG.setAttribute("width", String(w));
      leadersSVG.setAttribute("height", String(h));
    }
    targetProgress = measureTarget();
  }

  /* ---------------- camera + model pose ---------------- */

  function applyPose(p, stage, local) {
    const { cam, tgt, rotY, posY } = sampleKeyframes(p, camVec, tgtVec);
    refineCrownCamera(stage, local, cam, tgt);

    // Mouse parallax: ±0.15 offset, lerped in the frame loop.
    camera.position.set(cam.x + parX * 0.15, cam.y - parY * 0.15, cam.z);
    camera.lookAt(tgt.x, tgt.y, tgt.z);

    modelObj.rotation.y = rotY;
    modelObj.position.y = posY;

    // S7 overrides the generic sink so the fit reads correctly.
    if (stage === 7 && typeof model.setCaseFit !== "function") {
      modelObj.position.y = lerp(posY, -0.55, smoothstep(local));
    }

    THREE_V3 && void 0;
  }

  /* ---------------- main loop ---------------- */

  function frame(now) {
    if (destroyed) return;
    const dt = Math.min(50, Math.max(1, now - lastTime));
    lastTime = now;
    void dt; // reserved for future time-based motion; lerp is frame-based at 60fps

    // Lenis-like smooth scroll: lerp toward the native target.
    smoothed = lerp(smoothed, targetProgress, LERP_FACTOR);
    if (Math.abs(smoothed - targetProgress) < 0.0001) smoothed = targetProgress;

    const { stage, local } = stageAt(smoothed);
    if (stage !== currentStage) {
      currentStage = stage;
      document.documentElement.style.setProperty("--stage", String(stage));
      syncProgressDots(stage);
    }

    // Parallax easing (independent of scroll smoothing).
    parX = lerp(parX, pointerX, reducedMotion ? 1 : 0.06);
    parY = lerp(parY, pointerY, reducedMotion ? 1 : 0.06);

    applyPose(smoothed, stage, local);
    applyFeatures(stage, local, smoothed);
    autoCycleColorway(stage, local);
    updateLights(smoothed, stage, local);
    updateLeaders(stage);

    renderer?.render?.(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  /* ---------------- boot ---------------- */

  initSwatches();
  initLeaders();
  initReveal();
  initProgress();
  onScroll();
  onResize();

  if (reducedMotion) smoothed = targetProgress;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  raf = requestAnimationFrame(frame);

  return {
    setColorway,
    getProgress: () => smoothed,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      observer?.disconnect();
      leaders.forEach((L) => {
        L.line.remove(); L.ring.remove(); L.dot.remove();
        L.card?.classList.remove("is-visible");
      });
      leaders.length = 0;
      if (leadersSVG) leadersSVG.classList.remove("is-active");
    },
  };
}

export default createChoreography;
