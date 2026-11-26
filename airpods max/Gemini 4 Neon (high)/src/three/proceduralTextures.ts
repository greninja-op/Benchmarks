import * as THREE from 'three';

export interface ProceduralTextureSuite {
  aluminumNormal: THREE.CanvasTexture;
  aluminumRoughness: THREE.CanvasTexture;
  cushionMap: THREE.CanvasTexture;
  cushionNormal: THREE.CanvasTexture;
  cushionRoughness: THREE.CanvasTexture;
  canopyMap: THREE.CanvasTexture;
  canopyNormal: THREE.CanvasTexture;
  canopyAlpha: THREE.CanvasTexture;
  innerMeshL: THREE.CanvasTexture;
  innerMeshR: THREE.CanvasTexture;
  innerMeshNormal: THREE.CanvasTexture;
  smartCaseNormal: THREE.CanvasTexture;
  smartCaseRoughness: THREE.CanvasTexture;
  pcbMap: THREE.CanvasTexture;
  pcbRoughness: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  isColor = false
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Fast deterministic hash for crisp procedural micro-grain
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Converts a scalar heightfield (0..1) into an OpenGL tangent-space normal map.
 */
function heightFieldToNormalCanvas(
  height: Float32Array,
  w: number,
  h: number,
  strength: number
): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let y = 0; y < h; y++) {
    const ym = (y - 1 + h) % h;
    const yp = (y + 1) % h;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w;
      const xp = (x + 1) % w;

      const dX = (height[y * w + xp] - height[y * w + xm]) * strength;
      const dY = (height[yp * w + x] - height[ym * w + x]) * strength;
      const nx = -dX;
      const ny = -dY;
      const nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (y * w + x) * 4;
      data[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * 1. Bead-blasted anodized aluminum micro-grain normal + roughness maps
 */
function createAluminumTextures(): {
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 256;
  const height = new Float32Array(size * size);
  const [rCanvas, rCtx] = makeCanvas(size, size);
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = hash2(x, y);
      const n2 = hash2(Math.floor(x * 0.5), Math.floor(y * 0.5));
      const grain = n1 * 0.65 + n2 * 0.35;
      height[y * size + x] = grain;

      // Subtle roughness variation centered around 0.24 (range ~0.20..0.28)
      const rv = Math.round((0.20 + grain * 0.085) * 255);
      const idx = (y * size + x) * 4;
      rImg.data[idx] = rv;
      rImg.data[idx + 1] = rv;
      rImg.data[idx + 2] = rv;
      rImg.data[idx + 3] = 255;
    }
  }
  rCtx.putImageData(rImg, 0, 0);

  const nCanvas = heightFieldToNormalCanvas(height, size, size, 0.32);
  return {
    normal: configureTexture(nCanvas, 6, 6, false),
    roughness: configureTexture(rCanvas, 6, 6, false),
  };
}

/**
 * 2. AirPods Max 3D Diamond-Knit Memory-Foam Ear Cushion textile
 */
function createCushionKnitTextures(): {
  map: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 512;
  const cells = 32; // crisp 3D interlocking diamond ribs
  const height = new Float32Array(size * size);

  const [cCanvas, cCtx] = makeCanvas(size, size);
  const cImg = cCtx.createImageData(size, size);

  const [rCanvas, rCtx] = makeCanvas(size, size);
  const rImg = rCtx.createImageData(size, size);

  const twoPi = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * cells;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * cells;

      // Diagonal interlocking diamond knit pattern (authentic AirPods Max weave)
      const diagA = Math.sin((u + v) * twoPi);
      const diagB = Math.sin((u - v) * twoPi);
      const rib = Math.sin(u * twoPi * 2.0) * 0.16;

      // Cross-over yarn ridges + fine recessed pore pockets
      const diamond = Math.max(diagA * 0.5 + 0.5, diagB * 0.5 + 0.5);
      const pore = Math.max(0, -(diagA + diagB) * 0.35);
      const yarnFiber = (hash2(x, y) - 0.5) * 0.08;

      const hVal = Math.max(
        0,
        Math.min(1, diamond * 0.78 + rib - pore * 0.65 + 0.14 + yarnFiber)
      );
      height[y * size + x] = hVal;

      // Subtle albedo ambient-occlusion contrast inside weave pockets (white-neutral so material color tints it cleanly)
      const shade = Math.round((0.76 + hVal * 0.24) * 255);
      const idx = (y * size + x) * 4;
      cImg.data[idx] = shade;
      cImg.data[idx + 1] = shade;
      cImg.data[idx + 2] = shade;
      cImg.data[idx + 3] = 255;

      // Matte textile roughness (0.82 on raised yarns, 0.96 in deep knit pores)
      const rough = Math.round((0.96 - hVal * 0.14) * 255);
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const nCanvas = heightFieldToNormalCanvas(height, size, size, 3.2);

  return {
    map: configureTexture(cCanvas, 4, 4, true),
    normal: configureTexture(nCanvas, 4, 4, false),
    roughness: configureTexture(rCanvas, 4, 4, false),
  };
}

/**
 * 3. Headband Suspended Breathable Knit-Mesh Canopy (with authentic open-cell alpha perforations)
 */
function createCanopyMeshTextures(): {
  map: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  alpha: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const cols = 42;
  const rows = 16;

  const height = new Float32Array(w * h);
  const [cCanvas, cCtx] = makeCanvas(w, h);
  const cImg = cCtx.createImageData(w, h);

  const [aCanvas, aCtx] = makeCanvas(w, h);
  const aImg = aCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const vNorm = y / h;
    // Solid woven border along the left/right edges where canopy joins the silicone frame
    const edgeBand = Math.min(vNorm, 1.0 - vNorm);
    const isSolidBorder = edgeBand < 0.085;

    for (let x = 0; x < w; x++) {
      const gx = (x / w) * cols;
      const gy = (y / h) * rows;

      // Staggered hexagonal breathable mesh cells
      const rowIdx = Math.floor(gy);
      const fx = ((gx + (rowIdx % 2 === 0 ? 0 : 0.5)) % 1) - 0.5;
      const fy = (gy % 1) - 0.5;
      const dist = Math.sqrt(fx * fx * 1.15 + fy * fy * 1.15);

      const holeRadius = isSolidBorder ? 0.0 : 0.265;
      const smoothEdge = 0.085;
      // Alpha = 0 inside hole, 1 on woven strands
      let alpha = 1.0;
      if (!isSolidBorder) {
        const t = (dist - holeRadius) / smoothEdge;
        alpha = Math.max(0, Math.min(1, t));
      }

      const strandRelief = Math.sin((dist - holeRadius) * Math.PI * 2.2) * 0.5 + 0.5;
      const micro = (hash2(x, y) - 0.5) * 0.07;
      const hVal = Math.max(0, Math.min(1, alpha * (0.55 + strandRelief * 0.42) + micro));
      height[y * w + x] = hVal;

      const idx = (y * w + x) * 4;
      const colVal = Math.round((0.80 + hVal * 0.20) * 255);
      cImg.data[idx] = colVal;
      cImg.data[idx + 1] = colVal;
      cImg.data[idx + 2] = colVal;
      cImg.data[idx + 3] = 255;

      const aVal = Math.round(alpha * 255);
      aImg.data[idx] = aVal;
      aImg.data[idx + 1] = aVal;
      aImg.data[idx + 2] = aVal;
      aImg.data[idx + 3] = 255;
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  aCtx.putImageData(aImg, 0, 0);
  const nCanvas = heightFieldToNormalCanvas(height, w, h, 2.8);

  return {
    map: configureTexture(cCanvas, 1, 1, true),
    normal: configureTexture(nCanvas, 1, 1, false),
    alpha: configureTexture(aCanvas, 1, 1, false),
  };
}

/**
 * 4. Inner Ear Cushion Breathable Acoustic Mesh with Subtle Darker-Weave "L" and "R"
 */
function createInnerAcousticMeshTextures(): {
  mapL: THREE.CanvasTexture;
  mapR: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const size = 512;
  const height = new Float32Array(size * size);

  const buildLetterCanvas = (letter: 'L' | 'R'): HTMLCanvasElement => {
    const [canvas, ctx] = makeCanvas(size, size);
    // Base fine acoustic mesh background (light neutral so tinting works across all 5 colors)
    ctx.fillStyle = '#dcdcdc';
    ctx.fillRect(0, 0, size, size);

    // Draw subtle darker-weave oversized Apple-style geometric sans "L" / "R"
    ctx.save();
    ctx.fillStyle = '#8b8e94';
    ctx.font = '600 285px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size * 0.5, size * 0.52);
    ctx.restore();

    // Overlay fine acoustic micro-mesh grid across both background and letter
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    const freq = 64;
    const twoPi = Math.PI * 2;

    for (let y = 0; y < size; y++) {
      const sv = Math.sin((y / size) * freq * twoPi);
      for (let x = 0; x < size; x++) {
        const su = Math.sin((x / size) * freq * twoPi);
        const mesh = (su * sv) * 0.5 + 0.5;
        if (letter === 'L') {
          height[y * size + x] = mesh * 0.75 + hash2(x, y) * 0.15;
        }
        const factor = 0.84 + mesh * 0.16;
        const idx = (y * size + x) * 4;
        data[idx] = Math.round(data[idx] * factor);
        data[idx + 1] = Math.round(data[idx + 1] * factor);
        data[idx + 2] = Math.round(data[idx + 2] * factor);
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  const canvasL = buildLetterCanvas('L');
  const canvasR = buildLetterCanvas('R');
  const nCanvas = heightFieldToNormalCanvas(height, size, size, 1.8);

  return {
    mapL: configureTexture(canvasL, 1, 1, true),
    mapR: configureTexture(canvasR, 1, 1, true),
    normal: configureTexture(nCanvas, 1, 1, false),
  };
}

/**
 * 5. Smart Case Soft-Touch Matte Microfiber / Polyurethane Grain
 */
function createSmartCaseTextures(): {
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 256;
  const height = new Float32Array(size * size);
  const [rCanvas, rCtx] = makeCanvas(size, size);
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = hash2(Math.floor(x * 0.65), Math.floor(y * 0.65));
      const b = hash2(x, y);
      const grain = a * 0.7 + b * 0.3;
      height[y * size + x] = grain;

      const rv = Math.round((0.68 + grain * 0.12) * 255);
      const idx = (y * size + x) * 4;
      rImg.data[idx] = rv;
      rImg.data[idx + 1] = rv;
      rImg.data[idx + 2] = rv;
      rImg.data[idx + 3] = 255;
    }
  }
  rCtx.putImageData(rImg, 0, 0);
  const nCanvas = heightFieldToNormalCanvas(height, size, size, 0.48);

  return {
    normal: configureTexture(nCanvas, 5, 5, false),
    roughness: configureTexture(rCanvas, 5, 5, false),
  };
}

/**
 * 6. Internal H1 Logic Board & SMD Circuitry Texture (for Exploded View)
 */
function createPcbTextures(): {
  map: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#15181c';
  ctx.fillRect(0, 0, size, size);

  // Subtle gold copper traces
  ctx.strokeStyle = 'rgba(186, 152, 92, 0.38)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x1 = hash2(i, 1) * size;
    const y1 = hash2(i, 2) * size;
    const len = 40 + hash2(i, 3) * 140;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + len * 0.5, y1);
    ctx.lineTo(x1 + len, y1 + (i % 2 === 0 ? 28 : -28));
    ctx.stroke();
  }

  // Gold solder pads & micro SMD resistors/capacitors
  for (let i = 0; i < 160; i++) {
    const x = hash2(i, 10) * (size - 24) + 12;
    const y = hash2(i, 11) * (size - 24) + 12;
    const w = 6 + hash2(i, 12) * 14;
    const h = 4 + hash2(i, 13) * 8;
    ctx.fillStyle = i % 3 === 0 ? '#c4a162' : '#2a2f38';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d4b475';
    ctx.fillRect(x, y, 2, h);
    ctx.fillRect(x + w - 2, y, 2, h);
  }

  // Apple H1 Silicon Package centerpiece
  ctx.fillStyle = '#1d2026';
  ctx.fillRect(176, 176, 160, 160);
  ctx.strokeStyle = '#6c7482';
  ctx.lineWidth = 3;
  ctx.strokeRect(178, 178, 156, 156);
  ctx.fillStyle = '#c5ccd8';
  ctx.font = '600 44px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H1', 256, 246);
  ctx.font = '500 14px "Inter", sans-serif';
  ctx.fillStyle = '#8b93a3';
  ctx.fillText('APPLE AUDIO SILICON', 256, 286);

  const [rCanvas, rCtx] = makeCanvas(size, size);
  rCtx.fillStyle = '#5a5a5a';
  rCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#262626';
  rCtx.fillRect(176, 176, 160, 160);

  return {
    map: configureTexture(canvas, 1, 1, true),
    roughness: configureTexture(rCanvas, 1, 1, false),
  };
}

/**
 * 7. Soft Studio Radial Contact Shadow
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.48
  );
  grad.addColorStop(0.0, 'rgba(14, 18, 26, 0.30)');
  grad.addColorStop(0.35, 'rgba(14, 18, 26, 0.14)');
  grad.addColorStop(0.7, 'rgba(14, 18, 26, 0.04)');
  grad.addColorStop(1.0, 'rgba(14, 18, 26, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createProceduralTextureSuite(): ProceduralTextureSuite {
  const aluminum = createAluminumTextures();
  const cushion = createCushionKnitTextures();
  const canopy = createCanopyMeshTextures();
  const inner = createInnerAcousticMeshTextures();
  const smartCase = createSmartCaseTextures();
  const pcb = createPcbTextures();
  const contactShadow = createContactShadowTexture();

  const all = [
    aluminum.normal,
    aluminum.roughness,
    cushion.map,
    cushion.normal,
    cushion.roughness,
    canopy.map,
    canopy.normal,
    canopy.alpha,
    inner.mapL,
    inner.mapR,
    inner.normal,
    smartCase.normal,
    smartCase.roughness,
    pcb.map,
    pcb.roughness,
    contactShadow,
  ];

  return {
    aluminumNormal: aluminum.normal,
    aluminumRoughness: aluminum.roughness,
    cushionMap: cushion.map,
    cushionNormal: cushion.normal,
    cushionRoughness: cushion.roughness,
    canopyMap: canopy.map,
    canopyNormal: canopy.normal,
    canopyAlpha: canopy.alpha,
    innerMeshL: inner.mapL,
    innerMeshR: inner.mapR,
    innerMeshNormal: inner.normal,
    smartCaseNormal: smartCase.normal,
    smartCaseRoughness: smartCase.roughness,
    pcbMap: pcb.map,
    pcbRoughness: pcb.roughness,
    contactShadow,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
