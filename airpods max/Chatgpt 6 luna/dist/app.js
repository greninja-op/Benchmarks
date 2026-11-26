import * as THREE from "three";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const panel = document.getElementById("scene-panel");
const canvas = document.getElementById("product-view");
const fallback = document.querySelector(".fallback-image");
const progressFill = document.getElementById("progress-fill");
const swatchLabel = document.getElementById("swatch-label");
const leaderSvg = document.getElementById("leader-svg");
const chapters = Array.from(document.querySelectorAll(".chapter"));
const swatches = Array.from(document.querySelectorAll(".swatch"));
const palette = [
  { name: "Silver", shell: "#c7c9c9", canopy: "#e2e0dc", cushion: "#e6e4df", case: "#d5d4cf" },
  { name: "Space Gray", shell: "#4b5058", canopy: "#343941", cushion: "#30343c", case: "#383d45" },
  { name: "Sky Blue", shell: "#6d8fac", canopy: "#47718f", cushion: "#adbfca", case: "#365976" },
  { name: "Pink", shell: "#d18b95", canopy: "#c47784", cushion: "#e7bdc0", case: "#b97580" },
  { name: "Green", shell: "#779888", canopy: "#5d8272", cushion: "#bdc9bd", case: "#527565" }
];
const stops = [0, .12, .26, .44, .58, .72, .88, 1];
let selectedColor = null;
let targetProgress = 0;
let currentProgress = 0;
let pointer = { x: 0, y: 0 };
let activeChapter = -1;
let lastFrame = performance.now();

function noiseTexture(size, alpha) {
  const el = document.createElement("canvas");
  el.width = size;
  el.height = size;
  const ctx = el.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  if (!alpha) {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 199 + Math.floor(Math.random() * 38);
      img.data[i] = n;
      img.data[i + 1] = n;
      img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const thread = 9;
    for (let y = 0; y < size; y += thread) {
      const shift = Math.floor(y / thread) % 2 ? 4 : 0;
      for (let x = -thread; x < size + thread; x += thread) {
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.fillRect(x + shift, y + 1, thread - 1, 2.4);
        ctx.fillStyle = "rgba(73,78,81,.25)";
        ctx.fillRect(x + shift, y + 5, thread - 1, 1.2);
      }
    }
    for (let x = 0; x < size; x += thread) {
      const shift = Math.floor(x / thread) % 2 ? 4 : 0;
      for (let y = -thread; y < size + thread; y += thread) {
        ctx.fillStyle = "rgba(255,255,255,.54)";
        ctx.fillRect(x + 1, y + shift, 2.2, thread - 1);
        ctx.fillStyle = "rgba(62,67,70,.2)";
        ctx.fillRect(x + 5, y + shift, 1.1, thread - 1);
      }
    }
    return new THREE.CanvasTexture(el);
  }
  const step = 12;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const light = (x / step + y / step) % 2 === 0;
      ctx.fillStyle = light ? "rgba(255,255,255,.9)" : "rgba(90,96,99,.76)";
      ctx.fillRect(x + 1, y + 2, step - 2, 3);
      ctx.fillStyle = light ? "rgba(90,96,99,.45)" : "rgba(255,255,255,.75)";
      ctx.fillRect(x + 2, y + 1, 3, step - 2);
      ctx.clearRect(x + 5, y + 5, 3, 3);
    }
  }
  return new THREE.CanvasTexture(el);
}

const weaveMap = noiseTexture(512, false);
weaveMap.wrapS = weaveMap.wrapT = THREE.RepeatWrapping;
weaveMap.repeat.set(2.4, 2.4);
weaveMap.anisotropy = 8;
weaveMap.colorSpace = THREE.SRGBColorSpace;
const canopyMap = noiseTexture(512, true);
canopyMap.wrapS = canopyMap.wrapT = THREE.RepeatWrapping;
canopyMap.repeat.set(3.2, 1.9);
canopyMap.anisotropy = 8;
canopyMap.colorSpace = THREE.SRGBColorSpace;
const grainMap = noiseTexture(256, false);
grainMap.wrapS = grainMap.wrapT = THREE.RepeatWrapping;
grainMap.repeat.set(3, 3);
grainMap.anisotropy = 8;

function makeStudioEnvironment() {
  const el = document.createElement("canvas");
  el.width = 1024;
  el.height = 512;
  const ctx = el.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#d6dcde");
  gradient.addColorStop(.36, "#f7f7f5");
  gradient.addColorStop(.7, "#e7e9e7");
  gradient.addColorStop(1, "#bfc7ca");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);
  const softbox = (x, y, rx, ry, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const glow = ctx.createRadialGradient(0, 0, .1, 0, 0, 1);
    glow.addColorStop(0, color);
    glow.addColorStop(.55, "rgba(255,255,255,.14)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  };
  softbox(250, 135, 150, 250, "rgba(255,255,255,.96)");
  softbox(790, 125, 175, 225, "rgba(255,255,255,.92)");
  softbox(520, 270, 210, 115, "rgba(255,255,255,.62)");
  softbox(900, 390, 90, 165, "rgba(172,193,207,.45)");
  const tex = new THREE.CanvasTexture(el);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundedPoints(w, h, r, segments) {
  const radius = Math.min(r, w / 2, h / 2);
  const corners = [
    [w / 2 - radius, -h / 2 + radius, -Math.PI / 2, 0],
    [w / 2 - radius, h / 2 - radius, 0, Math.PI / 2],
    [-w / 2 + radius, h / 2 - radius, Math.PI / 2, Math.PI],
    [-w / 2 + radius, -h / 2 + radius, Math.PI, Math.PI * 1.5]
  ];
  const points = [];
  for (const c of corners) {
    for (let i = 0; i <= segments; i++) {
      const a = c[2] + (c[3] - c[2]) * i / segments;
      points.push([c[0] + Math.cos(a) * radius, c[1] + Math.sin(a) * radius]);
    }
  }
  return points;
}

function shapeFromPoints(points, reversed) {
  const p = reversed ? points.slice().reverse() : points;
  const shape = reversed ? new THREE.Path() : new THREE.Shape();
  shape.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) shape.lineTo(p[i][0], p[i][1]);
  shape.closePath();
  return shape;
}

function roundedShape(w, h, r, segments) {
  return shapeFromPoints(roundedPoints(w, h, r, segments || 10), false);
}

function roundedRingGeometry(w, h, r, iw, ih, ir, depth, bevel) {
  const outer = shapeFromPoints(roundedPoints(w, h, r, 12), false);
  const inner = shapeFromPoints(roundedPoints(iw, ih, ir, 12), true);
  outer.holes.push(inner);
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 16,
    steps: 1
  });
  geometry.computeVertexNormals();
  return geometry;
}

function roundedExtrudeGeometry(w, h, r, depth, bevel) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(w, h, r, 16), {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 16,
    steps: 1
  });
  geometry.computeVertexNormals();
  return geometry;
}

function makeRibbon(curve, width) {
  const uCount = 84;
  const vCount = 12;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= uCount; i++) {
    const u = i / uCount;
    const p = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const across = new THREE.Vector3(tangent.y, -tangent.x, 0).normalize();
    const sag = Math.sin(Math.PI * u) * .045;
    for (let j = 0; j <= vCount; j++) {
      const v = j / vCount;
      const q = p.clone().addScaledVector(across, .09 + sag);
      q.z += (v - .5) * width;
      positions.push(q.x, q.y, q.z - .07);
      uvs.push(u * 2.6, v * 2);
    }
  }
  for (let i = 0; i < uCount; i++) {
    for (let j = 0; j < vCount; j++) {
      const a = i * (vCount + 1) + j;
      const b = a + vCount + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addCylinderBetween(parent, a, b, radius, material, radialSegments) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments || 24, 1, false),
    material
  );
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeTextSprite(letter) {
  const el = document.createElement("canvas");
  el.width = 128;
  el.height = 128;
  const ctx = el.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(223,226,225,.86)";
  ctx.font = "600 61px -apple-system, BlinkMacSystemFont, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 64, 66);
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.18, .18), material);
  mesh.position.set(.25, .33, .26);
  return mesh;
}

function addPerforations(parent, material) {
  const geometry = new THREE.SphereGeometry(.019, 10, 8);
  const dots = [];
  for (let row = -4; row <= 4; row++) {
    for (let col = -3; col <= 3; col++) {
      const x = col * .071;
      const y = row * .073;
      const oval = (x * x) / (.235 * .235) + (y * y) / (.32 * .32);
      if (oval < .86) dots.push([x, y]);
    }
  }
  const instanced = new THREE.InstancedMesh(geometry, material, dots.length);
  const dummy = new THREE.Object3D();
  dots.forEach((p, i) => {
    dummy.position.set(p[0], p[1], .274);
    dummy.scale.set(1, .82, .6);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  });
  instanced.instanceMatrix.needsUpdate = true;
  instanced.castShadow = false;
  instanced.receiveShadow = true;
  parent.add(instanced);
  return instanced;
}

function buildCup(side, materialSet, shellMat, steelMat, darkMat, boardMat, copperMat) {
  const cup = new THREE.Group();
  cup.position.set(side * .83, .58, 0);
  cup.rotation.y = side < 0 ? .12 : -.11;
  cup.rotation.z = side < 0 ? .025 : -.025;
  cup.userData.side = side;

  const shell = new THREE.Mesh(roundedExtrudeGeometry(.98, 1.2, .42, .34, .065), shellMat);
  shell.position.z = -.16;
  shell.castShadow = true;
  shell.receiveShadow = true;
  cup.add(shell);

  const rim = new THREE.Mesh(roundedRingGeometry(.95, 1.16, .4, .91, 1.12, .37, .035, .012), steelMat);
  rim.position.z = .17;
  rim.castShadow = true;
  cup.add(rim);

  const driverLayer = new THREE.Group();
  driverLayer.position.z = .205;
  cup.add(driverLayer);
  const driverBack = new THREE.Mesh(new THREE.CircleGeometry(.29, 64), darkMat);
  driverBack.position.z = .004;
  driverLayer.add(driverBack);
  const diaphragm = new THREE.Mesh(
    new THREE.CircleGeometry(.235, 64),
    new THREE.MeshPhysicalMaterial({ color: "#23282c", roughness: .32, metalness: .32, clearcoat: .32, clearcoatRoughness: .2 })
  );
  diaphragm.position.z = .009;
  driverLayer.add(diaphragm);
  const magnetOuter = new THREE.Mesh(new THREE.TorusGeometry(.29, .025, 10, 72), copperMat);
  magnetOuter.position.z = .018;
  driverLayer.add(magnetOuter);
  const magnetInner = new THREE.Mesh(new THREE.TorusGeometry(.205, .018, 8, 64), steelMat);
  magnetInner.position.z = .02;
  driverLayer.add(magnetInner);
  const magnetRing = new THREE.Mesh(new THREE.TorusGeometry(.258, .009, 6, 72), steelMat);
  magnetRing.position.z = .023;
  driverLayer.add(magnetRing);

  const electronicsLayer = new THREE.Group();
  electronicsLayer.position.set(-.27, -.04, -.105);
  cup.add(electronicsLayer);
  const board = new THREE.Mesh(roundedExtrudeGeometry(.27, .42, .035, .026, .008), boardMat);
  board.position.z = -.01;
  electronicsLayer.add(board);
  const chipOne = new THREE.Mesh(roundedExtrudeGeometry(.15, .13, .02, .045, .01), darkMat);
  chipOne.position.set(-.005, .11, .035);
  electronicsLayer.add(chipOne);
  const chipTwo = new THREE.Mesh(roundedExtrudeGeometry(.13, .11, .02, .04, .008), darkMat);
  chipTwo.position.set(.025, -.11, .035);
  electronicsLayer.add(chipTwo);
  const traceMat = new THREE.MeshStandardMaterial({ color: "#b77852", metalness: .72, roughness: .27 });
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(.012, .23, .008), traceMat);
    line.position.set(-.087 + i * .05, 0, .02);
    electronicsLayer.add(line);
  }

  const baffleLayer = new THREE.Group();
  baffleLayer.position.z = .255;
  cup.add(baffleLayer);
  const baffle = new THREE.Mesh(roundedExtrudeGeometry(.75, .91, .3, .018, .01), darkMat);
  baffle.position.z = .004;
  baffleLayer.add(baffle);
  const innerMeshMat = new THREE.MeshStandardMaterial({
    map: weaveMap,
    color: "#252a30",
    roughness: .88,
    metalness: .02,
    bumpMap: weaveMap,
    bumpScale: .008
  });
  const innerMesh = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(.56, .69, .24, 12)), innerMeshMat);
  innerMesh.position.z = .023;
  baffleLayer.add(innerMesh);
  addPerforations(baffleLayer, new THREE.MeshBasicMaterial({ color: "#101518" }));
  baffleLayer.add(makeTextSprite(side < 0 ? "L" : "R"));
  const pinMat = new THREE.MeshStandardMaterial({ color: "#c3c7c8", metalness: .82, roughness: .24 });
  for (const pin of [[-.33, .37], [.32, .37], [-.33, -.37], [.32, -.37]]) {
    const pinMesh = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .03, 16), pinMat);
    pinMesh.rotation.x = Math.PI / 2;
    pinMesh.position.set(pin[0], pin[1], .032);
    baffleLayer.add(pinMesh);
  }

  const cushion = new THREE.Group();
  cushion.position.z = .36;
  cup.add(cushion);
  const cushionMat = new THREE.MeshPhysicalMaterial({
    map: weaveMap,
    color: "#e6e4df",
    roughness: .83,
    metalness: .015,
    bumpMap: weaveMap,
    bumpScale: .018,
    clearcoat: .04,
    clearcoatRoughness: .75
  });
  materialSet.cushions.push(cushionMat);
  const cushionMesh = new THREE.Mesh(roundedRingGeometry(1.07, 1.3, .48, .65, .86, .29, .2, .085), cushionMat);
  cushionMesh.castShadow = true;
  cushionMesh.receiveShadow = true;
  cushion.add(cushionMesh);
  const piping = new THREE.Mesh(
    roundedRingGeometry(.69, .9, .31, .65, .86, .29, .03, .012),
    new THREE.MeshStandardMaterial({ color: "#a8aaab", roughness: .74, metalness: .08, map: weaveMap, bumpMap: weaveMap, bumpScale: .01 })
  );
  piping.position.z = .135;
  cushion.add(piping);

  const vents = new THREE.Group();
  const ventMat = new THREE.MeshStandardMaterial({ color: "#22272a", roughness: .65, metalness: .1 });
  for (let i = 0; i < 5; i++) {
    const vent = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .064, 3, 8), ventMat);
    vent.rotation.z = Math.PI / 2;
    vent.position.set(-.19 + i * .095, -.52, .185);
    vent.scale.set(1, .7, .55);
    vents.add(vent);
  }
  for (const x of [-.35, .35]) {
    for (const y of [-.37, -.22, .43]) {
      const mic = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), ventMat);
      mic.position.set(x, y, .174);
      vents.add(mic);
    }
  }
  cup.add(vents);

  const crownGroup = new THREE.Group();
  crownGroup.position.set(.21, .66, .04);
  cup.add(crownGroup);
  const crownBase = new THREE.Mesh(
    new THREE.CylinderGeometry(.155, .155, .11, 48, 1, false),
    new THREE.MeshStandardMaterial({ color: "#8e9497", metalness: .94, roughness: .19, envMapIntensity: 1.3 })
  );
  crownBase.castShadow = true;
  crownBase.receiveShadow = true;
  crownGroup.add(crownBase);
  const crownFace = new THREE.Mesh(
    new THREE.CylinderGeometry(.14, .14, .014, 48, 1, false),
    new THREE.MeshPhysicalMaterial({ color: "#d6d9d9", metalness: .92, roughness: .22, clearcoat: .42, clearcoatRoughness: .16 })
  );
  crownFace.position.y = .061;
  crownGroup.add(crownFace);
  const toothGeo = new THREE.BoxGeometry(.014, .092, .028);
  const toothMat = new THREE.MeshStandardMaterial({ color: "#c4c8c9", metalness: .98, roughness: .15 });
  const teeth = new THREE.InstancedMesh(toothGeo, toothMat, 40);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    const angle = i / 40 * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * .154, 0, Math.sin(angle) * .154);
    dummy.rotation.set(0, -angle, 0);
    dummy.updateMatrix();
    teeth.setMatrixAt(i, dummy.matrix);
  }
  crownGroup.add(teeth);

  const modeButton = new THREE.Group();
  modeButton.position.set(-.18, .66, .035);
  cup.add(modeButton);
  const button = new THREE.Mesh(
    new THREE.CapsuleGeometry(.058, .095, 5, 12),
    new THREE.MeshStandardMaterial({ color: "#b9bec0", metalness: .84, roughness: .23 })
  );
  button.rotation.z = Math.PI / 2;
  button.castShadow = true;
  modeButton.add(button);

  return { group: cup, shell, rim, driverLayer, electronicsLayer, baffleLayer, cushion, crownGroup, modeButton, side };
}

function buildCase(parent, caseMaterial) {
  const group = new THREE.Group();
  group.position.set(0, -1.53, -.12);
  group.visible = false;
  parent.add(group);

  const shape = new THREE.Shape();
  shape.moveTo(-1.26, .55);
  shape.bezierCurveTo(-1.44, .48, -1.48, .25, -1.39, .06);
  shape.lineTo(-1.05, -.54);
  shape.bezierCurveTo(-.93, -.76, -.70, -.84, -.47, -.77);
  shape.bezierCurveTo(-.20, -.69, -.12, -.62, 0, -.62);
  shape.bezierCurveTo(.12, -.62, .20, -.69, .47, -.77);
  shape.bezierCurveTo(.70, -.84, .93, -.76, 1.05, -.54);
  shape.lineTo(1.39, .06);
  shape.bezierCurveTo(1.48, .25, 1.44, .48, 1.26, .55);
  shape.lineTo(.72, .79);
  shape.bezierCurveTo(.59, .85, .43, .83, .31, .78);
  shape.bezierCurveTo(.13, .71, -.13, .71, -.31, .78);
  shape.bezierCurveTo(-.43, .83, -.59, .85, -.72, .79);
  shape.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: .2,
    bevelEnabled: true,
    bevelSegments: 8,
    bevelSize: .075,
    bevelThickness: .075,
    curveSegments: 24,
    steps: 1
  });
  const body = new THREE.Mesh(bodyGeo, caseMaterial);
  body.position.z = -.08;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const seam = new THREE.Mesh(
    roundedRingGeometry(2.58, 1.39, .34, 2.49, 1.30, .29, .026, .01),
    new THREE.MeshStandardMaterial({ color: "#d8d8d3", map: weaveMap, roughness: .92, bumpMap: weaveMap, bumpScale: .008 })
  );
  seam.position.z = .15;
  group.add(seam);

  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, .67, .235);
  group.add(flapPivot);
  const flap = new THREE.Mesh(roundedExtrudeGeometry(1.38, .82, .2, .07, .04), caseMaterial);
  flap.position.set(0, -.35, 0);
  flap.castShadow = true;
  flap.receiveShadow = true;
  flapPivot.add(flap);
  const flapEdgeMat = new THREE.MeshStandardMaterial({ color: "#293f4f", roughness: .75 });
  const flapEdge = new THREE.Mesh(new THREE.BoxGeometry(1.25, .012, .012), flapEdgeMat);
  flapEdge.position.set(0, -.73, .09);
  flapPivot.add(flapEdge);
  const clasp = new THREE.Mesh(
    new THREE.SphereGeometry(.035, 16, 12),
    new THREE.MeshStandardMaterial({ color: "#4d6576", metalness: .25, roughness: .48 })
  );
  clasp.position.set(0, -.72, .11);
  flapPivot.add(clasp);
  return { group, body, flapPivot, seam };
}

function buildScene() {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.8));
  renderer.setSize(panel.clientWidth, panel.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = makeStudioEnvironment();
  scene.environmentIntensity = .92;

  const camera = new THREE.PerspectiveCamera(34, panel.clientWidth / panel.clientHeight, .1, 80);
  camera.position.set(3.2, 2.25, 6.2);
  camera.lookAt(0, 1.2, 0);

  const hemi = new THREE.HemisphereLight("#ffffff", "#a9afb1", 1.45);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fffaf2", 3.3);
  key.position.set(-3.7, 6.3, 5.2);
  key.castShadow = true;
  key.shadow.mapSize.set(window.innerWidth < 760 ? 1024 : 2048, window.innerWidth < 760 ? 1024 : 2048);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -.0003;
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#e4edf4", 1.75);
  fill.position.set(5, 3.4, 3.5);
  scene.add(fill);
  const rimLight = new THREE.DirectionalLight("#ffffff", 2.2);
  rimLight.position.set(2.8, 4.5, -4.3);
  scene.add(rimLight);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ color: "#edecea", roughness: .84, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.18;
  floor.receiveShadow = true;
  scene.add(floor);

  const micrograin = new THREE.MeshStandardMaterial({ color: "#c8cbcc", roughness: .25, metalness: .94, bumpMap: grainMap, bumpScale: .009, envMapIntensity: 1.1 });
  const steel = new THREE.MeshStandardMaterial({ color: "#d4d8d9", roughness: .11, metalness: .99, envMapIntensity: 1.6 });
  const dark = new THREE.MeshStandardMaterial({ color: "#22272c", roughness: .82, metalness: .14 });
  const boardMat = new THREE.MeshStandardMaterial({ color: "#262b2e", roughness: .61, metalness: .34 });
  const copper = new THREE.MeshStandardMaterial({ color: "#a86c4d", roughness: .25, metalness: .84 });
  const canopyMaterial = new THREE.MeshStandardMaterial({
    map: canopyMap,
    color: palette[0].canopy,
    alphaTest: .16,
    side: THREE.DoubleSide,
    roughness: .86,
    metalness: .01,
    bumpMap: canopyMap,
    bumpScale: .012,
    transparent: true,
    depthWrite: true
  });
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: palette[0].shell,
    roughness: .245,
    metalness: .92,
    bumpMap: grainMap,
    bumpScale: .008,
    clearcoat: .32,
    clearcoatRoughness: .2,
    envMapIntensity: 1.18
  });
  const caseMat = new THREE.MeshPhysicalMaterial({
    map: weaveMap,
    color: palette[0].case,
    roughness: .9,
    metalness: 0,
    bumpMap: weaveMap,
    bumpScale: .018,
    clearcoat: .035,
    clearcoatRoughness: .82,
    transparent: true,
    opacity: 1
  });

  const product = new THREE.Group();
  scene.add(product);
  const parts = { shells: [shellMat], textiles: [canopyMaterial], cushions: [], cases: [caseMat] };
  const archPoints = [
    new THREE.Vector3(-1.12, 1.55, 0),
    new THREE.Vector3(-1.14, 1.98, 0),
    new THREE.Vector3(-.88, 2.45, 0),
    new THREE.Vector3(-.42, 2.72, 0),
    new THREE.Vector3(0, 2.79, 0),
    new THREE.Vector3(.42, 2.72, 0),
    new THREE.Vector3(.88, 2.45, 0),
    new THREE.Vector3(1.14, 1.98, 0),
    new THREE.Vector3(1.12, 1.55, 0)
  ];
  const archCurve = new THREE.CatmullRomCurve3(archPoints, false, "centripetal", .42);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 120, .105, 20, false), steel);
  arch.castShadow = true;
  arch.receiveShadow = true;
  product.add(arch);
  const canopy = new THREE.Mesh(makeRibbon(archCurve, .47), canopyMaterial);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  product.add(canopy);

  const sleeveMat = new THREE.MeshStandardMaterial({
    color: palette[0].canopy,
    roughness: .74,
    metalness: .035,
    map: weaveMap,
    bumpMap: weaveMap,
    bumpScale: .012
  });
  parts.textiles.push(sleeveMat);
  for (const side of [-1, 1]) {
    const start = new THREE.Vector3(side * 1.1, 1.68, 0);
    const end = new THREE.Vector3(side * .83, 1.16, 0);
    addCylinderBetween(product, start, end, .065, steel, 24);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.083, .083, .24, 32, 1, false), sleeveMat);
    sleeve.position.set(side * 1.05, 1.77, 0);
    sleeve.rotation.z = side * -.16;
    sleeve.castShadow = true;
    product.add(sleeve);
  }

  const cupLeft = buildCup(-1, parts, shellMat, steel, dark, boardMat, copper);
  const cupRight = buildCup(1, parts, shellMat, steel, dark, boardMat, copper);
  product.add(cupLeft.group, cupRight.group);

  const caseObj = buildCase(product, caseMat);

  const anchorObjects = {
    crown: cupRight.crownGroup,
    mode: cupRight.modeButton,
    chip: cupRight.electronicsLayer,
    driver: cupRight.driverLayer,
    cushion: cupRight.cushion
  };
  const colorNow = {
    shell: new THREE.Color(),
    canopy: new THREE.Color(),
    cushion: new THREE.Color(),
    case: new THREE.Color()
  };
  let pinnedColor = null;

  function setColorLabel(index) {
    swatchLabel.textContent = palette[index].name;
    swatches.forEach((button, i) => button.setAttribute("aria-pressed", i === index ? "true" : "false"));
  }
  swatches.forEach((button) => {
    button.addEventListener("click", () => {
      pinnedColor = Number(button.getAttribute("data-color"));
      setColorLabel(pinnedColor);
    });
  });

  function updateColors(p) {
    let idx = 0;
    let t = 0;
    if (p >= .12 && p <= .26) {
      const local = clamp((p - .12) / .14, 0, 1) * 4;
      idx = Math.min(3, Math.floor(local));
      t = local - idx;
    } else {
      idx = p > .26 ? 4 : 0;
      t = 0;
    }
    let current;
    let next;
    if (pinnedColor !== null) {
      current = palette[pinnedColor];
      next = current;
      t = 0;
      idx = pinnedColor;
    } else {
      current = palette[idx];
      next = palette[Math.min(4, idx + 1)];
    }
    colorNow.shell.set(current.shell).lerp(new THREE.Color(next.shell), t);
    colorNow.canopy.set(current.canopy).lerp(new THREE.Color(next.canopy), t);
    colorNow.cushion.set(current.cushion).lerp(new THREE.Color(next.cushion), t);
    colorNow.case.set(current.case).lerp(new THREE.Color(next.case), t);
    parts.shells.forEach((m) => m.color.copy(colorNow.shell));
    parts.textiles.forEach((m) => m.color.copy(colorNow.canopy));
    parts.cushions.forEach((m) => m.color.copy(colorNow.cushion));
    parts.cases.forEach((m) => {
      m.color.copy(colorNow.case);
      m.opacity = smooth(.86, .9, p);
    });
    if (pinnedColor === null && p >= .12 && p <= .26) {
      const selected = Math.min(4, Math.round(clamp((p - .12) / .14, 0, 1) * 4));
      setColorLabel(selected);
    }
  }

  const cameraTarget = new THREE.Vector3();
  const cameraDesired = new THREE.Vector3();
  const targetLocal = new THREE.Vector3();
  const offsetLocal = new THREE.Vector3();
  const tempQuaternion = new THREE.Quaternion();
  const poseFrames = [
    { yaw: .34, tilt: -.015, y: 0, scale: 1, target: [0, 1.34, 0], offset: [3.05, 1.85, 6.2] },
    { yaw: .08, tilt: 0, y: 0, scale: 1, target: [0, 1.35, 0], offset: [.4, 1.95, 6.6] },
    { yaw: .34, tilt: 0, y: 0, scale: 1, target: [.84, 1.23, .1], offset: [1.1, .72, 2.38] },
    { yaw: .16, tilt: .05, y: 0, scale: 1.02, target: [0, 2.08, 0], offset: [.1, .34, 2.52] },
    { yaw: .4, tilt: .015, y: 0, scale: 1.02, target: [.83, .72, .15], offset: [1.35, .84, 3.14] },
    { yaw: .98, tilt: .025, y: 0, scale: 1, target: [.78, 1.03, 0], offset: [1.72, 1.25, 5.7] },
    { yaw: .15, tilt: 0, y: -.65, scale: .91, target: [0, .68, 0], offset: [.4, 2.5, 8.05] },
    { yaw: .15, tilt: 0, y: -.82, scale: .91, target: [0, .68, 0], offset: [.4, 2.5, 8.05] }
  ];

  function frameAt(p) {
    let i = 0;
    while (i < stops.length - 2 && p > stops[i + 1]) i++;
    const local = smooth(stops[i], stops[i + 1], p);
    const a = poseFrames[i];
    const b = poseFrames[i + 1];
    return {
      yaw: mix(a.yaw, b.yaw, local),
      tilt: mix(a.tilt, b.tilt, local),
      y: mix(a.y, b.y, local),
      scale: mix(a.scale, b.scale, local),
      target: [mix(a.target[0], b.target[0], local), mix(a.target[1], b.target[1], local), mix(a.target[2], b.target[2], local)],
      offset: [mix(a.offset[0], b.offset[0], local), mix(a.offset[1], b.offset[1], local), mix(a.offset[2], b.offset[2], local)]
    };
  }

  function updateAnchors(p) {
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    leaderSvg.setAttribute("viewBox", "0 0 " + rect.width + " " + rect.height);
    leaderSvg.setAttribute("width", rect.width);
    leaderSvg.setAttribute("height", rect.height);
    const visibleNames = p >= .26 && p < .44 ? ["crown", "mode"] : (p >= .72 && p < .88 ? ["chip", "driver", "cushion"] : []);
    document.querySelectorAll(".callout").forEach((card) => {
      const key = card.getAttribute("data-callout");
      card.classList.toggle("is-visible", visibleNames.indexOf(key) !== -1);
    });
    const segments = [];
    for (const name of visibleNames) {
      const card = document.querySelector('[data-callout="' + name + '"]');
      const object = anchorObjects[name];
      if (!card || !object) continue;
      const world = object.getWorldPosition(new THREE.Vector3());
      const projected = world.project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const x = (projected.x * .5 + .5) * rect.width;
      const y = (-projected.y * .5 + .5) * rect.height;
      const box = card.getBoundingClientRect();
      const left = box.left - rect.left;
      const right = box.right - rect.left;
      const top = box.top - rect.top;
      const bottom = box.bottom - rect.top;
      const midX = (left + right) * .5;
      const edgeX = x < midX ? left : right;
      const edgeY = clamp(y, top + 8, bottom - 8);
      const elbowX = mix(x, edgeX, .55);
      segments.push('<path d="M ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' L ' + elbowX.toFixed(1) + ' ' + edgeY.toFixed(1) + ' L ' + edgeX.toFixed(1) + ' ' + edgeY.toFixed(1) + '"></path>');
      segments.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.2"></circle>');
    }
    leaderSvg.innerHTML = segments.join("");
  }

  function updateModel(p, delta) {
    const f = frameAt(p);
    const reveal = smooth(.86, .91, p);
    const openClose = smooth(.925, .99, p);
    product.position.y = f.y;
    product.rotation.set(f.tilt + pointer.y * (reducedMotion ? 0 : .012), f.yaw + pointer.x * (reducedMotion ? 0 : .026), pointer.x * (reducedMotion ? 0 : .008));
    product.scale.setScalar(f.scale);
    product.updateMatrixWorld(true);

    const detachProgress = clamp((p - .58) / .14, 0, 1);
    const detach = Math.sin(Math.PI * detachProgress);
    const explodeProgress = clamp((p - .72) / .16, 0, 1);
    const explode = Math.sin(Math.PI * explodeProgress);
    [cupLeft, cupRight].forEach((cup) => {
      const side = cup.side;
      const isRight = side > 0;
      cup.cushion.position.x = side * .43 * detach + (isRight ? 1.08 * explode : 0);
      cup.cushion.position.z = .36 + .58 * detach + (isRight ? 1.02 * explode : 0);
      cup.cushion.rotation.z = side * .08 * detach;
      cup.driverLayer.position.x = isRight ? .45 * explode : 0;
      cup.driverLayer.position.z = .205 + (isRight ? .23 * explode : 0);
      cup.baffleLayer.position.x = isRight ? .92 * explode : 0;
      cup.baffleLayer.position.z = .255 + (isRight ? .58 * explode : 0);
      cup.electronicsLayer.position.x = -.27 + (isRight ? -.48 * explode : 0);
      cup.electronicsLayer.position.z = -.105 - (isRight ? .09 * explode : 0);
    });

    const crownTurn = smooth(.265, .435, p);
    cupRight.crownGroup.rotation.y = crownTurn * Math.PI * 5.6;
    cupRight.group.rotation.y = -.11 + smooth(.88, .96, p) * .58;
    cupLeft.group.rotation.y = .12 - smooth(.88, .96, p) * .58;
    product.position.y += -smooth(.88, .99, p) * .17;

    caseObj.group.visible = reveal > .005;
    caseObj.group.scale.setScalar(.9 + reveal * .1);
    caseObj.group.position.y = -1.53 + .15 * smooth(.88, .94, p);
    caseObj.flapPivot.rotation.x = -1.04 * (1 - openClose);

    const pose = f;
    product.updateMatrixWorld(true);
    targetLocal.set(pose.target[0], pose.target[1], pose.target[2]);
    targetLocal.applyMatrix4(product.matrixWorld);
    tempQuaternion.copy(product.quaternion);
    offsetLocal.set(pose.offset[0], pose.offset[1], pose.offset[2]).applyQuaternion(tempQuaternion).multiplyScalar(pose.scale);
    cameraDesired.copy(targetLocal).add(offsetLocal);
    camera.position.lerp(cameraDesired, 1 - Math.exp(-delta * 6.4));
    cameraTarget.lerp(targetLocal, 1 - Math.exp(-delta * 7.2));
    camera.lookAt(cameraTarget);

    const lightTravel = p * Math.PI * 2;
    key.position.set(-3.7 + Math.cos(lightTravel) * 1.25, 6.3, 5.2 + Math.sin(lightTravel) * 1.35);
    rimLight.position.set(2.8 + Math.sin(lightTravel * .68) * 1.5, 4.5, -4.3 + Math.cos(lightTravel) * 1.2);
    key.intensity = 3.15 + Math.sin(lightTravel) * .22;
    updateColors(p);
    updateAnchors(p);
  }

  function resize() {
    const w = Math.max(1, panel.clientWidth);
    const h = Math.max(1, panel.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.8));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function readScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetProgress = clamp(window.scrollY / max, 0, 1);
    progressFill.style.width = (targetProgress * 100).toFixed(2) + "%";
    const center = window.scrollY + window.innerHeight * .48;
    let found = 0;
    chapters.forEach((section, i) => {
      if (center >= section.offsetTop) found = i;
    });
    if (found !== activeChapter) {
      activeChapter = found;
      chapters.forEach((section, i) => section.classList.toggle("is-active", i === found));
    }
  }

  function animate(now) {
    const delta = clamp((now - lastFrame) / 1000, .001, .05);
    lastFrame = now;
    if (reducedMotion) currentProgress = targetProgress;
    else currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-delta * 7.8));
    updateModel(currentProgress, delta);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("pointermove", (event) => {
    pointer.x = clamp((event.clientX / window.innerWidth - .5) * 2, -1, 1);
    pointer.y = clamp((event.clientY / window.innerHeight - .5) * 2, -1, 1);
  }, { passive: true });
  readScroll();
  setColorLabel(0);
  requestAnimationFrame(animate);
}

function setupFallbackTimeline() {
  const update = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = clamp(window.scrollY / max, 0, 1);
    progressFill.style.width = (progress * 100).toFixed(2) + "%";
    const center = window.scrollY + window.innerHeight * .48;
    let found = 0;
    chapters.forEach((section, i) => {
      if (center >= section.offsetTop) found = i;
    });
    chapters.forEach((section, i) => section.classList.toggle("is-active", i === found));
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}

try {
  buildScene();
} catch (error) {
  console.error("3D renderer could not start", error);
  fallback.style.display = "block";
  setupFallbackTimeline();
}
