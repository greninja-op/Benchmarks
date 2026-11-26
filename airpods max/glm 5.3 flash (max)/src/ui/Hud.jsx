import { useEffect, useRef } from 'react'
import { APP, COLORWAYS } from '../store.js'

/* ------------------------------------------------------------------ */
/*  HUD — precision leader lines projected from 3D anchor sockets,     */
/*  floating colorway swatches, backdrop driver, progress readout.     */
/* ------------------------------------------------------------------ */

const LEADERS = [
  {
    anchor: 'crown', win: 'leaderCrown', dir: [-0.85, -0.85], dist: 150,
    title: 'Digital Crown',
    body: 'Rotate for precise volume. Press to play, pause, answer. Hold for Siri.',
  },
  {
    anchor: 'button', win: 'leaderButton', dir: [1.05, -0.55], dist: 130,
    title: 'Noise Control Button',
    body: 'Press to switch Active Noise Cancellation, Transparency mode, and Off.',
  },
  {
    anchor: 'shell', win: 'leaderExplode', dir: [-0.75, -0.9], dist: 125,
    title: 'Anodized aluminum',
    body: 'Precision-unibody ear cup with concealed acoustic vents.',
  },
  {
    anchor: 'chip', win: 'leaderExplode', dir: [0.2, -1], dist: 150,
    title: 'Apple H1 chip',
    body: 'One in every cup — 9 microphones, spatial audio, ultra-low latency.',
  },
  {
    anchor: 'driver', win: 'leaderExplode', dir: [0.95, 0.8], dist: 145,
    title: '40 mm dynamic driver',
    body: 'Dual ring neodymium magnets deliver deep, detailed sound.',
  },
]

const SWATCHES = [
  { alu: '#e7e9ec', textile: '#f3f3f5' },
  { alu: '#54565b', textile: '#45474c' },
  { alu: '#b6c6d2', textile: '#285074' },
  { alu: '#d6c3c1', textile: '#ead5d4' },
  { alu: '#bcc7b6', textile: '#dde4d7' },
]

export default function Hud() {
  const lineRefs = useRef([])
  const cardRefs = useRef([])
  const dotRefs = useRef([])
  const swatchBox = useRef(null)
  const swatchRefs = useRef([])
  const finishRef = useRef(null)
  const pctRef = useRef(null)
  const cueRef = useRef(null)
  const stageBg = useRef(-1)
  const lastFinish = useRef('')

  useEffect(() => {
    let raf
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

    const loop = () => {
      try {
        const c = APP.choreo
        const w = window.innerWidth, h = window.innerHeight

      /* leader lines + callout cards */
      if (c && APP.anchorXY.size) {
        for (let i = 0; i < LEADERS.length; i++) {
          const L = LEADERS[i]
          const line = lineRefs.current[i]
          const dot = dotRefs.current[i]
          const card = cardRefs.current[i]
          if (!line || !card) continue
          const pos = APP.anchorXY.get(L.anchor)
          let vis = (c[L.win] ?? 0)
          if (!pos || pos.behind) vis = 0
          const g = line.parentNode // <g>
          if (g && Math.abs((parseFloat(g.dataset.v || '0')) - vis) > 0.002) {
            g.dataset.v = vis
            g.style.opacity = vis.toFixed(3)
            g.style.pointerEvents = 'none'
          }
          if (g && vis > 0.001 && pos) {
            const mag = Math.hypot(L.dir[0], L.dir[1]) || 1
            const dxn = L.dir[0] / mag
            const dyn = L.dir[1] / mag
            const ex = pos.x + dxn * L.dist
            const ey = pos.y + dyn * L.dist
            line.setAttribute('x1', pos.x.toFixed(1))
            line.setAttribute('y1', pos.y.toFixed(1))
            line.setAttribute('x2', ex.toFixed(1))
            line.setAttribute('y2', ey.toFixed(1))
            if (dot) { dot.setAttribute('cx', pos.x.toFixed(1)); dot.setAttribute('cy', pos.y.toFixed(1)) }
            card.style.transform = `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) translate(-50%, -50%)`
          }
        }

        /* swatch rail */
        if (swatchBox.current) {
          const v = c.swatchVis
          swatchBox.current.style.opacity = v.toFixed(3)
          swatchBox.current.style.pointerEvents = v > 0.5 ? 'auto' : 'none'
          swatchBox.current.style.transform = `translateY(${(1 - v) * 18}px)`
          const active = APP.finishIdx
          swatchRefs.current.forEach((el, i) => {
            if (el) el.classList.toggle('active', i === active)
          })
          if (finishRef.current && APP.finishName !== lastFinish.current) {
            lastFinish.current = APP.finishName
            finishRef.current.textContent = APP.finishName
            const sec = document.querySelector('[data-finish]')
            if (sec) sec.textContent = APP.finishName
          }
        }
      }

      /* progress + cue */
      if (pctRef.current) pctRef.current.textContent = Math.round(APP.raw * 100).toString().padStart(2, '0') + '%'
      if (cueRef.current) cueRef.current.style.opacity = APP.raw > 0.02 ? 0 : 1
      } catch (err) {
        console.error('hud loop', err)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      {/* projected leader lines */}
      <svg className="leaders" width="100%" height="100%" aria-hidden="true">
        {LEADERS.map((L, i) => (
          <g key={L.anchor} className="leader" data-v="0" style={{ opacity: 0 }}>
            <line ref={(e) => (lineRefs.current[i] = e)} strokeWidth="1" className="leader-line" />
            <circle ref={(e) => (dotRefs.current[i] = e)} r="4.5" className="leader-dot" />
            <circle r="10" className="leader-halo" />
          </g>
        ))}
      </svg>
      {LEADERS.map((L, i) => (
        <div key={L.anchor} className="leader-card" ref={(e) => (cardRefs.current[i] = e)} style={{ opacity: 0 }}>
          <p className="lc-title">{L.title}</p>
          <p className="lc-body">{L.body}</p>
        </div>
      ))}

      {/* floating colorway swatches */}
      <div className="swatch-rail" ref={swatchBox} aria-label="Finishes">
        <p className="swatch-finish" ref={finishRef}>Silver</p>
        <div className="swatch-row">
          {SWATCHES.map((s, i) => (
            <button
              key={i}
              ref={(e) => (swatchRefs.current[i] = e)}
              className="swatch"
              style={{ '--alu': s.alu, '--tex': s.textile }}
              aria-label={COLORWAYS[i].name}
              onClick={() => { APP.colorOverride = i }}
            />
          ))}
        </div>
      </div>

      {/* fixed chrome */}
      <div className="hud-mark">AirPods Max <span>· Concept</span></div>
      <div className="hud-progress"><span ref={pctRef}>00%</span></div>
      <div className="scroll-cue" ref={cueRef}><span className="cue-dot" />Scroll to explore</div>
    </>
  )
}
