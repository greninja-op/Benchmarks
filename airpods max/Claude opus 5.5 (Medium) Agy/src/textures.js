// Procedural, cached PBR texture generation (albedo / normal / alpha) — no image assets.
import * as THREE from 'three';

const cache = new Map();
const cached = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
};

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise over [0,1)² with integer period. */
export function makeNoise(period, seed = 1) {
  const r = mulberry(seed);
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const I = (a, b) => g[(((b % period) + period) % period) * period + (((a % period) + period) % period)];
  return (u, v) => {
    const x = u * period, y = v * period;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const tx = x - x0, ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = I(x0, y0), b = I(x0 + 1, y0), c = I(x0, y0 + 1), d = I(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function heightToNormal(H, w, h, strength) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const yu = ((y - 1 + h) % h) * w, yd = ((y + 1) % h) * w, yc = y * w;
    for (let x = 0; x < w; x++) {
      const l = H[yc + ((x - 1 + w) % w)], r = H[yc + ((x + 1) % w)];
      const up = H[yu + x], dn = H[yd + x];
      const nx = (l - r) * strength, ny = (dn - up) * strength;
      const L = Math.hypot(nx, ny, 1);
      const i = (yc + x) * 4;
      d[i] = (nx / L * 0.5 + 0.5) * 255;
      d[i + 1] = (ny / L * 0.5 + 0.5) * 255;
      d[i + 2] = (1 / L * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function grayToCanvas(G, w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, G[i] * 255));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function toTex(canvas, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Bead-blasted aluminium micro-grain normal map. */
export function grainTextures() {
  return cached('grain', () => {
    const S = 256;
    const n1 = makeNoise(64, 3), n2 = makeNoise(128, 7), n3 = makeNoise(256, 11);
    const H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      H[y * S + x] = n1(u, v) * 0.25 + n2(u, v) * 0.35 + n3(u, v) * 0.4;
    }
    return { normal: toTex(heightToNormal(H, S, S, 2.4)) };
  });
}

/** 3D knit (V-stitch) textile used on the ear cushions. */
export function knitTextures() {
  return cached('knit', () => {
    const S = 512, cols = 16, rows = 22;
    const fib = makeNoise(256, 5), fib2 = makeNoise(128, 15), blot = makeNoise(8, 9);
    const H = new Float32Array(S * S), A = new Float32Array(S * S);
    const leg = (fx, fy, ox, oy, ang) => {
      const dx = fx - ox, dy = fy - 0.5 - oy;
      const c = Math.cos(ang), s = Math.sin(ang);
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      const e = 1 - (rx * rx) / 0.045 - (ry * ry) / 0.36;
      return e > 0 ? Math.sqrt(e) : 0;
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const cx = u * cols, cy = v * rows;
      const fx = cx - Math.floor(cx), fy = cy - Math.floor(cy);
      let h = 0;
      for (let oy = -1; oy <= 1; oy++) {
        h = Math.max(h, leg(fx, fy, 0.28, oy, 0.45), leg(fx, fy, 0.72, oy, -0.45));
      }
      h = h * 0.85 + (fib(u, v) - 0.5) * 0.12 + (fib2(u, v) - 0.5) * 0.08;
      H[y * S + x] = h;
      A[y * S + x] = 0.6 + 0.4 * Math.max(0, h) + (blot(u, v) - 0.5) * 0.05;
    }
    return { map: toTex(grayToCanvas(A, S, S), true), normal: toTex(heightToNormal(H, S, S, 3.2)) };
  });
}

/** Perforated breathable canopy mesh: albedo + normal + alpha. */
export function canopyTextures() {
  return cached('canopy', () => {
    const S = 512, cols = 14, rows = 16;
    const fib = makeNoise(256, 31);
    const H = new Float32Array(S * S), A = new Float32Array(S * S), AL = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const cy = v * rows, iy = Math.floor(cy);
      const shift = (iy % 2) * 0.5;
      const cx = u * cols - shift;
      const fx = cx - Math.floor(cx) - 0.5, fy = cy - iy - 0.5;
      const d = Math.hypot(fx * 1.0, fy * 1.15);
      const r = 0.27;
      const t = Math.min(1, Math.max(0, (d - r + 0.05) / 0.1));
      const alpha = t * t * (3 - 2 * t);
      const weave = 0.65 + 0.35 * Math.cos(fx * Math.PI * 2) * Math.cos(fy * Math.PI * 2);
      const h = alpha * weave + (fib(u, v) - 0.5) * 0.1;
      H[y * S + x] = h;
      A[y * S + x] = 0.72 + 0.28 * h;
      AL[y * S + x] = alpha;
    }
    return {
      map: toTex(grayToCanvas(A, S, S), true),
      normal: toTex(heightToNormal(H, S, S, 2.5)),
      alpha: toTex(grayToCanvas(AL, S, S)),
    };
  });
}

/** Inner acoustic mesh with woven "L" / "R" glyph. */
export function lrTextures(letter) {
  return cached('lr' + letter, () => {
    const S = 1024;
    const mc = makeCanvas(S, S);
    const mx = mc.getContext('2d');
    mx.fillStyle = '#000'; mx.fillRect(0, 0, S, S);
    mx.fillStyle = '#fff';
    mx.font = `600 ${Math.round(S * 0.42)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    mx.textAlign = 'center'; mx.textBaseline = 'middle';
    mx.fillText(letter, S / 2, S * 0.52);
    const M = mx.getImageData(0, 0, S, S).data;
    const fib = makeNoise(256, 41);
    const H = new Float32Array(S * S), A = new Float32Array(S * S);
    const D = 70;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const a = (u + v) * D, b = (u - v) * D;
      const fa = a - Math.floor(a), fb = b - Math.floor(b);
      const base = Math.pow(Math.sin(Math.PI * fa) * Math.sin(Math.PI * fb), 0.6);
      const rib = 0.5 + 0.5 * Math.sin(v * S * 0.9);
      const m = M[(y * S + x) * 4] / 255;
      const n = (fib(u, v) - 0.5) * 0.1;
      const h = base * (1 - m) + rib * 0.8 * m + n;
      H[y * S + x] = h;
      A[y * S + x] = (0.62 + 0.25 * base) * (1 - m) + (0.34 + 0.12 * rib) * m;
    }
    return { map: toTex(grayToCanvas(A, S, S), true), normal: toTex(heightToNormal(H, S, S, 2.2)) };
  });
}

function drawGrille(ctx, S, heightMode) {
  ctx.fillStyle = heightMode ? '#ffffff' : '#3b3c40';
  ctx.fillRect(0, 0, S, S);
  if (!heightMode) {
    const g = ctx.createRadialGradient(S * 0.5, S * 0.45, S * 0.05, S * 0.5, S * 0.5, S * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }
  // recessed inner panel
  const rr = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  ctx.fillStyle = heightMode ? '#9a9a9a' : '#2c2d30';
  rr(S * 0.2, S * 0.17, S * 0.6, S * 0.66, S * 0.17); ctx.fill();
  // perforation array (hex packed, elliptical boundary)
  const sp = S * 0.072, hr = S * 0.026;
  ctx.fillStyle = heightMode ? '#000000' : '#060607';
  for (let r = -4; r <= 4; r++) {
    for (let c = -5; c <= 5; c++) {
      const x = S / 2 + c * sp + (Math.abs(r) % 2) * sp * 0.5;
      const y = S * 0.5 + r * sp * 0.88;
      const ex = (x - S / 2) / (S * 0.25), ey = (y - S * 0.5) / (S * 0.29);
      if (ex * ex + ey * ey < 1) { ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // optical / proximity sensor window
  ctx.fillStyle = heightMode ? '#555' : '#101012';
  ctx.beginPath(); ctx.arc(S * 0.7, S * 0.22, S * 0.024, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = heightMode ? '#888' : '#5d5e62'; ctx.lineWidth = S * 0.005; ctx.stroke();
  // screws / magnet seats
  ctx.fillStyle = heightMode ? '#cfcfcf' : '#77787c';
  for (const [x, y] of [[0.14, 0.16], [0.86, 0.16], [0.14, 0.84], [0.86, 0.84], [0.5, 0.08], [0.5, 0.92]]) {
    ctx.beginPath(); ctx.arc(S * x, S * y, S * 0.013, 0, Math.PI * 2); ctx.fill();
  }
}

/** Perforated acoustic housing (planar mapped). */
export function grilleTextures() {
  return cached('grille', () => {
    const S = 1024;
    const c = makeCanvas(S, S);
    drawGrille(c.getContext('2d'), S, false);
    const hc = makeCanvas(S, S);
    const hctx = hc.getContext('2d');
    drawGrille(hctx, S, true);
    const d = hctx.getImageData(0, 0, S, S).data;
    const H = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) H[i] = d[i * 4] / 255;
    const map = toTex(c, true);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const normal = toTex(heightToNormal(H, S, S, 6));
    normal.wrapS = normal.wrapT = THREE.ClampToEdgeWrapping;
    return { map, normal };
  });
}

/** Soft-touch leather/microfiber grain for the Smart Case. */
export function leatherTextures() {
  return cached('leather', () => {
    const S = 512;
    const n1 = makeNoise(48, 21), n2 = makeNoise(96, 22), n3 = makeNoise(192, 23);
    const H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const r = 1 - Math.abs(n1(u, v) * 2 - 1);
      H[y * S + x] = r * r * 0.55 + n2(u, v) * 0.28 + n3(u, v) * 0.17;
    }
    return { normal: toTex(heightToNormal(H, S, S, 2.2)) };
  });
}

/** H1 chip lid marking. */
export function chipTexture() {
  return cached('h1', () => {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, S - 20, S - 20);
    ctx.fillStyle = '#c9c9cf';
    ctx.font = '600 92px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('H1', S / 2, S / 2 + 4);
    const t = toTex(c, true);
    return t;
  });
}
