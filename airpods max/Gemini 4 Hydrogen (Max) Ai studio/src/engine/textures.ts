import * as THREE from 'three';

export interface ProceduralTexturePack {
  aluminumNormal: THREE.CanvasTexture;
  aluminumRoughness: THREE.CanvasTexture;
  cushionColorAo: THREE.CanvasTexture;
  cushionNormal: THREE.CanvasTexture;
  cushionRoughness: THREE.CanvasTexture;
  canopyColorAo: THREE.CanvasTexture;
  canopyAlpha: THREE.CanvasTexture;
  canopyNormal: THREE.CanvasTexture;
  innerMeshL: THREE.CanvasTexture;
  innerMeshR: THREE.CanvasTexture;
  baffleColor: THREE.CanvasTexture;
  baffleNormal: THREE.CanvasTexture;
  smartCaseNormal: THREE.CanvasTexture;
  driverConeColor: THREE.CanvasTexture;
  driverConeNormal: THREE.CanvasTexture;
  pcbColor: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function heightBufferToNormalTexture(
  heights: Float32Array,
  size: number,
  strength: number,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const sample = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return heights[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
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

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createNoiseHeight(size: number, seedOffset = 1): Float32Array {
  const buf = new Float32Array(size * size);
  let seed = 1337 * seedOffset;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < buf.length; i++) {
    buf[i] = rand();
  }
  return buf;
}

function createAluminumMaps(maxAnisotropy: number) {
  const size = 256;
  const heights = createNoiseHeight(size, 3);
  // Softly smooth micro-grain so bead-blast looks satin, not gritty
  const smoothed = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = heights[y * size + x];
      const r = heights[y * size + ((x + 1) % size)];
      const d = heights[((y + 1) % size) * size + x];
      smoothed[y * size + x] = (c * 2 + r + d) * 0.25;
    }
  }
  const normal = heightBufferToNormalTexture(smoothed, size, 0.28, 6, 6, maxAnisotropy);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const ctx = roughCanvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(56 + smoothed[i] * 18); // ~0.22 - 0.29 roughness range
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(6, 6);
  roughness.anisotropy = maxAnisotropy;

  return { normal, roughness };
}

function createCushionKnitMaps(maxAnisotropy: number) {
  const size = 512;
  const heights = new Float32Array(size * size);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext('2d')!;
  const colorImg = colorCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(size, size);

  // Tileable 3D diamond-knit textile weave (matches macro cushion reference)
  const cells = 16;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * cells;
      const v = (y / size) * cells;

      // Diagonal intersecting yarn threads + secondary rib
      const d1 = Math.abs(Math.sin((u + v) * Math.PI));
      const d2 = Math.abs(Math.sin((u - v) * Math.PI));
      const rib = 0.5 + 0.5 * Math.cos(u * Math.PI * 2);
      const stitch = Math.max(Math.pow(d1, 0.7), Math.pow(d2, 0.7));
      const pore = Math.min(d1, d2);

      // Height combines raised yarn ridges with recessed knit pockets
      const h = stitch * 0.72 + pore * 0.18 + rib * 0.1;
      heights[y * size + x] = h;

      // Subtle micro-AO in grayscale (0.78..1.0) so material.color tints cleanly
      const ao = Math.round((0.76 + h * 0.24) * 255);
      const idx = (y * size + x) * 4;
      colorImg.data[idx] = ao;
      colorImg.data[idx + 1] = ao;
      colorImg.data[idx + 2] = ao;
      colorImg.data[idx + 3] = 255;

      // Roughness: matte fabric (0.78 - 0.94)
      const rv = Math.round((0.94 - h * 0.16) * 255);
      roughImg.data[idx] = rv;
      roughImg.data[idx + 1] = rv;
      roughImg.data[idx + 2] = rv;
      roughImg.data[idx + 3] = 255;
    }
  }

  colorCtx.putImageData(colorImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);

  const repeatX = 14;
  const repeatY = 6;

  const colorAo = new THREE.CanvasTexture(colorCanvas);
  colorAo.colorSpace = THREE.SRGBColorSpace;
  colorAo.wrapS = THREE.RepeatWrapping;
  colorAo.wrapT = THREE.RepeatWrapping;
  colorAo.repeat.set(repeatX, repeatY);
  colorAo.anisotropy = maxAnisotropy;

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(repeatX, repeatY);
  roughness.anisotropy = maxAnisotropy;

  const normal = heightBufferToNormalTexture(heights, size, 2.4, repeatX, repeatY, maxAnisotropy);
  return { colorAo, normal, roughness };
}

function createCanopyKnitMaps(maxAnisotropy: number) {
  const size = 512;
  const heights = new Float32Array(size * size);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext('2d')!;
  const colorImg = colorCtx.createImageData(size, size);

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = size;
  alphaCanvas.height = size;
  const alphaCtx = alphaCanvas.getContext('2d')!;
  const alphaImg = alphaCtx.createImageData(size, size);

  // Breathable open honeycomb mesh
  const cols = 14;
  const rows = 10;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * cols;
      const v = (y / size) * rows;

      const rowIdx = Math.floor(v);
      const fu = (u + (rowIdx % 2) * 0.5) % 1;
      const fv = v % 1;

      const dx = (fu - 0.5) * 1.1;
      const dy = (fv - 0.5) * 1.05;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circular/oval mesh hole in cell center, woven fiber struts around it
      const holeMask = THREE.MathUtils.smoothstep(dist, 0.25, 0.34);
      const fiberCrown = Math.sin(Math.min(1, (dist - 0.25) / 0.35) * Math.PI);
      const h = holeMask * (0.55 + fiberCrown * 0.45);
      heights[y * size + x] = h;

      const idx = (y * size + x) * 4;
      const ao = Math.round((0.72 + h * 0.28) * 255);
      colorImg.data[idx] = ao;
      colorImg.data[idx + 1] = ao;
      colorImg.data[idx + 2] = ao;
      colorImg.data[idx + 3] = 255;

      const alpha = Math.round(holeMask * 255);
      alphaImg.data[idx] = alpha;
      alphaImg.data[idx + 1] = alpha;
      alphaImg.data[idx + 2] = alpha;
      alphaImg.data[idx + 3] = 255;
    }
  }

  colorCtx.putImageData(colorImg, 0, 0);
  alphaCtx.putImageData(alphaImg, 0, 0);

  const repeatX = 6;
  const repeatY = 2;

  const colorAo = new THREE.CanvasTexture(colorCanvas);
  colorAo.colorSpace = THREE.SRGBColorSpace;
  colorAo.wrapS = THREE.RepeatWrapping;
  colorAo.wrapT = THREE.RepeatWrapping;
  colorAo.repeat.set(repeatX, repeatY);
  colorAo.anisotropy = maxAnisotropy;

  const alpha = new THREE.CanvasTexture(alphaCanvas);
  alpha.wrapS = THREE.RepeatWrapping;
  alpha.wrapT = THREE.RepeatWrapping;
  alpha.repeat.set(repeatX, repeatY);
  alpha.anisotropy = maxAnisotropy;

  const normal = heightBufferToNormalTexture(heights, size, 2.0, repeatX, repeatY, maxAnisotropy);
  return { colorAo, alpha, normal };
}

function createInnerMeshTexture(letter: 'L' | 'R', maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base woven scrim (bright neutral grayscale so material.color tints cleanly)
  ctx.fillStyle = '#e8e8ea';
  ctx.fillRect(0, 0, size, size);

  // Subtle fine horizontal & diagonal knit lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < size; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = -size; x < size * 2; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size * 0.4, size);
    ctx.stroke();
  }

  // Subtle darker-weave knitted L / R glyph matching Apple AirPods Max inner mesh
  ctx.save();
  ctx.fillStyle = 'rgba(30, 32, 38, 0.34)';
  ctx.font = '600 220px "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size * 0.5, size * 0.52);

  // Knit stipple overlay across letter so it feels woven rather than printed
  ctx.fillStyle = 'rgba(232, 232, 234, 0.28)';
  for (let y = 110; y < 400; y += 6) {
    ctx.fillRect(110, y, 292, 2);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBaffleMaps(maxAnisotropy: number) {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const heights = new Float32Array(size * size);
  heights.fill(0.8);

  // Dark satin inner acoustic plate
  ctx.fillStyle = '#33363c';
  ctx.fillRect(0, 0, size, size);

  // Subtle stepped rounded frame
  ctx.strokeStyle = '#25272c';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  // Optical wear sensor window near upper center
  ctx.fillStyle = '#0d0e11';
  ctx.beginPath();
  ctx.roundRect(size * 0.44, size * 0.14, size * 0.12, size * 0.05, 8);
  ctx.fill();

  // Hexagonal perforated speaker grille holes in center-lower region (matches reference)
  const holeRadius = 11;
  const spacingX = 32;
  const spacingY = 28;
  const cx = size * 0.5;
  const cy = size * 0.57;

  const holes: { x: number; y: number }[] = [];
  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const px = cx + col * spacingX + (Math.abs(row) % 2) * (spacingX * 0.5);
      const py = cy + row * spacingY;
      const nx = (px - cx) / 138;
      const ny = (py - cy) / 145;
      if (nx * nx + ny * ny <= 0.92) {
        holes.push({ x: px, y: py });
        ctx.fillStyle = '#0a0b0d';
        ctx.beginPath();
        ctx.arc(px, py, holeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, holeRadius + 1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Carve holes into height buffer for crisp normal rims
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (let i = 0; i < holes.length; i++) {
        const dx = x - holes[i].x;
        const dy = y - holes[i].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < holeRadius + 2) {
          heights[y * size + x] = THREE.MathUtils.smoothstep(d, holeRadius - 2, holeRadius + 2) * 0.8;
          break;
        }
      }
    }
  }

  const color = new THREE.CanvasTexture(colorCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = maxAnisotropy;

  const normal = heightBufferToNormalTexture(heights, size, 2.2, 1, 1, maxAnisotropy);
  return { color, normal };
}

function createSmartCaseNormal(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const heights = createNoiseHeight(size, 19);
  const fine = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = heights[y * size + x];
      const pebble = Math.sin(x * 0.38) * Math.cos(y * 0.38) * 0.25 + 0.5;
      fine[y * size + x] = n * 0.55 + pebble * 0.45;
    }
  }
  return heightBufferToNormalTexture(fine, size, 0.55, 8, 8, maxAnisotropy);
}

function createDriverConeMaps(maxAnisotropy: number) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const heights = new Float32Array(size * size);

  ctx.fillStyle = '#1b1d21';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / (size * 0.5);
      const angle = Math.atan2(dy, dx);
      // Concentric acoustic surround ribs + radial stiffness flutes
      const rings = Math.sin(r * Math.PI * 16) * 0.5 + 0.5;
      const flutes = Math.sin(angle * 24) * 0.25 + 0.5;
      heights[y * size + x] = r < 0.96 ? rings * 0.7 + flutes * 0.3 : 0.4;
    }
  }

  for (let r = 24; r < 240; r += 20) {
    ctx.strokeStyle = r > 180 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const color = new THREE.CanvasTexture(canvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = maxAnisotropy;
  const normal = heightBufferToNormalTexture(heights, size, 1.4, 1, 1, maxAnisotropy);
  return { color, normal };
}

function createPcbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#16181c';
  ctx.fillRect(0, 0, size, size);

  // Subtle gold & copper circuit traces
  ctx.strokeStyle = '#9c7847';
  ctx.lineWidth = 2;
  for (let i = 16; i < size; i += 22) {
    ctx.beginPath();
    ctx.moveTo(12, i);
    ctx.lineTo(size * 0.45, i);
    ctx.lineTo(size * 0.62, i + 12);
    ctx.lineTo(size - 16, i + 12);
    ctx.stroke();
  }

  // SMD pads & H1 silicon package markings
  ctx.fillStyle = '#c8a15e';
  for (let x = 28; x < size - 28; x += 24) {
    ctx.fillRect(x, 22, 8, 5);
    ctx.fillRect(x, size - 28, 8, 5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.06,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(18, 20, 24, 0.34)');
  grad.addColorStop(0.45, 'rgba(18, 20, 24, 0.16)');
  grad.addColorStop(1, 'rgba(18, 20, 24, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createProceduralTexturePack(maxAnisotropy: number): ProceduralTexturePack {
  const aluminum = createAluminumMaps(maxAnisotropy);
  const cushion = createCushionKnitMaps(maxAnisotropy);
  const canopy = createCanopyKnitMaps(maxAnisotropy);
  const innerMeshL = createInnerMeshTexture('L', maxAnisotropy);
  const innerMeshR = createInnerMeshTexture('R', maxAnisotropy);
  const baffle = createBaffleMaps(maxAnisotropy);
  const smartCaseNormal = createSmartCaseNormal(maxAnisotropy);
  const driver = createDriverConeMaps(maxAnisotropy);
  const pcbColor = createPcbTexture(maxAnisotropy);
  const contactShadow = createContactShadowTexture();

  const all = [
    aluminum.normal,
    aluminum.roughness,
    cushion.colorAo,
    cushion.normal,
    cushion.roughness,
    canopy.colorAo,
    canopy.alpha,
    canopy.normal,
    innerMeshL,
    innerMeshR,
    baffle.color,
    baffle.normal,
    smartCaseNormal,
    driver.color,
    driver.normal,
    pcbColor,
    contactShadow,
  ];

  return {
    aluminumNormal: aluminum.normal,
    aluminumRoughness: aluminum.roughness,
    cushionColorAo: cushion.colorAo,
    cushionNormal: cushion.normal,
    cushionRoughness: cushion.roughness,
    canopyColorAo: canopy.colorAo,
    canopyAlpha: canopy.alpha,
    canopyNormal: canopy.normal,
    innerMeshL,
    innerMeshR,
    baffleColor: baffle.color,
    baffleNormal: baffle.normal,
    smartCaseNormal,
    driverConeColor: driver.color,
    driverConeNormal: driver.normal,
    pcbColor,
    contactShadow,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
