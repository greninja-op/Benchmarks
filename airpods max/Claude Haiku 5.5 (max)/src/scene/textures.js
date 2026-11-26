import * as THREE from 'three';

// All textures are generated in code. Every noise field is periodic so tiles join without seams.
const N = 512;

function makeCanvas(size = N) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

/** Small deterministic PRNG (xorshift32). */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Separable box blur with wrap-around, so the result tiles seamlessly. */
function blurWrap(src, n, passes) {
  const a = Float32Array.from(src);
  const b = new Float32Array(n * n);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < n; y++) {
      const row = y * n;
      for (let x = 0; x < n; x++) {
        const xl = row + ((x - 1 + n) % n);
        const xr = row + ((x + 1) % n);
        b[row + x] = (a[xl] + a[row + x] + a[xr]) / 3;
      }
    }
    for (let y = 0; y < n; y++) {
      const yu = ((y - 1 + n) % n) * n;
      const yd = ((y + 1) % n) * n;
      const row = y * n;
      for (let x = 0; x < n; x++) a[row + x] = (b[yu + x] + b[row + x] + b[yd + x]) / 3;
    }
  }
  return a;
}

function normalizeRange(arr) {
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < mn) mn = arr[i];
    if (arr[i] > mx) mx = arr[i];
  }
  const r = mx - mn || 1;
  for (let i = 0; i < arr.length; i++) arr[i] = (arr[i] - mn) / r;
  return arr;
}

/** Tangent-space normal map from a periodic height field. Canvas-up is +V. */
function heightToNormalCanvas(h, n, strength) {
  const c = makeCanvas(n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  const d = img.data;
  for (let y = 0; y < n; y++) {
    const yu = ((y - 1 + n) % n) * n;
    const yd = ((y + 1) % n) * n;
    const row = y * n;
    for (let x = 0; x < n; x++) {
      const xl = (x - 1 + n) % n;
      const xr = (x + 1) % n;
      const dhdu = (h[row + xr] - h[row + xl]) * 0.5 * strength;
      const dhdv = (h[yu + x] - h[yd + x]) * 0.5 * strength;
      const nx = -dhdu;
      const ny = -dhdv;
      const inv = 1 / Math.hypot(nx, ny, 1);
      const i = (row + x) * 4;
      d[i] = (nx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      d[i + 2] = (inv * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Grayscale canvas from values in 0..1 (mapped into lo..hi). */
function grayCanvas(vals, n, lo = 0, hi = 1) {
  const c = makeCanvas(n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  const d = img.data;
  for (let i = 0; i < n * n; i++) {
    const v = Math.round((lo + (hi - lo) * vals[i]) * 255);
    d[i * 4] = v;
    d[i * 4 + 1] = v;
    d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
/** Diamond knit: two diagonal cosine families form a lattice of rounded stitches. */
function knitField(n, cells, seed) {
  const r = rng(seed);
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = x / n;
      const v = y / n;
      const s1 = 0.5 + 0.5 * Math.cos(2 * Math.PI * cells * (u + v));
      const s2 = 0.5 + 0.5 * Math.cos(2 * Math.PI * cells * (u - v));
      h[y * n + x] = Math.pow(s1 * s2, 0.6);
    }
  }
  const noise = new Float32Array(n * n);
  for (let i = 0; i < noise.length; i++) noise[i] = r();
  const yarn = blurWrap(noise, n, 1);
  for (let i = 0; i < h.length; i++) h[i] = h[i] * 0.88 + yarn[i] * 0.12;
  return normalizeRange(h);
}

/** Perforation mask on a dot grid. Zero marks a hole. Feeds alphaMap (green channel). */
function perforationField(n, cells) {
  const a = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const fx = ((x * cells) / n) % 1 - 0.5;
      const fy = ((y * cells) / n) % 1 - 0.5;
      const d = Math.hypot(fx, fy);
      a[y * n + x] = d < 0.2 ? 0 : d < 0.27 ? (d - 0.2) / 0.07 : 1;
    }
  }
  return a;
}

/** Bead-blast or microfiber grain: blurred white noise, periodic. */
function grainField(n, passes, seed) {
  const r = rng(seed);
  const noise = new Float32Array(n * n);
  for (let i = 0; i < noise.length; i++) noise[i] = r();
  return normalizeRange(blurWrap(noise, n, passes));
}
/**
 * Perforated speaker plate with an L or R marking.
 * Returns the color canvas plus a height field for the normal map (holes sink, housing recesses).
 */
function grilleTextures(label) {
  const c = makeCanvas(N);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d4d6da';
  ctx.fillRect(0, 0, N, N);
  const pad = 30;
  ctx.fillStyle = '#9da2a9';
  ctx.fillRect(pad, pad, N - 2 * pad, N - 2 * pad);
  const step = 20;
  const rad = 6.2;
  const rx = 160;
  const ry = 178;
  const inField = (dx, dy) => (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  ctx.fillStyle = '#2a2d33';
  for (let i = -9; i <= 9; i++) {
    for (let j = -10; j <= 10; j++) {
      const dx = i * step;
      const dy = j * step;
      if (!inField(dx, dy)) continue;
      ctx.beginPath();
      ctx.arc(N / 2 + dx, N / 2 + dy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#4b4f56';
  ctx.font = '600 54px Inter, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, N / 2, N - pad - 52);

  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let base = 0.7;
      if (x >= pad && x < N - pad && y >= pad && y < N - pad) base = 0.45;
      const ii = Math.round((x - N / 2) / step);
      const jj = Math.round((y - N / 2) / step);
      const dx = ii * step;
      const dy = jj * step;
      if (inField(dx, dy)) {
        const d = Math.hypot(x - (N / 2 + dx), y - (N / 2 + dy));
        if (d < rad + 2) {
          const t = Math.min(1, Math.max(0, (d - rad) / 2));
          base = 0.05 + 0.4 * t * t * (3 - 2 * t);
        }
      }
      h[y * N + x] = base;
    }
  }
  return { color: c, height: h };
}

/** Dark green PCB with copper traces for the H1 board. */
function pcbCanvas() {
  const c = makeCanvas(N);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b3a2b';
  ctx.fillRect(0, 0, N, N);
  const r = rng(7);
  ctx.strokeStyle = '#b68a46';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 140; i++) {
    let x = r() * N;
    let y = r() * N;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      if (r() < 0.5) x = Math.min(N - 4, Math.max(4, x + (r() - 0.5) * 140));
      else y = Math.min(N - 4, Math.max(4, y + (r() - 0.5) * 140));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#0c0d0f';
  ctx.fillRect(N * 0.3, N * 0.35, N * 0.2, N * 0.2);
  return c;
}

/** Soft radial falloff used as a fake contact shadow under the product. */
function contactCanvas() {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}
/** Builds every procedural texture once. Colors come from materials, so albedo maps stay near white. */
export function createTextures(renderer) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const make = (canvas, { srgb = false, repeat = true } = {}) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    }
    t.anisotropy = aniso;
    return t;
  };

  const knit = knitField(N, 16, 11);
  const grain = grainField(N, 2, 41);
  const caseField = grainField(N, 3, 59);
  const fabric = grainField(N, 1, 23);
  const grilleL = grilleTextures('L');
  const grilleR = grilleTextures('R');

  return {
    knitMap: make(grayCanvas(knit, N, 0.78, 1.0), { srgb: true }),
    knitNormal: make(heightToNormalCanvas(knit, N, 2.6)),
    perfAlpha: make(grayCanvas(perforationField(N, 32), N)),
    fabricNormal: make(heightToNormalCanvas(fabric, N, 1.2)),
    grainNormal: Object.assign(make(heightToNormalCanvas(grain, N, 2.4)), { repeat: new THREE.Vector2(4, 1.5) }),
    grainRough: Object.assign(make(grayCanvas(grain, N, 0.82, 1.0)), { repeat: new THREE.Vector2(4, 1.5) }),
    caseNormal: make(heightToNormalCanvas(caseField, N, 1.0)),
    grilleMapL: make(grilleL.color, { srgb: true, repeat: false }),
    grilleMapR: make(grilleR.color, { srgb: true, repeat: false }),
    grilleNormal: make(heightToNormalCanvas(grilleL.height, N, 2.6), { repeat: false }),
    pcb: make(pcbCanvas(), { srgb: true, repeat: false }),
    contact: make(contactCanvas(), { srgb: true, repeat: false }),
  };
}
