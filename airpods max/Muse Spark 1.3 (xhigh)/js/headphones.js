/**
 * headphones.js — Photorealistic AirPods Max + Smart Case model.
 *
 * Export: buildAirPodsMax(THREE, textures) -> {
 *   group, parts, materials, anchors,
 *   setColorway, setCushionDetach, setExploded, setCaseFlap, setCupSwivel
 * }
 *
 * Conventions (per spec):
 *  - root `group` origin at headset centre, y-up, front faces +Z.
 *  - Cups sit on the X axis (left = -X, right = +X), cushion faces inward.
 *  - All dimensions are in "scene units" (~1 unit ≈ 100 mm; a 40 mm driver
 *    is therefore a 0.40-unit disc).
 *  - Only THREE r160 core APIs are used. No external assets — every
 *    texture not supplied via `textures` is generated on a canvas.
 *  - Hierarchical: each cup hangs from a pivot at the arm / yoke joint,
 *    so setCupSwivel() rotates the whole cup assembly about that joint.
 */

export function buildAirPodsMax(THREE, textures = {}) {
  const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ------------------------------------------------------------------ *
   * 0. Texture helpers (supplied textures win; canvas otherwise)       *
   * ------------------------------------------------------------------ */

  function pickTexture(keys) {
    if (!textures) return null;
    for (const k of keys) if (textures[k]) return textures[k];
    // Fallback: substring search over whatever the caller supplied.
    const all = Object.keys(textures);
    for (const k of keys) {
      const hit = all.find((n) => n.toLowerCase().includes(k.toLowerCase()));
      if (hit && textures[hit] && textures[hit].isTexture) return textures[hit];
    }
    return null;
  }

  function prepareTex(tex, { srgb = false, repeat = 1 } = {}) {
    if (!tex) return null;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat = tex.repeat || new THREE.Vector2(repeat, repeat);
    if (srgb && 'colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    if ('anisotropy' in tex) tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  function canvasTexture(w, h, draw) {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // "L" / "R" marking printed on the acoustic mesh inside each cushion.
  function letterTexture(letter) {
    return canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#2a2a2c'; g.fillRect(0, 0, w, h);
      // fine acoustic-mesh dot grid
      g.fillStyle = 'rgba(255,255,255,0.10)';
      for (let y = 8; y < h; y += 16)
        for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
      g.font = '700 300px system-ui, Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(240,240,240,0.92)';
      g.fillText(letter, w / 2, h / 2 + 8);
    });
  }

  // Baffle disc: opaque web with real punched holes (alpha).
  function baffleTexture() {
    const tex = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#3a3d40'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let y = 10; y < h; y += 22)
        for (let x = 10; x < w; x += 22) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'destination-out';
      for (let y = 24; y < h; y += 44)
        for (let x = 24; x < w; x += 44) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'source-over';
    });
    // CanvasTexture is sRGB for colour; the punched holes live in alpha,
    // which is fine for a transparent material.
    return tex;
  }

  // Perforation alpha for the canopy knit (white = solid, black = hole).
  function canopyAlphaTexture() {
    const tex = canvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#000000';
      for (let y = 8; y < h; y += 18)
        for (let x = ((y / 18) % 2) * 9 + 8; x < w; x += 18) {
          g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
        }
    });
    if (tex) tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  // Subtle woven noise used as a bump map when no knit bump is supplied.
  function weaveBumpTexture() {
    const tex = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 6) { g.fillStyle = (y / 6) % 2 ? '#9a9a9a' : '#666666'; g.fillRect(0, y, w, 3); }
      for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x, 0, 2, h); }
    });
    if (tex) tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  const knitAlbedoTex = prepareTex(pickTexture(['knitAlbedo', 'knit', 'knitMap']), { srgb: true, repeat: 3 });
  const knitBumpTex = prepareTex(pickTexture(['knitBump', 'knitNormal', 'knitBumpMap']), { repeat: 3 }) || weaveBumpTexture();
  const aluminumNormalTex = prepareTex(pickTexture(['aluminumNormal', 'aluminiumNormal', 'aluminum', 'metalNormal']), { repeat: 2 });
  const canopyAlphaTex = prepareTex(pickTexture(['canopyAlpha', 'canopy', 'canopyMap']), { repeat: 4 }) || canopyAlphaTexture();
  const caseTex = prepareTex(pickTexture(['caseAlbedo', 'microfiber', 'case']), { srgb: true, repeat: 2 });

  /* ------------------------------------------------------------------ *
   * 1. Materials (the `materials` returned to the caller)              *
   * ------------------------------------------------------------------ */

  const aluminum = new THREE.MeshStandardMaterial({
    color: 0xd9dbde, metalness: 0.92, roughness: 0.25, envMapIntensity: 1.25,
  });
  if (aluminumNormalTex) {
    aluminum.normalMap = aluminumNormalTex;
    aluminum.normalScale = new THREE.Vector2(0.35, 0.35);
  }

  const steel = new THREE.MeshStandardMaterial({
    color: 0xf2f2f4, metalness: 1.0, roughness: 0.06, envMapIntensity: 1.5,
  });

  const knit = new THREE.MeshStandardMaterial({
    color: 0xe9e6df, metalness: 0.0, roughness: 0.94,
    bumpMap: knitBumpTex, bumpScale: 0.6,
  });
  if (knitAlbedoTex) knit.map = knitAlbedoTex;

  const canopy = new THREE.MeshStandardMaterial({
    color: 0xe9e6df, metalness: 0.0, roughness: 0.92,
    bumpMap: knitBumpTex, bumpScale: 0.5,
    alphaMap: canopyAlphaTex, alphaTest: 0.12, transparent: true, side: THREE.DoubleSide,
  });
  if (knitAlbedoTex) canopy.map = knitAlbedoTex;

  const innerMeshTex = prepareTex(pickTexture(['innerMesh', 'innerMeshAlbedo']), { srgb: true, repeat: 2 });
  const innerMesh = new THREE.MeshStandardMaterial({
    color: 0x2b2b2e, metalness: 0.05, roughness: 0.85,
    bumpMap: knitBumpTex, bumpScale: 0.35,
  });
  if (innerMeshTex) innerMesh.map = innerMeshTex;

  const blackPlastic = new THREE.MeshStandardMaterial({
    color: 0x121214, metalness: 0.15, roughness: 0.42,
  });

  const circuit = new THREE.MeshStandardMaterial({
    color: 0x0e5c2c, metalness: 0.25, roughness: 0.45,
  });

  // Supporting materials (not part of the public `materials` dict).
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1.0, roughness: 0.28 });
  const driverMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.35, roughness: 0.5 });
  const driverConeMat = new THREE.MeshStandardMaterial({ color: 0x232326, metalness: 0.1, roughness: 0.65 });
  const flexMat = new THREE.MeshStandardMaterial({ color: 0xd4691e, metalness: 0.1, roughness: 0.55 });
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.4, roughness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1.0, roughness: 0.25 });
  const caseMat = new THREE.MeshStandardMaterial({
    color: 0xe6e3dc, metalness: 0.0, roughness: 1.0,
    bumpMap: knitBumpTex, bumpScale: 0.4,
  });
  if (caseTex) caseMat.map = caseTex;
  const baffleMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, metalness: 0.1, roughness: 0.7,
    map: baffleTexture(), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide,
  });

  // Spec-required keys first; `case` is an extra alias the showcase's
  // colour-chase in main.js reads as materials.case.
  const materials = { aluminum, steel, knit, canopy, innerMesh, blackPlastic, circuit, case: caseMat };

  /* ------------------------------------------------------------------ *
   * 2. Small geometry helpers                                          *
   * ------------------------------------------------------------------ */

  function mesh(geo, mat, name = '') {
    const m = new THREE.Mesh(geo, mat);
    if (name) m.name = name;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // Arc curve (upper half-circle in the XY plane) for the headband.
  function arcCurve(radius, centerY, arc = Math.PI, segments = 48) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * arc;               // 0 .. PI, left end -> right end
      pts.push(V3(Math.cos(a) * radius, centerY + Math.sin(a) * radius, 0));
    }
    return new THREE.CatmullRomCurve3(pts);
  }

  function roundedRectShape(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* ------------------------------------------------------------------ *
   * 3. Ear-cup shell — lathed, rounded-rectangle / oval profile        *
   * ------------------------------------------------------------------ */
  // Lathe profile (radius, depth along axis). Dome on +Y, flat inner face.
  const SHELL_PROFILE = [
    [0.001, 0.190], [0.120, 0.188], [0.240, 0.180], [0.340, 0.165],
    [0.420, 0.145], [0.480, 0.115], [0.515, 0.075], [0.530, 0.025],
    [0.535, -0.030], [0.530, -0.080], [0.515, -0.125], [0.480, -0.160],
    [0.420, -0.185], [0.300, -0.195], [0.001, -0.195],
  ];

  function shellGeometry(sign) {
    const pts = SHELL_PROFILE.map(([r, d]) => new THREE.Vector2(r, d));
    const geo = new THREE.LatheGeometry(pts, 72);
    // Lathe axis is +Y; map it onto the cup axis (+X for right, -X for left).
    geo.rotateZ(-sign * Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  /* ------------------------------------------------------------------ *
   * 4. Per-cup internals: driver / H1 / baffle / magnetic ring         *
   * ------------------------------------------------------------------ */

  function buildDriver(sign = 1) {
    const g = new THREE.Group(); g.name = 'driver';
    // Basket / frame
    const basket = mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.055, 48), driverMat, 'driverBasket');
    basket.geometry.rotateZ(Math.PI / 2); // axis -> X (facing inward/outward)
    g.add(basket);
    // Cone (tapered cylinder) — paper/carbon cone
    const coneGeo = new THREE.CylinderGeometry(0.085, 0.19, 0.05, 48, 1, true);
    coneGeo.rotateZ(Math.PI / 2);
    const cone = mesh(coneGeo, driverConeMat, 'driverCone');
    cone.position.x = -sign * 0.028; // toward cushion (inward)
    g.add(cone);
    // Dust cap — flattened sphere
    const cap = mesh(new THREE.SphereGeometry(0.085, 32, 16), driverMat, 'dustCap');
    cap.scale.set(0.45, 1, 1); cap.position.x = -sign * 0.05;
    g.add(cap);
    // Copper voice-coil ring
    const coilGeo = new THREE.TorusGeometry(0.175, 0.016, 16, 64);
    coilGeo.rotateY(Math.PI / 2); // torus plane -> YZ
    g.add(mesh(coilGeo, copper, 'copperCoil'));
    // Dual-neodymium ring magnet
    const magnetGeo = new THREE.TorusGeometry(0.155, 0.028, 16, 64);
    magnetGeo.rotateY(Math.PI / 2);
    g.add(mesh(magnetGeo, steel, 'neodymiumMagnet'));
    // Terminals + surround ring
    const surroundGeo = new THREE.TorusGeometry(0.19, 0.018, 12, 64);
    surroundGeo.rotateY(Math.PI / 2);
    const surround = mesh(surroundGeo, blackPlastic, 'driverSurround');
    surround.position.x = -sign * 0.02; g.add(surround);
    for (let i = 0; i < 2; i++) {
      const t = mesh(new THREE.BoxGeometry(0.02, 0.05, 0.03), goldMat, 'driverTerminal');
      t.position.set(sign * 0.02, i ? 0.22 : -0.22, 0); g.add(t);
    }
    // 4 basket screws
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const s = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 12), steel, 'driverScrew');
      s.geometry.rotateZ(Math.PI / 2);
      s.position.set(0, Math.cos(a) * 0.19, Math.sin(a) * 0.19);
      g.add(s);
    }
    return g;
  }

  function buildH1Board(sign = 1) {
    const g = new THREE.Group(); g.name = 'h1Board';
    // PCB — thin in X so it lies parallel to the cup face (YZ plane)
    const pcb = mesh(new THREE.BoxGeometry(0.016, 0.30, 0.24), circuit, 'pcb');
    g.add(pcb);
    // H1 SoC (inward face of the board)
    const soc = mesh(new THREE.BoxGeometry(0.03, 0.09, 0.09), chipMat, 'h1Chip');
    soc.position.set(-sign * 0.02, 0.02, 0.02); g.add(soc);
    // Gold label plate on the SoC
    const label = mesh(new THREE.BoxGeometry(0.004, 0.05, 0.05), goldMat, 'h1Label');
    label.position.set(-sign * 0.037, 0.02, 0.02); g.add(label);
    // Decoupling caps / passives
    const capPos = [[-0.05, -0.07, 0.16], [-0.04, 0.10, -0.14], [-0.06, -0.11, -0.05]];
    for (const [x, y, z] of capPos) {
      const c = mesh(new THREE.BoxGeometry(0.03, 0.035, 0.05), chipMat, 'h1Passive');
      c.position.set(sign * x, y, z); g.add(c);
    }
    // Sensor ribbon / flex cable: thin bent tube from PCB toward the driver
    const flexCurve = new THREE.CatmullRomCurve3([
      V3(-sign * 0.01, 0.08, 0.05), V3(-sign * 0.06, 0.02, -0.02),
      V3(-sign * 0.10, -0.06, -0.09), V3(-sign * 0.14, -0.10, -0.14),
    ]);
    const flex = mesh(new THREE.TubeGeometry(flexCurve, 24, 0.011, 8), flexMat, 'flexCable');
    g.add(flex);
    // Connector block
    const conn = mesh(new THREE.BoxGeometry(0.035, 0.05, 0.06), blackPlastic, 'flexConnector');
    conn.position.set(-sign * 0.01, 0.13, -0.04); g.add(conn);
    return g;
  }

  function buildBaffle(sign = 1) {
    const g = new THREE.Group(); g.name = 'baffle';
    const faceY = sign === 1 ? -Math.PI / 2 : Math.PI / 2; // face inward (-sign * X)
    const disc = mesh(new THREE.CircleGeometry(0.44, 64), baffleMat, 'baffleDisc');
    disc.geometry.rotateY(faceY);
    g.add(disc);
    const rimGeo = new THREE.TorusGeometry(0.44, 0.016, 16, 72);
    rimGeo.rotateY(Math.PI / 2);
    g.add(mesh(rimGeo, blackPlastic, 'baffleRim'));
    // Magnetic alignment ring (attaches cushion magnetically)
    const magGeo = new THREE.TorusGeometry(0.28, 0.02, 16, 72);
    magGeo.rotateY(Math.PI / 2);
    const mag = mesh(magGeo, steel, 'magneticRing');
    mag.position.x = -sign * 0.02; g.add(mag);
    // Acoustic foam pad behind the baffle
    const padGeo = new THREE.CircleGeometry(0.36, 48);
    padGeo.rotateY(faceY);
    const pad = mesh(padGeo, innerMesh, 'acousticFoam');
    pad.position.x = sign * 0.015; g.add(pad);
    return g;
  }

  /* ------------------------------------------------------------------ *
   * 5. One ear cup (pivot at the arm joint -> swivel)                  *
   * ------------------------------------------------------------------ */

  const CUP_X = 1.15, CUP_Y = -0.55, PIVOT_Y = 0.14;
  const explodedItems = [];   // { obj, base:Vector3, dir:number, dist:number }
  const cushions = {};        // side -> { group, base, inward:Vector3 }

  function buildCup(side) {
    const sign = side === 'right' ? 1 : -1;
    const letter = side === 'right' ? 'R' : 'L';

    const pivot = new THREE.Group();
    pivot.name = side === 'right' ? 'rightCup' : 'leftCup';
    pivot.position.set(sign * CUP_X, PIVOT_Y, 0);

    const assembly = new THREE.Group();
    assembly.name = side + 'CupAssembly';
    assembly.position.set(0, CUP_Y - PIVOT_Y, 0); // cup centre below the joint
    pivot.add(assembly);

    // --- Outer shell (scaled lathe -> oval) ---
    const shell = mesh(shellGeometry(sign), aluminum, side + 'Shell');
    shell.scale.set(1, 1.18, 0.92); // tall oval, slightly narrower front-back
    assembly.add(shell);
    // Domed outer cap plate (subtle, catches the light)
    const capGeo = new THREE.SphereGeometry(0.34, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.rotateZ(side === 'right' ? -Math.PI / 2 : Math.PI / 2);
    const cap = mesh(capGeo, aluminum, side + 'ShellCap');
    cap.scale.set(0.35, 1.05, 0.85);
    cap.position.x = sign * 0.175;
    assembly.add(cap);
    // Shell rim ring
    const rimGeo = new THREE.TorusGeometry(0.50, 0.018, 16, 72);
    rimGeo.rotateY(Math.PI / 2);
    const rim = mesh(rimGeo, aluminum, side + 'ShellRim');
    rim.scale.set(1, 1.18, 0.92);
    rim.position.x = -sign * 0.10;
    assembly.add(rim);

    // --- Mic slits (small black boxes around the rim) ---
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const slit = mesh(new THREE.BoxGeometry(0.018, 0.022, 0.075), blackPlastic, 'micSlit');
      slit.position.set(sign * 0.13, Math.cos(a) * 0.60, Math.sin(a) * 0.46);
      slit.rotation.x = -a;
      assembly.add(slit);
    }
    // --- Bottom acoustic vent slots (3 thin boxes) ---
    for (let i = -1; i <= 1; i++) {
      const vent = mesh(new THREE.BoxGeometry(0.10, 0.014, 0.028), blackPlastic, 'acousticVent');
      vent.position.set(-sign * 0.04, -0.63, i * 0.15);
      assembly.add(vent);
    }

    // --- Internals (stacked along the cup axis X) ---
    const driver = buildDriver(sign);
    driver.position.set(sign * 0.02, 0, 0);
    assembly.add(driver);

    const h1 = buildH1Board(sign);
    h1.position.set(sign * 0.09, 0, 0);
    assembly.add(h1);

    const baffle = buildBaffle(sign);
    baffle.position.set(-sign * 0.09, 0, 0);
    assembly.add(baffle);

    // --- Cushion: flattened oval torus + inner acoustic mesh with L/R ---
    const cushionGroup = new THREE.Group();
    cushionGroup.name = side + 'Cushion';
    cushionGroup.position.set(-sign * 0.185, 0, 0);

    const cushionGeo = new THREE.TorusGeometry(0.43, 0.095, 28, 80);
    cushionGeo.rotateY(Math.PI / 2); // ring plane -> YZ, axis -> X
    const cushion = mesh(cushionGeo, knit, side + 'CushionFoam');
    cushion.scale.set(1, 1.18, 0.92);
    cushionGroup.add(cushion);
    // Inner lip (second, tighter torus) for a molded foam edge
    const lipGeo = new THREE.TorusGeometry(0.36, 0.045, 20, 72);
    lipGeo.rotateY(Math.PI / 2);
    const lip = mesh(lipGeo, knit, side + 'CushionLip');
    lip.scale.set(1, 1.18, 0.92);
    lip.position.x = -sign * 0.045;
    cushionGroup.add(lip);
    // Inner acoustic-mesh disc carrying the L/R letter
    const discGeo = new THREE.CircleGeometry(0.365, 56);
    discGeo.rotateY(side === 'right' ? -Math.PI / 2 : Math.PI / 2); // face inward
    const discMat = innerMesh.clone();
    discMat.map = letterTexture(letter);
    discMat.color = new THREE.Color(0xffffff);
    const disc = mesh(discGeo, discMat, side + 'InnerMesh');
    disc.scale.set(1, 1.18, 0.92);
    disc.position.x = -sign * 0.07;
    cushionGroup.add(disc);
    assembly.add(cushionGroup);

    // Register exploded-view travel (all along X, mirrored per side).
    // Outward = +sign*X: shell leads, then H1, then driver, then baffle,
    // and the cushion trails inward (handled with the detach offset).
    explodedItems.push(
      { obj: shell, base: shell.position.clone(), dir: sign, dist: 0.90 },
      { obj: cap, base: cap.position.clone(), dir: sign, dist: 0.90 },
      { obj: rim, base: rim.position.clone(), dir: sign, dist: 0.90 },
      { obj: h1, base: h1.position.clone(), dir: sign, dist: 0.60 },
      { obj: driver, base: driver.position.clone(), dir: sign, dist: 0.30 },
      { obj: baffle, base: baffle.position.clone(), dir: sign, dist: 0.05 },
    );
    cushions[side] = {
      group: cushionGroup, base: cushionGroup.position.clone(),
      inward: V3(-sign, 0, 0),
    };

    // Yoke hinge barrel at the pivot (visual joint to the arm)
    const hinge = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 24), aluminum, side + 'Hinge');
    hinge.geometry.rotateZ(Math.PI / 2);
    hinge.position.set(sign * 0.02, PIVOT_Y - CUP_Y, 0);
    assembly.add(hinge);

    return { pivot, assembly, shell, cushionGroup, driver, h1, baffle };
  }

  const left = buildCup('left');
  const right = buildCup('right');

  /* ------------------------------------------------------------------ *
   * 6. Digital Crown (right cup) — knurled, rotatable, named 'crown'   *
   * ------------------------------------------------------------------ */

  const crown = new THREE.Group();
  crown.name = 'crown';
  crown.position.set(0, 0.68, 0.06); // top of the right cup (assembly space)

  const crownStem = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 20), steel, 'crownStem');
  crownStem.position.y = -0.03; crown.add(crownStem);
  const crownBody = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.055, 48), aluminum, 'crownBody');
  crownBody.position.y = 0.028; crown.add(crownBody);
  const crownTop = mesh(new THREE.CylinderGeometry(0.092, 0.098, 0.012, 48), aluminum, 'crownTop');
  crownTop.position.y = 0.06; crown.add(crownTop);
  // Tiny index notch on the crown face
  const notch = mesh(new THREE.BoxGeometry(0.012, 0.006, 0.05), blackPlastic, 'crownNotch');
  notch.position.set(0, 0.068, 0.055); crown.add(notch);
  // Knurled edge: ~30 thin boxes instanced around the perimeter
  {
    const N = 30;
    const knurlGeo = new THREE.BoxGeometry(0.016, 0.048, 0.026);
    const knurl = new THREE.InstancedMesh(knurlGeo, steel, N);
    knurl.name = 'crownKnurl';
    knurl.castShadow = true; knurl.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.11, 0.028, Math.sin(a) * 0.11);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      knurl.setMatrixAt(i, dummy.matrix);
    }
    knurl.instanceMatrix.needsUpdate = true;
    crown.add(knurl);
  }
  right.assembly.add(crown);

  /* ------------------------------------------------------------------ *
   * 7. Noise Control button (right cup, upper edge)                    *
   * ------------------------------------------------------------------ */

  const noiseBtn = new THREE.Group();
  noiseBtn.name = 'noiseBtn';
  noiseBtn.position.set(0.10, 0.60, 0.30);
  noiseBtn.rotation.set(0.5, 0, 0.15);
  const pillGeo = new THREE.CapsuleGeometry(0.042, 0.085, 8, 20);
  pillGeo.rotateX(Math.PI / 2); // long axis -> Z
  const pill = mesh(pillGeo, blackPlastic, 'noisePill');
  pill.scale.set(0.65, 1, 1); // flattened pill
  noiseBtn.add(pill);
  // Small printed dot
  const ndot = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16), steel, 'noiseDot');
  ndot.geometry.rotateX(Math.PI / 2);
  ndot.position.set(0, 0.02, 0.045); noiseBtn.add(ndot);
  right.assembly.add(noiseBtn);

  /* ------------------------------------------------------------------ *
   * 8. Telescoping steel arms + yoke + headband / canopy               *
   * ------------------------------------------------------------------ */

  const HEADBAND_R = 1.15, HEADBAND_CY = 0.45;

  function buildArm(side) {
    const sign = side === 'right' ? 1 : -1;
    const g = new THREE.Group();
    g.name = side + 'Arm';

    // Headband sleeve (flattened aluminum housing the rod slides into)
    const sleeve = mesh(new THREE.BoxGeometry(0.13, 0.30, 0.24), aluminum, side + 'Sleeve');
    sleeve.position.set(sign * HEADBAND_R, HEADBAND_CY, 0);
    g.add(sleeve);
    const sleeveCap = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 24), aluminum, side + 'SleeveCap');
    sleeveCap.geometry.rotateZ(Math.PI / 2);
    sleeveCap.scale.set(1, 1, 1.6);
    sleeveCap.position.set(sign * HEADBAND_R, HEADBAND_CY + 0.02, 0);
    g.add(sleeveCap);

    // Polished telescoping steel rod
    const rod = mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.42, 24), steel, side + 'SteelRod');
    rod.position.set(sign * HEADBAND_R, HEADBAND_CY - 0.30, 0);
    g.add(rod);
    // Inner (darker) telescoping segment
    const rod2 = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.22, 20), steel, side + 'SteelRodInner');
    rod2.position.set(sign * HEADBAND_R, HEADBAND_CY - 0.46, 0);
    g.add(rod2);

    // Yoke: curved tube from rod bottom down to the cup pivot joint
    const yokeCurve = new THREE.CatmullRomCurve3([
      V3(sign * HEADBAND_R, HEADBAND_CY - 0.42, 0),
      V3(sign * (HEADBAND_R + 0.06), 0.28, 0),
      V3(sign * (HEADBAND_R + 0.03), PIVOT_Y + 0.06, 0),
      V3(sign * CUP_X, PIVOT_Y + 0.02, 0),
    ]);
    const yoke = mesh(new THREE.TubeGeometry(yokeCurve, 32, 0.032, 16), steel, side + 'Yoke');
    g.add(yoke);
    // Yoke-to-cup collar
    const collar = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.10, 20), aluminum, side + 'YokeCollar');
    collar.position.set(sign * CUP_X, PIVOT_Y + 0.05, 0);
    g.add(collar);
    return g;
  }

  const armL = buildArm('left');
  const armR = buildArm('right');

  // Canopy: TubeGeometry along the headband arc (outer) + underside liner
  const canopyGroup = new THREE.Group();
  canopyGroup.name = 'canopy';
  const canopyCurve = arcCurve(HEADBAND_R, HEADBAND_CY, Math.PI, 64);
  const canopyOuter = mesh(new THREE.TubeGeometry(canopyCurve, 96, 0.105, 24), canopy, 'canopyOuter');
  canopyOuter.scale.set(1, 1, 1.55); // widen front-to-back, keep arc shape
  canopyGroup.add(canopyOuter);
  // Visible underside liner (slightly inside the arc, dark knit)
  const linerCurve = arcCurve(HEADBAND_R - 0.045, HEADBAND_CY - 0.01, Math.PI, 64);
  const liner = mesh(new THREE.TubeGeometry(linerCurve, 96, 0.075, 20), knit, 'canopyLiner');
  liner.scale.set(1, 1, 1.35);
  liner.material = knit;
  canopyGroup.add(liner);
  // End caps where canopy meets the sleeves
  for (const s of [-1, 1]) {
    const end = mesh(new THREE.SphereGeometry(0.09, 24, 16), canopy, 'canopyEnd');
    end.scale.set(1, 0.8, 1.5);
    end.position.set(s * HEADBAND_R, HEADBAND_CY, 0);
    canopyGroup.add(end);
  }

  /* ------------------------------------------------------------------ *
   * 9. Smart Case — extruded rounded-box base + hinged flap            *
   * ------------------------------------------------------------------ */

  const caseGroup = new THREE.Group();
  caseGroup.name = 'caseGroup';
  caseGroup.position.set(0, -2.05, 0.25); // below the headset, footprint-matched

  function extrudedSlab(w, d, thick, bevel, mat, name) {
    const shape = roundedRectShape(w, d, bevel * 2.2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 6, curveSegments: 24,
    });
    geo.rotateX(-Math.PI / 2); // shape XY -> XZ footprint, extrusion -> +Y
    geo.center();
    return mesh(geo, mat, name);
  }

  // Footprint must fit the headphones lying flat (~2.6 x 1.05 units).
  const caseBase = extrudedSlab(2.75, 1.10, 0.30, 0.07, caseMat, 'caseBase');
  caseGroup.add(caseBase);
  // Soft inner tray lip
  const tray = extrudedSlab(2.55, 0.92, 0.06, 0.05, caseMat, 'caseTray');
  tray.position.y = 0.17; caseGroup.add(tray);
  // Magnetic snap stud
  const stud = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), steel, 'caseStud');
  stud.position.set(0, 0.20, 0); caseGroup.add(stud);

  // Hinged flap: pivot group at the back edge, mesh offset forward.
  const caseFlap = new THREE.Group();
  caseFlap.name = 'caseFlap';
  caseFlap.position.set(0, 0.20, -0.53);
  const flapMesh = extrudedSlab(2.75, 1.06, 0.13, 0.06, caseMat, 'caseFlapMesh');
  flapMesh.position.set(0, 0.02, 0.53); // extends +Z from the hinge
  caseFlap.add(flapMesh);
  // Hinge barrel
  const hingeBarrel = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 16), caseMat, 'caseHinge');
  hingeBarrel.geometry.rotateZ(Math.PI / 2);
  caseFlap.add(hingeBarrel);
  caseGroup.add(caseFlap);

  /* ------------------------------------------------------------------ *
   * 10. Anchors (for callouts / placement in the scene)                *
   * ------------------------------------------------------------------ */

  function anchor(parent, x, y, z, name) {
    const o = new THREE.Object3D();
    o.name = name; o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  const crownAnchor = anchor(crown, 0, 0.12, 0, 'crownAnchor');
  const noiseAnchor = anchor(noiseBtn, 0, 0.08, 0, 'noiseAnchor');
  const cushionAnchorL = anchor(left.cushionGroup, 0.25, 0, 0, 'cushionAnchorL');
  const cushionAnchorR = anchor(right.cushionGroup, -0.25, 0, 0, 'cushionAnchorR');
  const driverAnchor = anchor(right.driver, -0.10, 0, 0, 'driverAnchor');

  /* ------------------------------------------------------------------ *
   * 11. Assemble the headset root group                                *
   * ------------------------------------------------------------------ */

  const group = new THREE.Group();
  group.name = 'airPodsMax';
  group.add(canopyGroup, armL, armR, left.pivot, right.pivot, caseGroup);

  // Shadows everywhere appropriate (transparent baffle excluded).
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.material !== baffleMat;
      o.receiveShadow = true;
    }
  });

  /* ------------------------------------------------------------------ *
   * 12. Animation state + public setters                               *
   * ------------------------------------------------------------------ */

  const state = { detach: 0, exploded: 0, flap: 0, swivel: 0 };

  function updateCushions() {
    for (const side of ['left', 'right']) {
      const c = cushions[side];
      // Detach: lift along the cup normal (inward) + forward (+Z).
      // Exploded: travel further inward along the same normal.
      const normal = c.inward.clone().multiplyScalar(0.50 * state.detach + 0.65 * state.exploded);
      const fwd = V3(0, 0, 0.22 * state.detach);
      c.group.position.copy(c.base).add(normal).add(fwd);
    }
  }

  function updateExploded() {
    for (const it of explodedItems) {
      it.obj.position.copy(it.base);
      it.obj.position.x += it.dir * it.dist * state.exploded;
    }
    updateCushions();
  }

  function updateSwivel() {
    // Mirrored ±90° about the Y axis through each arm joint: both cushion
    // faces end up pointing forward, cups parallel — the flat storage pose.
    right.pivot.rotation.y = state.swivel * (Math.PI / 2);
    left.pivot.rotation.y = state.swivel * (-Math.PI / 2);
  }

  function updateFlap() {
    caseFlap.rotation.x = -1.92 * state.flap; // lift the flap up/back from its hinge
  }

  // Stored lerp targets (setColorway lerps each material toward them).
  const colorTargets = {
    aluminum: aluminum.color.clone(), knit: knit.color.clone(),
    canopy: canopy.color.clone(), case: caseMat.color.clone(),
  };

  function setColorway(colors = {}) {
    const toColor = (v, fallback) => {
      if (!v) return fallback;
      return v.isColor ? v : new THREE.Color(v);
    };
    if (colors.aluminum) colorTargets.aluminum.copy(toColor(colors.aluminum, colorTargets.aluminum));
    if (colors.knit) colorTargets.knit.copy(toColor(colors.knit, colorTargets.knit));
    if (colors.canopy) colorTargets.canopy.copy(toColor(colors.canopy, colorTargets.canopy));
    if (colors.case) colorTargets.case.copy(toColor(colors.case, colorTargets.case));
    // Lerp toward the targets. Factor 1.0 makes the result deterministic
    // (exact target colour after the call) while still interpolating from
    // the current colour, so repeated calls morph smoothly through the
    // caller's own per-frame damping if they choose to re-issue targets.
    aluminum.color.lerp(colorTargets.aluminum, 1.0);
    steel.color.lerp(new THREE.Color(0xf2f2f4).lerp(colorTargets.aluminum, 0.25), 1.0);
    knit.color.lerp(colorTargets.knit, 1.0);
    canopy.color.lerp(colorTargets.canopy, 1.0);
    caseMat.color.lerp(colorTargets.case, 1.0);
    // Cushions share `knit`; the case shares `caseMat` — both update above.
  }

  function setCushionDetach(t) { state.detach = clamp01(t); updateCushions(); }
  function setExploded(t) { state.exploded = clamp01(t); updateExploded(); }
  function setCaseFlap(t) { state.flap = clamp01(t); updateFlap(); }
  function setCupSwivel(t) { state.swivel = clamp01(t); updateSwivel(); }

  // Initial pose.
  updateExploded(); updateSwivel(); updateFlap();

  /* ------------------------------------------------------------------ *
   * 13. Public API                                                     *
   * ------------------------------------------------------------------ */

  const parts = {
    leftCup: left.pivot,
    rightCup: right.pivot,
    leftCushion: left.cushionGroup,
    rightCushion: right.cushionGroup,
    leftArm: armL,
    rightArm: armR,
    crown,
    noiseBtn,
    canopy: canopyGroup,
    driverL: left.driver,
    driverR: right.driver,
    h1Board: right.h1,
    shellL: left.shell,
    shellR: right.shell,
    baffleL: left.baffle,
    baffleR: right.baffle,
    caseGroup,
    caseFlap,
    caseBase,
  };

  const anchors = { crownAnchor, noiseAnchor, cushionAnchorL, cushionAnchorR, driverAnchor };

  return {
    group, parts, materials, anchors,
    setColorway, setCushionDetach, setExploded, setCaseFlap, setCupSwivel,
  };
}

export default buildAirPodsMax;
