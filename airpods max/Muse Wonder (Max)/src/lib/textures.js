import * as THREE from 'three'

// ── Procedural textures (generated once, cached) ─────────────────────────
// All fabric textures are near-white so material.color can tint them for
// the 5 colourways — colour morphing then stays perfectly in sync.

const cache = {}
function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return [c, c.getContext('2d')]
}
function toTex(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Diamond knit weave for ear cushions — albedo + bump share the drawing. */
export function knitTextures() {
  if (cache.knit) return cache.knit
  const S = 512
  const [c, g] = canvas(S, S)
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, S, S)
  const cell = 16
  for (let y = 0; y < S / cell; y++) {
    for (let x = 0; x < S / cell; x++) {
      const px = x * cell, py = y * cell
      const odd = (x + y) % 2 === 0
      // interlaced yarn strands — two diagonal strokes per cell
      g.strokeStyle = odd ? '#f7f7f7' : '#cfcfcf'
      g.lineWidth = 5; g.lineCap = 'round'
      g.beginPath(); g.moveTo(px + 2, py + cell - 2); g.lineTo(px + cell - 2, py + 2); g.stroke()
      g.strokeStyle = odd ? '#c4c4c4' : '#f2f2f2'
      g.beginPath(); g.moveTo(px + 2, py + 2); g.lineTo(px + cell - 2, py + cell - 2); g.stroke()
      g.fillStyle = 'rgba(70,70,70,.35)'
      g.beginPath(); g.arc(px + cell / 2, py + cell / 2, 1.4, 0, 7); g.fill()
    }
  }
  // fine fibre noise
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '90,90,90'},${Math.random() * .12})`
    g.fillRect(Math.random() * S, Math.random() * S, 1.6, 1.6)
  }
  const map = toTex(c, 6, 6)
  const bump = toTex(c, 6, 6, false)
  cache.knit = { map, bump }
  return cache.knit
}

/** Breathable canopy — open perforated knit (lighter, airier than cushion). */
export function canopyTextures() {
  if (cache.canopy) return cache.canopy
  const S = 512
  const [c, g] = canvas(S, S)
  g.fillStyle = '#dedede'; g.fillRect(0, 0, S, S)
  const cell = 14
  for (let y = 0; y < S / cell + 1; y++) {
    for (let x = 0; x < S / cell + 1; x++) {
      const px = x * cell + (y % 2 ? cell / 2 : 0), py = y * cell
      const grad = g.createRadialGradient(px, py, 0, px, py, 6)
      grad.addColorStop(0, 'rgba(40,40,40,.85)')
      grad.addColorStop(0.55, 'rgba(80,80,80,.35)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill()
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.4
      g.beginPath(); g.arc(px, py, 6.5, 0.3, 2.4); g.stroke()
    }
  }
  const map = toTex(c, 8, 3)
  const bump = toTex(c, 8, 3, false)
  cache.canopy = { map, bump }
  return cache.canopy
}

/** Micro bead-blasted grain for anodised aluminium (bump only, very subtle). */
export function grainTexture() {
  if (cache.grain) return cache.grain
  const S = 256
  const [c, g] = canvas(S, S)
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 26000; i++) {
    const v = 110 + Math.random() * 90 | 0
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(Math.random() * S, Math.random() * S, 1.3, 1.3)
  }
  cache.grain = toTex(c, 4, 4, false)
  return cache.grain
}

/** Inner acoustic mesh with woven L / R lettering. side: 'L' | 'R' */
export function innerMeshTexture(side) {
  const key = 'inner' + side
  if (cache[key]) return cache[key]
  const S = 256
  const [c, g] = canvas(S, S)
  g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, S, S)
  const cell = 8
  for (let y = 0; y < S / cell; y++) for (let x = 0; x < S / cell; x++) {
    g.fillStyle = (x + y) % 2 ? '#c4c4c4' : '#b4b4b4'
    g.fillRect(x * cell, y * cell, cell - 1, cell - 1)
  }
  // darker woven letter, slightly blurred like thread dye
  g.fillStyle = 'rgba(52,52,56,.88)'
  g.font = `700 ${S * 0.52}px Inter, Arial, sans-serif`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.shadowColor = 'rgba(52,52,56,.6)'; g.shadowBlur = 3
  g.fillText(side, S / 2, S / 2 + S * 0.02)
  const t = toTex(c, 1, 1)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  cache[key] = t
  return t
}

/** Perforated speaker baffle — regular grille hole array. */
export function baffleTexture() {
  if (cache.baffle) return cache.baffle
  const S = 512
  const [c, g] = canvas(S, S)
  g.fillStyle = '#3a3b3f'; g.fillRect(0, 0, S, S)
  const step = 30
  for (let y = 1; y < S / step; y++) for (let x = 1; x < S / step; x++) {
    const px = x * step + (y % 2 ? step / 2 : 0), py = y * step
    const r = 7.5
    const grad = g.createRadialGradient(px - 2, py - 2, 0, px, py, r)
    grad.addColorStop(0, '#55565c'); grad.addColorStop(0.6, '#17181a'); grad.addColorStop(1, '#060607')
    g.fillStyle = grad
    g.beginPath(); g.arc(px, py, r, 0, 7); g.fill()
  }
  const t = toTex(c, 1, 1)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  cache.baffle = t
  return t
}

/** Soft microfibre / leather grain for the Smart Case. */
export function caseTextures() {
  if (cache.caseT) return cache.caseT
  const S = 512
  const [c, g] = canvas(S, S)
  g.fillStyle = '#e2e2e2'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 20000; i++) {
    const v = 190 + Math.random() * 60 | 0
    g.fillStyle = `rgba(${v},${v},${v},.5)`
    g.fillRect(Math.random() * S, Math.random() * S, 2, 1)
  }
  for (let i = 0; i < 500; i++) { // faint pebbled cells
    g.strokeStyle = 'rgba(120,120,120,.10)'
    g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 4 + Math.random() * 9, 0, 7); g.stroke()
  }
  const map = toTex(c, 3, 3)
  const bump = toTex(c, 3, 3, false)
  cache.caseT = { map, bump }
  return cache.caseT
}

/** Radial brushed texture for the 40 mm driver cone surround. */
export function driverTexture() {
  if (cache.driver) return cache.driver
  const S = 256
  const [c, g] = canvas(S, S)
  g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, S, S)
  for (let r = 8; r < S / 2; r += 3) {
    g.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`
    g.beginPath(); g.arc(S / 2, S / 2, r, 0, 7); g.stroke()
  }
  const t = toTex(c, 1, 1)
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  cache.driver = t
  return t
}
