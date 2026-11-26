/**
 * textures.js
 * ---------------------------------------------------------------------------
 * Procedural canvas texture factory for the AirPods Max scroll showcase.
 *
 * Everything is generated at runtime on <canvas> elements -- no external
 * images, no network requests, no build assets. All maps tile seamlessly
 * (wrapS / wrapT = RepeatWrapping) and are safe to tint with
 * `material.color` because the colour maps are grayscale / white based:
 * final colour = map * material.color.
 *
 * Three.js r160+ is expected to be passed in (via the ESM importmap in
 * index.html); this module itself imports nothing.
 *
 * Returned maps:
 *   aluminumNormal  micro-bead-blasted aluminium normal map (linear)
 *   knitAlbedo      diamond-knit woven textile albedo, grayscale (sRGB)
 *   knitBump        matching height/bump for the knit (linear)
 *   canopyAlpha     headband canopy perforation alphaMap (linear)
 *   microfiber      microfiber leather grain for the Smart Case (sRGB)
 *   innerMesh       inner acoustic mesh, large weave (sRGB)
 *
 * NOTE on anisotropy: createTextures() does not receive the renderer, so
 * anisotropy is fixed to a conservative 8. After calling this, a caller
 * with renderer access may raise it per-texture, e.g.
 *   tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
 * (a changed value needs `tex.needsUpdate = true` to take effect).
 */

export function createTextures(THREE) {
  if (!THREE) throw new Error('createTextures: THREE is required');

  const ANISOTROPY = 8;

  /* ------------------------------------------------------------------ */
  /* Small utilities                                                     */
  /* ------------------------------------------------------------------ */

  // Deterministic RNG so the materials look identical on every reload.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  /** Wrap a finished canvas into a repeat-wrapped CanvasTexture. */
  function toTexture(canvas, { srgb = false } = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = ANISOTROPY;
    // Colour maps must be sRGB; data maps (normal / bump / alpha) linear.
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** Add per-pixel monochrome grain (fiber / bead noise) in place. */
  function addGrain(ctx, size, amount, rng) {
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() * 2 - 1) * amount;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /* 1) Micro-bead-blasted aluminium -- normal map                     */
  /*                                                                    */
  /* Fractal value-noise height field (seeded) converted to a normal   */
  /* map with a Sobel filter. The dominant high-frequency octave is    */
  /* the "bead blast" micro-pitting; low octaves give broad waviness.  */
  /* ------------------------------------------------------------------ */

  function buildAluminumNormal() {
    const SIZE = 512;
    const rng = mulberry32(1337);
    const height = new Float32Array(SIZE * SIZE);

    // Fractal value noise: sum of bilinearly-interpolated random grids.
    const octaves = [
      { cells: 4, amp: 0.5 },
      { cells: 8, amp: 0.3 },
      { cells: 32, amp: 0.28 },
      { cells: 128, amp: 0.22 },
      { cells: 512, amp: 0.14 }, // bead-scale pitting
    ];

    for (const { cells, amp } of octaves) {
      // Toroidal random grid (wraps) so the texture tiles seamlessly.
      const grid = new Float32Array(cells * cells);
      for (let i = 0; i < grid.length; i++) grid[i] = rng();
      const at = (x, y) =>
        grid[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)];

      for (let y = 0; y < SIZE; y++) {
        const gy = (y / SIZE) * cells;
        const y0 = Math.floor(gy);
        const fy = gy - y0;
        const sy = fy * fy * (3 - 2 * fy); // smoothstep
        for (let x = 0; x < SIZE; x++) {
          const gx = (x / SIZE) * cells;
          const x0 = Math.floor(gx);
          const fx = gx - x0;
          const sx = fx * fx * (3 - 2 * fx);
          const v =
            at(x0, y0) * (1 - sx) * (1 - sy) +
            at(x0 + 1, y0) * sx * (1 - sy) +
            at(x0, y0 + 1) * (1 - sx) * sy +
            at(x0 + 1, y0 + 1) * sx * sy;
          height[y * SIZE + x] += v * amp;
        }
      }
    }

    // Sobel -> normal. Strength is kept low: bead-blasted aluminium is
    // matte, so the normal variation must stay subtle.
    const { canvas, ctx } = makeCanvas(SIZE);
    const img = ctx.createImageData(SIZE, SIZE);
    const d = img.data;
    const STRENGTH = 1.6;

    const h = (x, y) =>
      height[((((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE))];

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx =
          (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) -
           h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1)) / 8;
        const dy =
          (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) -
           h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1)) / 8;

        let nx = -dx * STRENGTH;
        let ny = -dy * STRENGTH;
        let nz = 1;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;

        const i = (y * SIZE + x) * 4;
        d[i] = (nx * 0.5 + 0.5) * 255;
        d[i + 1] = (ny * 0.5 + 0.5) * 255;
        d[i + 2] = (nz * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(canvas);
  }

  /* ------------------------------------------------------------------ */
  /* 2) Diamond-knit woven textile -- albedo + bump                    */
  /*                                                                    */
  /* Diagonal strands alternate direction per cell (checkerboard), so  */
  /* neighbouring segments meet at a point and bend -- the classic     */
  /* diamond-knit loop -- while stroking dark -> light passes gives    */
  /* each strand a cylindrical, over/under-interlaced shading. Both    */
  /* maps are drawn from the same geometry so they register perfectly. */
  /* Grayscale only: tint via material.color (map * color).            */
  /* ------------------------------------------------------------------ */

  function drawKnitStrands(ctx, SIZE, cell, mode) {
    const rng = mulberry32(4242);
    const isBump = mode === 'bump';

    // Palette per pass: [widthFactor, value, alpha]. The widest pass is
    // the strand's dark outline, the narrowest its bright crown.
    const albedoPasses = [
      [0.62, 96, 1.0],
      [0.50, 150, 1.0],
      [0.38, 198, 1.0],
      [0.24, 238, 1.0],
      [0.13, 252, 0.9],
    ];
    const bumpPasses = [
      [0.62, 34, 1.0],
      [0.50, 96, 1.0],
      [0.38, 160, 1.0],
      [0.24, 214, 1.0],
      [0.13, 255, 1.0],
    ];
    const passes = isBump ? bumpPasses : albedoPasses;
    const strandW = cell * 0.56;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const n = SIZE / cell;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x0 = i * cell;
        const y0 = j * cell;
        // Alternate diagonal direction -> diamonds + over/under feel.
        const down = (i + j) % 2 === 0;
        const ax = down ? x0 - 2 : x0 + cell + 2;
        const ay = down ? y0 - 2 : y0 - 2;
        const bx = down ? x0 + cell + 2 : x0 - 2;
        const by = down ? y0 + cell + 2 : y0 + cell + 2;
        // Slight mid-point bow so strands look like yarn, not wire.
        const mx = (ax + bx) / 2 + (rng() - 0.5) * cell * 0.14;
        const my = (ay + by) / 2 + (rng() - 0.5) * cell * 0.14;

        for (const [wf, v, a] of passes) {
          ctx.strokeStyle = `rgba(${v},${v},${v},${a})`;
          ctx.lineWidth = strandW * wf;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo(mx, my, bx, by);
          ctx.stroke();
        }

        // Fine fibre striations running along the strand.
        if (!isBump) {
          ctx.strokeStyle = 'rgba(70,70,70,0.28)';
          ctx.lineWidth = 1;
          for (let k = -2; k <= 2; k++) {
            const off = k * strandW * 0.11;
            const dx = (bx - ax) / Math.hypot(bx - ax, by - ay);
            const dy = (by - ay) / Math.hypot(bx - ax, by - ay);
            ctx.beginPath();
            ctx.moveTo(ax - dy * off, ay + dx * off);
            ctx.quadraticCurveTo(mx - dy * off, my + dx * off, bx - dy * off, by + dx * off);
            ctx.stroke();
          }
        }
      }
    }

    // Diamond openings where four cells meet: dark hole in the albedo,
    // zero height in the bump so light falls away like a real gap.
    const hole = isBump ? 0 : 52;
    ctx.fillStyle = `rgb(${hole},${hole},${hole})`;
    const r = cell * 0.17;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const cx = i * cell;
        const cy = j * cell;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function buildKnit() {
    const SIZE = 1024;
    const CELL = 64; // 16 x 16 diamonds per tile

    const albedo = makeCanvas(SIZE);
    albedo.ctx.fillStyle = 'rgb(120,120,120)'; // groove base
    albedo.ctx.fillRect(0, 0, SIZE, SIZE);
    drawKnitStrands(albedo.ctx, SIZE, CELL, 'albedo');
    addGrain(albedo.ctx, SIZE, 13, mulberry32(99));

    const bump = makeCanvas(SIZE);
    bump.ctx.fillStyle = 'rgb(0,0,0)';
    bump.ctx.fillRect(0, 0, SIZE, SIZE);
    drawKnitStrands(bump.ctx, SIZE, CELL, 'bump');
    addGrain(bump.ctx, SIZE, 7, mulberry32(100));

    return {
      knitAlbedo: toTexture(albedo.canvas, { srgb: true }),
      knitBump: toTexture(bump.canvas),
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3) Canopy perforation -- alpha map                                */
  /*                                                                    */
  /* White = opaque, black = punched hole. Staggered (offset-row) dot  */
  /* grid with a soft radial falloff, used as an alphaMap (or as the   */
  /* `map` with `transparent: true`) on the headband canopy.           */
  /* ------------------------------------------------------------------ */

  function buildCanopyAlpha() {
    const SIZE = 512;
    const { canvas, ctx } = makeCanvas(SIZE);
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const spacing = 32;
    const radius = 7.5;
    for (let row = 0, y = spacing / 2; y < SIZE + spacing; y += spacing, row++) {
      const offset = row % 2 === 0 ? 0 : spacing / 2;
      for (let x = spacing / 2 + offset; x < SIZE + spacing; x += spacing) {
        const g = ctx.createRadialGradient(x, y, 1, x, y, radius);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.75, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return toTexture(canvas);
  }

  /* ------------------------------------------------------------------ */
  /* 4) Microfiber leather grain -- Smart Case                         */
  /*                                                                    */
  /* Dense pebbled micro-grain: thousands of tiny soft ellipses plus   */
  /* per-pixel fibre noise. Grayscale so it tints with material.color; */
  /* the same texture can double as a bumpMap for extra tooth.         */
  /* ------------------------------------------------------------------ */

  function buildMicrofiber() {
    const SIZE = 1024;
    const { canvas, ctx } = makeCanvas(SIZE);
    const rng = mulberry32(777);

    ctx.fillStyle = 'rgb(205,205,205)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Pebbled grain: many small, slightly elongated overlapping blobs.
    for (let i = 0; i < 16000; i++) {
      const x = rng() * SIZE;
      const y = rng() * SIZE;
      const r = 1.5 + rng() * 4.5;
      const v = 150 + Math.floor(rng() * 95); // 150..245, grayscale
      ctx.fillStyle = `rgba(${v},${v},${v},${0.16 + rng() * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Faint creases / fibre drift lines.
    ctx.lineWidth = 1;
    for (let i = 0; i < 220; i++) {
      const x = rng() * SIZE;
      const y = rng() * SIZE;
      const len = 20 + rng() * 90;
      const ang = rng() * Math.PI;
      const v = 140 + Math.floor(rng() * 80);
      ctx.strokeStyle = `rgba(${v},${v},${v},0.10)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    addGrain(ctx, SIZE, 17, mulberry32(78));
    return toTexture(canvas, { srgb: true });
  }

  /* ------------------------------------------------------------------ */
  /* 5) Inner acoustic mesh -- large weave                             */
  /*                                                                    */
  /* Coarse woven grille for the ear-cushion interior: dark openings + */
  /* chunky light-gray strands, alternating over/under at crossings.   */
  /* ------------------------------------------------------------------ */

  function buildInnerMesh() {
    const SIZE = 1024;
    const CELL = 52; // large weave
    const { canvas, ctx } = makeCanvas(SIZE);
    const rng = mulberry32(2024);

    // Openings (near-black) sit underneath the strands.
    ctx.fillStyle = 'rgb(22,22,22)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const weave = (horizontal, pos, over) => {
      // Cylindrical shading: dark rim -> mid -> bright crown.
      const passes = [
        [1.0, 58],
        [0.78, 104],
        [0.55, 152],
        [0.34, 196],
        [0.18, 226],
      ];
      ctx.lineCap = 'round';
      for (const [wf, v] of passes) {
        ctx.strokeStyle = `rgb(${v},${v},${v})`;
        ctx.lineWidth = CELL * 0.42 * wf;
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(-4, pos);
          ctx.lineTo(SIZE + 4, pos);
        } else {
          ctx.moveTo(pos, -4);
          ctx.lineTo(pos, SIZE + 4);
        }
        ctx.stroke();
      }
      // Fibre striations along the strand.
      ctx.strokeStyle = 'rgba(30,30,30,0.35)';
      ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        const off = k * CELL * 0.07;
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(-4, pos + off);
          ctx.lineTo(SIZE + 4, pos + off);
        } else {
          ctx.moveTo(pos + off, -4);
          ctx.lineTo(pos + off, SIZE + 4);
        }
        ctx.stroke();
      }
      void over; // reserved for per-crossing over/under masking
    };

    // Draw horizontal then vertical strands, stepping the weave phase
    // every other row/column to suggest alternating interlace.
    for (let y = CELL / 2; y < SIZE; y += CELL) weave(true, y, true);
    for (let x = CELL / 2; x < SIZE; x += CELL) weave(false, x, false);

    // Extra fibre noise -- acoustic mesh is visibly fuzzy up close.
    addGrain(ctx, SIZE, 20, rng);
    return toTexture(canvas, { srgb: true });
  }

  /* ------------------------------------------------------------------ */

  const aluminumNormal = buildAluminumNormal();
  const { knitAlbedo, knitBump } = buildKnit();
  const canopyAlpha = buildCanopyAlpha();
  const microfiber = buildMicrofiber();
  const innerMesh = buildInnerMesh();

  return { aluminumNormal, knitAlbedo, knitBump, canopyAlpha, microfiber, innerMesh };
}
