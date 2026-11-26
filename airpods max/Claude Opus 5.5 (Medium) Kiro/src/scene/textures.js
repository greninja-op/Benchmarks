// Procedural texture generation (computed once, cached on the GPU).
import * as THREE from 'three';

export function rng(seed = 1) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dataTex(data, size, { srgb = false, repeat = [1, 1] } = {}) {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.needsUpdate = true;
  return tex;
}

function heightToNormal(h, size, strength) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const yu = ((y + 1) % size) * size, yd = ((y - 1 + size) % size) * size, yr = y * size;
    for (let x = 0; x < size; x++) {
      const xr = (x + 1) % size, xl = (x - 1 + size) % size;
      const dx = (h[yr + xr] - h[yr + xl]) * strength;
      const dy = (h[yu + x] - h[yd + x]) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (yr + x) * 4;
      out[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      out[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      out[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

function blur(h, size, passes = 1) {
  let a = h, b = new Float32Array(size * size);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++)
        s += a[((y + j + size) % size) * size + ((x + i + size) % size)];
      b[y * size + x] = s / 9;
    }
    [a, b] = [b, a];
  }
  return a;
}

function grayToRGBA(g, size, alpha) {
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, g[i] * 255));
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
    out[i * 4 + 3] = alpha ? Math.max(0, Math.min(255, alpha[i] * 255)) : 255;
  }
  return out;
}

/** Bead-blasted micro-grain for anodized aluminum. */
export function makeGrainNormal(size = 512, strength = 2.2, seed = 7) {
  const r = rng(seed);
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = r();
  return dataTex(heightToNormal(blur(h, size, 1), size, strength), size);
}

/** Knit stitch (V-loops) textile: albedo + normal. */
export function makeKnit(size = 512, cells = 32, seed = 3) {
  const r = rng(seed);
  const cw = size / cells;
  const h = new Float32Array(size * size);
  const ca = Math.cos(0.55), sa = Math.sin(0.55);
  const lobe = (lx, ly, ox, sgn) => {
    const dx = lx - ox, dy = ly;
    const u = dx * ca - dy * sa * sgn, v = dx * sa * sgn + dy * ca;
    const d = (u / 0.2) ** 2 + (v / 0.5) ** 2;
    return d < 1 ? Math.sqrt(1 - d) : 0;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = x / cw, cy = y / cw;
    const lx = cx - Math.floor(cx) - 0.5, ly0 = cy - Math.floor(cy) - 0.5;
    let v = 0;
    for (let k = -1; k <= 1; k++) {
      const ly = ly0 - k;
      v = Math.max(v, lobe(lx, ly, -0.23, 1), lobe(lx, ly, 0.23, -1));
    }
    h[y * size + x] = v * 0.9 + (r() - 0.5) * 0.12;
  }
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = 0.55 + 0.45 * Math.pow(Math.max(0, h[i]), 0.6);
  return {
    map: dataTex(grayToRGBA(g, size), size, { srgb: true }),
    normalMap: dataTex(heightToNormal(h, size, 3.0), size),
  };
}

/** Fine inner acoustic mesh with a darker-weave "L" / "R". */
export function makeLetterMesh(letter, size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(size * 0.58)}px -apple-system, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size * 0.54);
  const mask = ctx.getImageData(0, 0, size, size).data;
  const h = new Float32Array(size * size), g = new Float32Array(size * size);
  const p = 7;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    // canvas row 0 is top; DataTexture row 0 is bottom -> flip mask lookup
    const m = mask[((size - 1 - y) * size + x) * 4] / 255;
    const ax = (2 * Math.PI * x) / p, ay = (2 * Math.PI * y) / p;
    const weaveA = 0.5 + 0.5 * Math.cos(ax) * Math.cos(ay * 0.5 + (Math.floor(x / p) % 2) * Math.PI);
    const ux = (x + y) * 0.7071, uy = (x - y) * 0.7071;
    const weaveB = 0.5 + 0.5 * Math.cos((2 * Math.PI * ux) / (p * 0.8)) * Math.cos((2 * Math.PI * uy) / (p * 0.8));
    const w = weaveA * (1 - m) + weaveB * m;
    h[i] = w;
    g[i] = (0.62 * (1 - m) + 0.47 * m) * (0.72 + 0.28 * w);
  }
  return {
    map: dataTex(grayToRGBA(g, size), size, { srgb: true }),
    normalMap: dataTex(heightToNormal(h, size, 1.6), size),
  };
}

/** Perforated knit canopy: albedo + alpha (perforations) + normal. */
export function makeCanopy(size = 256, spacing = 16) {
  const h = new Float32Array(size * size), a = new Float32Array(size * size), g = new Float32Array(size * size);
  const rows = size / spacing;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / spacing);
    const ox = (row % 2) * spacing * 0.5;
    const lx = ((x + ox) % spacing) - spacing / 2, ly = (y % spacing) - spacing / 2;
    const d = Math.hypot(lx, ly * 1.15) / (spacing * 0.3);
    const i = y * size + x;
    a[i] = Math.min(1, Math.max(0, (d - 0.85) * 4));
    h[i] = Math.min(1, d) * (0.8 + 0.2 * Math.cos(x * 1.3));
    g[i] = 0.7 + 0.3 * Math.min(1, d * 0.8);
  }
  void rows;
  return {
    map: dataTex(grayToRGBA(g, size), size, { srgb: true }),
    alphaMap: dataTex(grayToRGBA(a, size), size),
    normalMap: dataTex(heightToNormal(h, size, 2.5), size),
  };
}

/** Leather / microfiber grain (Worley cells) for the Smart Case. */
export function makeLeather(size = 512, cells = 40, seed = 11) {
  const r = rng(seed);
  const pts = new Float32Array(cells * cells * 2);
  for (let i = 0; i < cells * cells; i++) { pts[i * 2] = r(); pts[i * 2 + 1] = r(); }
  const h = new Float32Array(size * size);
  const cs = size / cells;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / cs, fy = y / cs, ix = Math.floor(fx), iy = Math.floor(fy);
    let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = (ix + i + cells) % cells, cy = (iy + j + cells) % cells;
      const px = ix + i + pts[(cy * cells + cx) * 2], py = iy + j + pts[(cy * cells + cx) * 2 + 1];
      const d = Math.hypot(px - fx, py - fy);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    h[y * size + x] = Math.min(1, (f2 - f1) * 3) + (r() - 0.5) * 0.15;
  }
  return { normalMap: dataTex(heightToNormal(blur(h, size, 1), size, 1.4), size) };
}

/** PCB albedo with traces, vias and silkscreen. */
export function makePCB(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = rng(21);
  ctx.fillStyle = '#10251c'; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#b08d47'; ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    ctx.lineWidth = 1 + r() * 2.5;
    let x = r() * size, y = r() * size;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const len = 20 + r() * 80, dir = Math.floor(r() * 8) * (Math.PI / 4);
      x += Math.cos(dir) * len; y += Math.sin(dir) * len; ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#d7b46a';
  for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(r() * size, r() * size, 1.5 + r() * 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(230,230,220,0.7)';
  ctx.font = '600 14px Inter, Arial';
  ctx.fillText('A2096  H1  820-02166', 24, size - 24);
  ctx.fillText('U1000', size * 0.55, size * 0.3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Laser-etched H1 package top. */
export function makeChipLabel(text = 'H1') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#1b1b1e'); g.addColorStop(1, '#0c0c0e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#8d8d92';
  ctx.textAlign = 'center';
  ctx.font = '600 92px -apple-system, "SF Pro Display", Inter, Arial';
  ctx.fillText(text, 128, 150);
  ctx.font = '500 18px Inter, Arial';
  ctx.fillText('339S00759', 128, 196);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
