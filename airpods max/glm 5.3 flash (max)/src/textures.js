import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/*  Procedural canvas textures — cached module-level, built once.      */
/* ------------------------------------------------------------------ */

const cache = new Map()

function makeCanvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')]
}

function tex(canvas, { srgb = true, repeat = [1, 1], aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = aniso
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ---------------- knit weave (cushions / canopy base) -------------- */
// Diamond-interlock knit: pairs of opposing diagonal v-shaped ribs.
function knitCanvas({ size = 512, cell = 20, hi = '#fdfdfe', lo = '#cfd2d7', grooves = true } = {}) {
  const [c, ctx] = makeCanvas(size)
  ctx.fillStyle = lo
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  for (let y = -1; y < size / cell + 1; y++) {
    for (let x = -1; x < size / cell + 1; x++) {
      const px = x * cell, py = y * cell
      // two diamonds per cell -> knit V columns
      const drawDiamond = (cx, cy, r, sc) => {
        ctx.beginPath()
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx + r, cy)
        ctx.lineTo(cx, cy + r)
        ctx.lineTo(cx - r, cy)
        ctx.closePath()
        ctx.fillStyle = sc
        ctx.fill()
      }
      const g = ctx.createLinearGradient(px, py, px + cell, py + cell)
      g.addColorStop(0, hi)
      g.addColorStop(0.5, '#e8eaee')
      g.addColorStop(1, hi)
      drawDiamond(px + cell / 2, py + cell / 4, cell * 0.46, g)
      drawDiamond(px + cell / 2, py + (cell * 3) / 4, cell * 0.46, g)
      if (grooves) {
        ctx.strokeStyle = 'rgba(120,124,132,0.22)'
        ctx.lineWidth = Math.max(1, cell * 0.05)
        ctx.beginPath()
        ctx.moveTo(px, py + cell / 2)
        ctx.lineTo(px + cell / 2, py)
        ctx.lineTo(px + cell, py + cell / 2)
        ctx.moveTo(px, py + cell / 2)
        ctx.lineTo(px + cell / 2, py + cell)
        ctx.lineTo(px + cell, py + cell / 2)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
  return c
}

export function knit() {
  if (cache.has('knit')) return cache.get('knit')
  const c = knitCanvas({})
  const map = tex(c, { repeat: [6, 6] })
  // bump: same pattern, grayscale
  const [bc, bctx] = makeCanvas(512)
  bctx.drawImage(c, 0, 0)
  bctx.globalCompositeOperation = 'saturation'
  bctx.fillStyle = '#808080'
  bctx.fillRect(0, 0, 512, 512)
  bctx.globalCompositeOperation = 'source-over'
  const bump = tex(bc, { srgb: false, repeat: [6, 6] })
  const set = { map, bump }
  cache.set('knit', set)
  return set
}

/* ---------------- canopy: fine perforation dot weave --------------- */
export function canopy() {
  if (cache.has('canopy')) return cache.get('canopy')
  const size = 256, pitch = 10, r = 2.6
  const [c, ctx] = makeCanvas(size)
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#e9eaee')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  for (let y = 0; y < size; y += pitch) {
    const off = (y / pitch) % 2 ? pitch / 2 : 0
    for (let x = 0; x < size; x += pitch) {
      ctx.beginPath()
      ctx.arc(x + off + pitch / 2, y + pitch / 2, r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(48,52,58,0.55)'
      ctx.fill()
    }
  }
  const map = tex(c, { repeat: [14, 3] })
  const [bc, bctx] = makeCanvas(256)
  bctx.drawImage(c, 0, 0)
  bctx.globalCompositeOperation = 'saturation'
  bctx.fillStyle = '#808080'
  bctx.fillRect(0, 0, 256, 256)
  bctx.globalCompositeOperation = 'source-over'
  const bump = tex(bc, { srgb: false, repeat: [14, 3] })
  const set = { map, bump }
  cache.set('canopy', set)
  return set
}

/* -------------- inner cushion acoustic mesh with L / R ------------- */
export function meshPlate(letter = 'L') {
  const key = 'meshPlate' + letter
  if (cache.has(key)) return cache.get(key)
  const size = 512
  const [c, ctx] = makeCanvas(size)
  // knit base
  const base = knitCanvas({ size, cell: 26, hi: '#e9ebe4', lo: '#c9ccc6' })
  ctx.drawImage(base, 0, 0)
  // vignette shading toward edges
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.52)
  grd.addColorStop(0, 'rgba(0,0,0,0)')
  grd.addColorStop(1, 'rgba(32,34,38,0.55)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)
  // stitched letter
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.font = `700 ${size * 0.42}px Futura, 'Century Gothic', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // dashed stroke = stitch effect
  ctx.strokeStyle = 'rgba(64,68,76,0.9)'
  ctx.lineWidth = size * 0.012
  ctx.setLineDash([6, 5])
  ctx.strokeText(letter, 0, 0)
  ctx.fillStyle = 'rgba(74,78,86,0.55)'
  ctx.fillText(letter, 0, 0)
  ctx.restore()
  const map = tex(c, {})
  const set = { map }
  cache.set(key, set)
  return set
}

/* ---------------- perforated speaker baffle (cup side) ------------- */
export function baffleHoles() {
  if (cache.has('baffle')) return cache.get('baffle')
  const size = 512
  const [c, ctx] = makeCanvas(size)
  ctx.fillStyle = '#151619'
  ctx.fillRect(0, 0, size, size)
  // organic cluster of holes in the center (like the driver guard)
  const rnd = mulberry(7)
  const cx = size / 2, cy = size * 0.52
  for (let i = 0; i < 64; i++) {
    const a = rnd() * Math.PI * 2
    const rad = Math.pow(rnd(), 0.6) * size * 0.30
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad * 0.82
    const r = 4 + (1 - rad / (size * 0.34)) * 9 + rnd() * 3
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#040507'
    ctx.fill()
  }
  // screw wells
  ctx.fillStyle = '#26282d'
  for (const [sx, sy] of [[0.2, 0.14], [0.8, 0.14], [0.16, 0.86], [0.84, 0.86]]) {
    ctx.beginPath()
    ctx.arc(sx * size, sy * size, 11, 0, Math.PI * 2)
    ctx.fill()
  }
  const map = tex(c, {})
  const set = { map }
  cache.set('baffle', set)
  return set
}

/* ------------------------ aluminum micro grain --------------------- */
export function aluminum() {
  if (cache.has('alu')) return cache.get('alu')
  const size = 256
  const [c, ctx] = makeCanvas(size)
  const img = ctx.createImageData(size, size)
  const rnd = mulberry(3)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 46
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  // faint directional brushing
  ctx.globalAlpha = 0.16
  for (let y = 0; y < size; y += 2) {
    ctx.fillStyle = y % 4 ? '#ffffff' : '#000000'
    ctx.fillRect(0, y, size, 1)
  }
  ctx.globalAlpha = 1
  const map = tex(c, { srgb: false, repeat: [3, 3] })
  const set = { bump: map }
  cache.set('alu', set)
  return set
}

/* ------------------------ case fabric grain ------------------------ */
export function caseGrain() {
  if (cache.has('caseGrain')) return cache.get('caseGrain')
  const size = 256
  const [c, ctx] = makeCanvas(size)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  const rnd = mulberry(11)
  // micro-bump noise
  const img = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 30
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  // soft woven cross-hatch
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 2
  for (let i = -size; i < size * 2; i += 7) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke()
  }
  const map = tex(c, { srgb: false, repeat: [5, 5] })
  const set = { bump: map }
  cache.set('caseGrain', set)
  return set
}

/* ---------------------------- helpers ------------------------------ */
export function mulberry(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
