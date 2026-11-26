import * as THREE from 'three';

const cache = new Map();

function canvasTex(size, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = opts.w || size;
  c.height = opts.h || size;
  const ctx = c.getContext('2d');
  draw(ctx, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(opts.rx || 1, opts.ry || 1);
  return t;
}

/** Diamond knit for cushions/canopy — albedo + bump share the same weave */
export function knitTextures(base = '#e8e8ea', dark = '#c9c9cf') {
  const key = `knit-${base}-${dark}`;
  if (cache.has(key)) return cache.get(key);
  const draw = (ctx, w, h, forBump) => {
    ctx.fillStyle = forBump ? '#808080' : base;
    ctx.fillRect(0, 0, w, h);
    const s = 16;
    for (let y = 0; y < h / s + 1; y++) {
      for (let x = 0; x < w / s + 1; x++) {
        const ox = (y % 2) * s * 0.5;
        const cx = x * s + ox, cy = y * s;
        // diamond stitch
        const g = ctx.createLinearGradient(cx, cy, cx + s, cy + s);
        if (forBump) {
          g.addColorStop(0, '#a8a8a8'); g.addColorStop(0.5, '#e8e8e8'); g.addColorStop(1, '#909090');
        } else {
          g.addColorStop(0, base); g.addColorStop(0.5, dark); g.addColorStop(1, base);
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + s * 0.5, cy + s * 0.35);
        ctx.lineTo(cx + s, cy);
        ctx.lineTo(cx + s * 0.5, cy + s * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = forBump ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.10)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  };
  const map = canvasTex(512, (c, w, h) => draw(c, w, h, false), { rx: 3, ry: 3 });
  const bumpMap = canvasTex(512, (c, w, h) => draw(c, w, h, true), { srgb: false, rx: 3, ry: 3 });
  const out = { map, bumpMap };
  cache.set(key, out);
  return out;
}

/** Fine bead-blasted micro grain for anodized aluminum */
export function microGrain() {
  if (cache.has('grain')) return cache.get('grain');
  const bump = canvasTex(256, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 118 + Math.random() * 22;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false, rx: 4, ry: 4 });
  const rough = canvasTex(256, (ctx, w, h) => {
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 52 + Math.random() * 18;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false, rx: 2, ry: 2 });
  const out = { bump, rough };
  cache.set('grain', out);
  return out;
}

/** Perforated canopy alpha (breathable holes) */
export function canopyAlpha() {
  if (cache.has('canopyAlpha')) return cache.get('canopyAlpha');
  const t = canvasTex(512, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    const s = 14;
    for (let y = 0; y < h / s; y++)
      for (let x = 0; x < w / s; x++) {
        const ox = (y % 2) * s * 0.5;
        ctx.beginPath();
        ctx.arc(x * s + ox, y * s, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
  }, { srgb: false, rx: 6, ry: 2 });
  cache.set('canopyAlpha', t);
  return t;
}

/** Inner acoustic mesh with woven L / R letter */
export function acousticMesh(letter = 'L', tint = '#d7d7db') {
  const key = `acoustic-${letter}-${tint}`;
  if (cache.has(key)) return cache.get(key);
  const map = canvasTex(512, (ctx, w, h) => {
    ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h);
    // fine weave
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }
    // perforation dots (speaker holes feel)
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 20; y < h; y += 26)
      for (let x = 20; x < w; x += 26) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    // letter
    ctx.fillStyle = 'rgba(60,60,70,0.85)';
    ctx.font = '700 150px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, w / 2, h / 2);
  }, { rx: 1, ry: 1 });
  cache.set(key, map);
  return map;
}

/** Speaker baffle perforation (holes) */
export function baffleTexture() {
  if (cache.has('baffle')) return cache.get('baffle');
  const t = canvasTex(512, (ctx, w, h) => {
    ctx.fillStyle = '#2a2c31'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0b0c0e';
    const cx = w / 2, cy = h / 2;
    for (let r = 0; r < 9; r++)
      for (let a = 0; a < 28; a++) {
        const rad = 18 + r * 16;
        const th = (a / 28) * Math.PI * 2 + r * 0.2;
        const x = cx + Math.cos(th) * rad * 1.35;
        const y = cy + Math.sin(th) * rad;
        if (Math.abs(x - cx) > 200 || Math.abs(y - cy) > 165) continue;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      }
  }, { rx: 1, ry: 1 });
  cache.set('baffle', t);
  return t;
}

/** Leather-grain for Smart Case */
export function leatherTextures(base = '#2e4a66') {
  const key = `leather-${base}`;
  if (cache.has(key)) return cache.get(key);
  const map = canvasTex(512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      ctx.fillRect(x, y, 2, 1.2);
    }
  }, { rx: 2, ry: 2 });
  cache.set(key, map);
  return map;
}
