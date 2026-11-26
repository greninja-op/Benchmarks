import * as THREE from 'three';

export interface ProceduralTextureSet {
  aluminumNormal: THREE.CanvasTexture;
  aluminumRoughness: THREE.CanvasTexture;
  knitBump: THREE.CanvasTexture;
  knitNormal: THREE.CanvasTexture;
  knitAlbedoMod: THREE.CanvasTexture;
  canopyAlpha: THREE.CanvasTexture;
  canopyBump: THREE.CanvasTexture;
  innerMeshL: THREE.CanvasTexture;
  innerMeshR: THREE.CanvasTexture;
  innerMeshBump: THREE.CanvasTexture;
  baffleGrilleAlpha: THREE.CanvasTexture;
  baffleGrilleBump: THREE.CanvasTexture;
  driverConeBump: THREE.CanvasTexture;
  pcbDetailAlbedo: THREE.CanvasTexture;
  leatherGrainNormal: THREE.CanvasTexture;
}

let cachedTextures: ProceduralTextureSet | null = null;

function heightToNormalCanvas(heightCanvas: HTMLCanvasElement, strength = 2.2): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = tr + 2 * r + br - (tl + 2 * l + bl);
      const dY = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

function createAluminumMaps(): {
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 512;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const ctx = hCanvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  // Deterministic PRNG for clean bead-blasted anodized micro-grain
  let seed = 13379;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < size * size; i++) {
    const g1 = rand();
    const g2 = rand();
    // Gaussian-like micro-bead distribution centered at 0.5
    const v = Math.floor((0.3 + (g1 + g2) * 0.2) * 255);
    const idx = i * 4;
    d[idx] = v;
    d[idx + 1] = v;
    d[idx + 2] = v;
    d[idx + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const normalCanvas = heightToNormalCanvas(hCanvas, 0.65);
  const normal = new THREE.CanvasTexture(normalCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(8, 8);

  // Subtle roughness micro-variation around white (multiplied by material.roughness)
  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const base = d[i * 4];
    const rv = Math.round(225 + ((base - 128) / 128) * 22);
    const idx = i * 4;
    rImg.data[idx] = rv;
    rImg.data[idx + 1] = rv;
    rImg.data[idx + 2] = rv;
    rImg.data[idx + 3] = 255;
  }
  rCtx.putImageData(rImg, 0, 0);
  const roughness = new THREE.CanvasTexture(rCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(8, 8);

  return { normal, roughness };
}

function createKnitMaps(): {
  bump: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  albedoMod: THREE.CanvasTexture;
} {
  // High-resolution 3D braided cellular diamond knit matching AirPods Max cushions
  const size = 512;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const modCanvas = document.createElement('canvas');
  modCanvas.width = size;
  modCanvas.height = size;
  const mCtx = modCanvas.getContext('2d')!;

  bCtx.fillStyle = '#1e1e1e';
  bCtx.fillRect(0, 0, size, size);

  mCtx.fillStyle = '#bcbcbc';
  mCtx.fillRect(0, 0, size, size);

  const cols = 16;
  const rows = 16;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let row = -1; row <= rows + 1; row++) {
    for (let col = -1; col <= cols + 1; col++) {
      const stagger = (row % 2) * (cellW * 0.5);
      const cx = col * cellW + stagger;
      const cy = row * cellH;

      // Draw V-shaped knit stitch arms (authentic 3D interlock rib knit)
      const drawStitchLeg = (
        ctx: CanvasRenderingContext2D,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        width: number,
        innerWhite: string,
        outerDark: string
      ) => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = outerDark;
        ctx.lineWidth = width * 1.28;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, '#969696');
        grad.addColorStop(0.5, innerWhite);
        grad.addColorStop(1, '#9a9a9a');
        ctx.strokeStyle = grad;
        ctx.lineWidth = width * 0.86;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
      };

      // Acoustic micro-pore dimple at center of diamond cell
      const drawPore = (ctx: CanvasRenderingContext2D, px: number, py: number, darkColor: string) => {
        const rg = ctx.createRadialGradient(px, py, 0.5, px, py, cellW * 0.34);
        rg.addColorStop(0, darkColor);
        rg.addColorStop(0.65, '#585858');
        rg.addColorStop(1, 'rgba(120,120,120,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(px, py, cellW * 0.34, 0, Math.PI * 2);
        ctx.fill();
      };

      drawPore(bCtx, cx, cy + cellH * 0.5, '#080808');
      drawPore(mCtx, cx, cy + cellH * 0.5, '#6e6e6e');

      // Left & right interlocking yarn legs forming diamond knit
      const legW = cellW * 0.29;
      drawStitchLeg(bCtx, cx - cellW * 0.44, cy + cellH * 0.12, cx - cellW * 0.07, cy + cellH * 0.88, legW, '#ffffff', '#222222');
      drawStitchLeg(bCtx, cx + cellW * 0.44, cy + cellH * 0.12, cx + cellW * 0.07, cy + cellH * 0.88, legW, '#f5f5f5', '#222222');

      drawStitchLeg(mCtx, cx - cellW * 0.44, cy + cellH * 0.12, cx - cellW * 0.07, cy + cellH * 0.88, legW, '#ffffff', '#8f8f8f');
      drawStitchLeg(mCtx, cx + cellW * 0.44, cy + cellH * 0.12, cx + cellW * 0.07, cy + cellH * 0.88, legW, '#fafafa', '#8f8f8f');
    }
  }

  const normalCanvas = heightToNormalCanvas(bumpCanvas, 2.8);

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(12, 4);

  const normal = new THREE.CanvasTexture(normalCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(12, 4);

  const albedoMod = new THREE.CanvasTexture(modCanvas);
  albedoMod.wrapS = THREE.RepeatWrapping;
  albedoMod.wrapT = THREE.RepeatWrapping;
  albedoMod.repeat.set(12, 4);
  albedoMod.colorSpace = THREE.SRGBColorSpace;

  return { bump, normal, albedoMod };
}

function createCanopyMaps(): {
  alpha: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  const aCtx = alphaCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d')!;

  // White = opaque yarn strands, dark gray/black = open breathable mesh pores
  aCtx.fillStyle = '#ffffff';
  aCtx.fillRect(0, 0, w, h);

  bCtx.fillStyle = '#d8d8d8';
  bCtx.fillRect(0, 0, w, h);

  const cols = 44;
  const rows = 20;
  const cw = w / cols;
  const ch = h / rows;

  for (let r = 0; r < rows; r++) {
    // Taper pore openness near the front/rear rubberized borders (r near 0 or rows-1)
    const edgeFactor = Math.sin(((r + 0.5) / rows) * Math.PI);
    const poreScale = Math.max(0, Math.min(1, (edgeFactor - 0.12) / 0.75));
    if (poreScale <= 0.02) continue;

    for (let c = 0; c < cols; c++) {
      const ox = (r % 2) * (cw * 0.5);
      const px = c * cw + ox + cw * 0.5;
      const py = r * ch + ch * 0.5;
      const rx = cw * 0.31 * poreScale;
      const ry = ch * 0.29 * poreScale;

      aCtx.fillStyle = '#181818';
      aCtx.beginPath();
      aCtx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = '#151515';
      bCtx.beginPath();
      bCtx.ellipse(px, py, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const alpha = new THREE.CanvasTexture(alphaCanvas);
  alpha.wrapS = THREE.RepeatWrapping;
  alpha.wrapT = THREE.ClampToEdgeWrapping;
  alpha.repeat.set(2, 1);

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.ClampToEdgeWrapping;
  bump.repeat.set(2, 1);

  return { alpha, bump };
}

function createInnerLetterMesh(letter: 'L' | 'R'): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base inner knit greyscale (tinted dynamically by material color)
  ctx.fillStyle = '#dadada';
  ctx.fillRect(0, 0, size, size);

  // Subtle woven letter integrated into the acoustic scrim
  ctx.save();
  ctx.fillStyle = '#9d9d9d';
  ctx.font = '600 250px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size * 0.5, size * 0.52);
  ctx.restore();

  // Overlay fine double-layer acoustic knit cross-grid over both background & letter
  const step = 8;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const ox = ((y / step) % 2) * (step * 0.5);
      ctx.fillStyle = 'rgba(35, 35, 38, 0.34)';
      ctx.beginPath();
      ctx.arc(x + ox, y, step * 0.24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(x + ox + 1.5, y - 1.5, step * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createInnerMeshBump(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, size, size);

  const step = 8;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const ox = ((y / step) % 2) * (step * 0.5);
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(x + ox, y, step * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createBaffleGrilleMaps(): {
  alpha: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  // Exact hexagonal honeycomb acoustic perforation array from reference 4.22.10 PM.jpeg
  const size = 512;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  aCtx.fillStyle = '#ffffff';
  aCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#e0e0e0';
  bCtx.fillRect(0, 0, size, size);

  const spacingX = 46;
  const spacingY = 40;
  const holeRadius = 15.5;
  const cx = size * 0.5;
  const cy = size * 0.5;

  for (let row = -5; row <= 5; row++) {
    for (let col = -4; col <= 4; col++) {
      const hx = cx + col * spacingX + (Math.abs(row) % 2) * (spacingX * 0.5);
      const hy = cy + row * spacingY;
      // Stadium/oval mask matching the central recess of the AirPods Max baffle
      const normX = (hx - cx) / 145;
      const normY = (hy - cy) / 188;
      if (normX * normX + normY * normY <= 0.96) {
        aCtx.fillStyle = '#000000';
        aCtx.beginPath();
        aCtx.arc(hx, hy, holeRadius, 0, Math.PI * 2);
        aCtx.fill();

        const grad = bCtx.createRadialGradient(hx, hy, holeRadius * 0.65, hx, hy, holeRadius * 1.25);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.75, '#555555');
        grad.addColorStop(1, '#e0e0e0');
        bCtx.fillStyle = grad;
        bCtx.beginPath();
        bCtx.arc(hx, hy, holeRadius * 1.25, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  }

  return {
    alpha: new THREE.CanvasTexture(aCanvas),
    bump: new THREE.CanvasTexture(bCanvas),
  };
}

function createDriverAndPcbMaps(): {
  driverConeBump: THREE.CanvasTexture;
  pcbDetailAlbedo: THREE.CanvasTexture;
  leatherGrainNormal: THREE.CanvasTexture;
} {
  // Concentric ribbed acoustic diaphragm + surround bump map
  const dSize = 512;
  const dCanvas = document.createElement('canvas');
  dCanvas.width = dSize;
  dCanvas.height = dSize;
  const dCtx = dCanvas.getContext('2d')!;
  dCtx.fillStyle = '#808080';
  dCtx.fillRect(0, 0, dSize, dSize);
  const c = dSize / 2;

  for (let r = 240; r > 20; r -= 8) {
    dCtx.strokeStyle = r % 16 === 0 ? '#dadada' : '#383838';
    dCtx.lineWidth = 4;
    dCtx.beginPath();
    dCtx.arc(c, c, r, 0, Math.PI * 2);
    dCtx.stroke();
  }
  const driverConeBump = new THREE.CanvasTexture(dCanvas);

  // Matte black H1 PCB with gold copper traces & SMD micro-capacitors
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 256;
  pCanvas.height = 256;
  const pCtx = pCanvas.getContext('2d')!;
  pCtx.fillStyle = '#141619';
  pCtx.fillRect(0, 0, 256, 256);
  pCtx.strokeStyle = '#c89b54';
  pCtx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const y = 14 + i * 13;
    pCtx.beginPath();
    pCtx.moveTo(10, y);
    pCtx.lineTo(95 + (i % 4) * 25, y);
    pCtx.lineTo(125 + (i % 4) * 25, y + 10);
    pCtx.lineTo(240, y + 10);
    pCtx.stroke();

    pCtx.fillStyle = i % 3 === 0 ? '#d8aa5e' : '#30343b';
    pCtx.fillRect(40 + (i * 19) % 170, y - 4, 10, 6);
  }
  const pcbDetailAlbedo = new THREE.CanvasTexture(pCanvas);
  pcbDetailAlbedo.colorSpace = THREE.SRGBColorSpace;

  // Soft-touch Smart Case micro-suede/polyurethane grain normal map
  const lSize = 256;
  const lCanvas = document.createElement('canvas');
  lCanvas.width = lSize;
  lCanvas.height = lSize;
  const lCtx = lCanvas.getContext('2d')!;
  const lImg = lCtx.createImageData(lSize, lSize);
  let s = 918273;
  for (let i = 0; i < lSize * lSize; i++) {
    s = (s * 16807) % 2147483647;
    const v = 110 + Math.floor(((s - 1) / 2147483646) * 36);
    lImg.data[i * 4] = v;
    lImg.data[i * 4 + 1] = v;
    lImg.data[i * 4 + 2] = v;
    lImg.data[i * 4 + 3] = 255;
  }
  lCtx.putImageData(lImg, 0, 0);
  const leatherGrainNormal = new THREE.CanvasTexture(heightToNormalCanvas(lCanvas, 0.5));
  leatherGrainNormal.wrapS = THREE.RepeatWrapping;
  leatherGrainNormal.wrapT = THREE.RepeatWrapping;
  leatherGrainNormal.repeat.set(6, 6);

  return { driverConeBump, pcbDetailAlbedo, leatherGrainNormal };
}

export function getProceduralTextures(): ProceduralTextureSet {
  if (cachedTextures) return cachedTextures;

  const alu = createAluminumMaps();
  const knit = createKnitMaps();
  const canopy = createCanopyMaps();
  const innerMeshL = createInnerLetterMesh('L');
  const innerMeshR = createInnerLetterMesh('R');
  const innerMeshBump = createInnerMeshBump();
  const baffle = createBaffleGrilleMaps();
  const extra = createDriverAndPcbMaps();

  cachedTextures = {
    aluminumNormal: alu.normal,
    aluminumRoughness: alu.roughness,
    knitBump: knit.bump,
    knitNormal: knit.normal,
    knitAlbedoMod: knit.albedoMod,
    canopyAlpha: canopy.alpha,
    canopyBump: canopy.bump,
    innerMeshL,
    innerMeshR,
    innerMeshBump,
    baffleGrilleAlpha: baffle.alpha,
    baffleGrilleBump: baffle.bump,
    driverConeBump: extra.driverConeBump,
    pcbDetailAlbedo: extra.pcbDetailAlbedo,
    leatherGrainNormal: extra.leatherGrainNormal,
  };

  return cachedTextures;
}
