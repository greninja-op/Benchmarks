import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator
 * Generates photorealistic procedural normal, roughness, alpha, and albedo maps
 * on HTML5 canvas with zero external image asset dependencies.
 */

// Helper to convert Canvas to Three.js Texture with optimal mipmapping
function canvasToTexture(canvas, wrapS = THREE.RepeatWrapping, wrapT = THREE.RepeatWrapping, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.repeat.set(repeatX, repeatY);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 1. Anodized Aluminum Micro-Bead-Blasted Normal Map
 * Produces the signature isotropic satin sheen of Apple's unibody aluminum.
 */
export function createBeadBlastedNormalMap(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Generate height field with multi-octave micro noise
  const heights = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const n1 = Math.random();
    const n2 = Math.random() * 0.5;
    heights[i] = n1 * 0.7 + n2 * 0.3;
  }

  // Convert height field to normal map via Sobel gradient
  const strength = 1.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const xLeft = (x - 1 + size) % size;
      const xRight = (x + 1) % size;
      const yUp = (y - 1 + size) % size;
      const yDown = (y + 1) % size;

      const dx = (heights[y * size + xRight] - heights[y * size + xLeft]) * strength;
      const dy = (heights[yDown * size + x] - heights[yUp * size + x]) * strength;

      // Normal vector (dx, dy, 1.0) normalized
      const len = Math.sqrt(dx * dx + dy * dy + 1.0);
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = 1.0 / len;

      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(nz * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = canvasToTexture(canvas, THREE.RepeatWrapping, THREE.RepeatWrapping, 8, 8);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * 2. Breathable Knit-Mesh Canopy Textures
 * Creates realistic diamond-woven yarn threads with open transparent perforations.
 */
export function createCanopyTextures(size = 512) {
  // Albedo Canvas
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d');

  // Alpha / Perforation Canvas
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = size;
  alphaCanvas.height = size;
  const alphaCtx = alphaCanvas.getContext('2d');

  // Normal Canvas
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d');

  // Backgrounds
  aCtx.fillStyle = '#ffffff';
  aCtx.fillRect(0, 0, size, size);

  alphaCtx.fillStyle = '#ffffff';
  alphaCtx.fillRect(0, 0, size, size);

  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, size, size);

  const cellSize = 32;
  const rows = size / cellSize;
  const cols = size / cellSize;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellSize + (r % 2 === 0 ? 0 : cellSize / 2);
      const cy = r * cellSize;

      // Draw diamond / oval perforation hole for canopy
      alphaCtx.save();
      alphaCtx.beginPath();
      alphaCtx.ellipse(cx, cy, cellSize * 0.22, cellSize * 0.32, 0, 0, Math.PI * 2);
      alphaCtx.fillStyle = '#000000'; // transparent hole in mesh
      alphaCtx.fill();
      alphaCtx.restore();

      // Interlocking knit yarn strands in Albedo
      aCtx.save();
      aCtx.strokeStyle = 'rgba(210, 215, 222, 0.9)';
      aCtx.lineWidth = 4.5;
      aCtx.beginPath();
      aCtx.moveTo(cx - cellSize * 0.4, cy);
      aCtx.lineTo(cx + cellSize * 0.4, cy);
      aCtx.stroke();

      aCtx.strokeStyle = 'rgba(180, 185, 195, 0.7)';
      aCtx.lineWidth = 3.5;
      aCtx.beginPath();
      aCtx.moveTo(cx, cy - cellSize * 0.4);
      aCtx.lineTo(cx, cy + cellSize * 0.4);
      aCtx.stroke();
      aCtx.restore();
    }
  }

  // Add subtle micro-fiber noise
  const aData = aCtx.getImageData(0, 0, size, size);
  for (let i = 0; i < aData.data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 18;
    aData.data[i] = Math.min(255, Math.max(0, aData.data[i] + grain));
    aData.data[i + 1] = Math.min(255, Math.max(0, aData.data[i + 1] + grain));
    aData.data[i + 2] = Math.min(255, Math.max(0, aData.data[i + 2] + grain));
  }
  aCtx.putImageData(aData, 0, 0);

  const albedoTex = canvasToTexture(albedoCanvas, THREE.RepeatWrapping, THREE.RepeatWrapping, 4, 12);
  const alphaTex = canvasToTexture(alphaCanvas, THREE.RepeatWrapping, THREE.RepeatWrapping, 4, 12);
  alphaTex.colorSpace = THREE.NoColorSpace;

  return { albedo: albedoTex, alpha: alphaTex };
}

/**
 * 3. Memory Foam Cushion 3D Diamond-Knit Fabric Normal & Bump Map
 * Matches the macro honeycomb diamond textile seen in reference image 2 & 4.
 */
export function createCushionTextures(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const freq = 32; // cell repeat
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Diamond coordinate calculation
      const u = (x / size) * freq;
      const v = (y / size) * freq;

      const cellX = u % 1.0;
      const cellY = v % 1.0;

      // Diamond distance function
      const dx = Math.abs(cellX - 0.5) * 2.0;
      const dy = Math.abs(cellY - 0.5) * 2.0;
      const dist = dx + dy;

      // Surface normal tilting outward from center of diamond cell
      let nx = (cellX - 0.5) * 1.8;
      let ny = (cellY - 0.5) * 1.8;
      let nz = Math.max(0.2, 1.0 - Math.min(1.0, dist * 0.8));

      // Micro fabric weave perturbation
      const weave = Math.sin(x * 1.8) * Math.cos(y * 1.8) * 0.15;
      nx += weave;
      ny += weave;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      data[idx] = Math.floor((nx / len * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny / len * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz / len) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const normalTex = canvasToTexture(canvas, THREE.RepeatWrapping, THREE.RepeatWrapping, 6, 6);
  normalTex.colorSpace = THREE.NoColorSpace;
  return normalTex;
}

/**
 * 4. Inner Acoustic Mesh with Knitted 'L' and 'R' Typography
 * Renders the clean, elegant letter woven into the acoustically transparent cloth.
 */
export function createAcousticMeshTexture(letter = 'L', baseColor = '#25272a', textRgba = 'rgba(255,255,255,0.22)') {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Acoustic chamber dark acoustic cloth background
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Micro acoustic weave pattern
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 4) {
    ctx.fillRect(x, 0, 2, size);
  }

  // Draw large, iconic Apple-style knitted "L" or "R"
  ctx.save();
  ctx.font = '600 480px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textRgba;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText(letter, size / 2, size / 2);
  ctx.restore();

  // Overlay knit-stitch mask across the letter so it appears woven in the textile threads
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if ((x % 6 < 2) || (y % 6 < 2)) {
        data[idx] = Math.max(0, data[idx] - 25);
        data[idx + 1] = Math.max(0, data[idx + 1] - 25);
        data[idx + 2] = Math.max(0, data[idx + 2] - 25);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  return tex;
}

/**
 * 5. Inner Acoustic Baffle Speaker Grille Texture
 * Generates the perforated baffle plate with precision circular acoustic speaker holes,
 * magnetic alignment guides, and mounting hardware (matches reference image 4).
 */
export function createSpeakerBaffleTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Baffle plate deep anthracite matte finish
  ctx.fillStyle = '#222326';
  ctx.fillRect(0, 0, size, size);

  // Outer beveled acoustic rim
  ctx.strokeStyle = '#36373b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(40, 40, size - 80, size - 80, 160);
  ctx.stroke();

  // Magnetic perimeter alignment ring
  ctx.strokeStyle = '#18191b';
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.roundRect(75, 75, size - 150, size - 150, 130);
  ctx.stroke();

  // Perforated speaker grille holes (Apple array: 6 columns x 7 rows rounded matrix)
  const cols = 6;
  const rows = 7;
  const startX = 280;
  const startY = 240;
  const spacingX = 92;
  const spacingY = 92;
  const holeRadius = 26;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * spacingX;
      const y = startY + r * spacingY;

      // Skip corners to make rounded organic speaker baffle aperture
      const distFromCenter = Math.hypot((c - 2.5) / 2.5, (r - 3) / 3);
      if (distFromCenter > 1.08) continue;

      // Deep dark acoustic hole with recessed bevel shadow
      ctx.beginPath();
      ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0c';
      ctx.fill();

      ctx.strokeStyle = '#44464b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner driver diaphragm shimmer
      ctx.beginPath();
      ctx.arc(x - 4, y - 4, holeRadius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
    }
  }

  // 4 Torx screw positions
  const screwPositions = [
    [170, 170],
    [size - 170, 170],
    [170, size - 170],
    [size - 170, size - 170]
  ];

  screwPositions.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#4a4d52';
    ctx.fill();

    // Torx star indent
    ctx.strokeStyle = '#1a1b1d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy);
    ctx.lineTo(sx + 8, sy);
    ctx.moveTo(sx, sy - 8);
    ctx.lineTo(sx, sy + 8);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  return tex;
}

/**
 * 6. Smart Case Soft-Touch Microfiber Normal Map
 * Produces subtle matte leatherette / microfiber grain with perimeter seam.
 */
export function createSmartCaseNormalMap(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const nx = (Math.random() - 0.5) * 22;
    const ny = (Math.random() - 0.5) * 22;
    data[i] = 128 + nx;
    data[i + 1] = 128 + ny;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = canvasToTexture(canvas, THREE.RepeatWrapping, THREE.RepeatWrapping, 4, 4);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * 7. Studio HDRI / Softbox Environment Map Generator
 * Generates an equirectangular studio lighting texture with softbox gradients.
 */
export function createStudioEnvironmentTexture(renderer) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Studio ambient gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#3a3d42');
  bgGrad.addColorStop(0.5, '#1e2023');
  bgGrad.addColorStop(1, '#0e0f11');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Overhead Key Softbox (Top bright area for crisp metallic reflections)
  const topSoftbox = ctx.createRadialGradient(width * 0.5, height * 0.22, 10, width * 0.5, height * 0.22, 420);
  topSoftbox.addColorStop(0, '#ffffff');
  topSoftbox.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
  topSoftbox.addColorStop(0.7, 'rgba(240, 245, 255, 0.45)');
  topSoftbox.addColorStop(1, 'rgba(200, 210, 230, 0)');
  ctx.fillStyle = topSoftbox;
  ctx.fillRect(0, 0, width, height * 0.5);

  // Left Rim Light Softbox
  const leftRim = ctx.createRadialGradient(width * 0.18, height * 0.45, 10, width * 0.18, height * 0.45, 280);
  leftRim.addColorStop(0, '#f0f5ff');
  leftRim.addColorStop(0.5, 'rgba(220, 235, 255, 0.55)');
  leftRim.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftRim;
  ctx.fillRect(0, 0, width * 0.4, height);

  // Right Accent Softbox
  const rightRim = ctx.createRadialGradient(width * 0.82, height * 0.42, 10, width * 0.82, height * 0.42, 320);
  rightRim.addColorStop(0, '#ffffff');
  rightRim.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
  rightRim.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightRim;
  ctx.fillRect(width * 0.6, 0, width * 0.4, height);

  // Bottom subtle floor bounce
  const floorBounce = ctx.createLinearGradient(0, height * 0.7, 0, height);
  floorBounce.addColorStop(0, 'rgba(0, 0, 0, 0)');
  floorBounce.addColorStop(1, 'rgba(80, 85, 95, 0.25)');
  ctx.fillStyle = floorBounce;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  if (renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    pmremGenerator.dispose();
    return envMap;
  }

  return texture;
}
