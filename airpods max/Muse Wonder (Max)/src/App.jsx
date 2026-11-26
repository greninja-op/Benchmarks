import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import Lenis from 'lenis'
import Scene from './three/Scene'
import { COLORWAYS, scrollState, anchors, fadeWindow, smooth } from './lib/shared'

const STAGES = [
  { n: '01', label: 'Design' },
  { n: '02', label: 'Finishes' },
  { n: '03', label: 'Controls' },
  { n: '04', label: 'Comfort' },
  { n: '05', label: 'Magnetic cushions' },
  { n: '06', label: 'Engineering' },
  { n: '07', label: 'Smart Case' },
]

// callout cards: window = [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]
const CALLOUTS = [
  { id: 'crown', anchor: 'crown', side: 'right', win: [0.275, 0.315, 0.405, 0.44], pos: { right: '4vw', top: '24%' },
    title: 'Digital Crown', body: 'Turn for precise volume. Press to play, skip tracks, answer calls — or summon Siri.' },
  { id: 'noise', anchor: 'noise', side: 'left', win: [0.285, 0.325, 0.405, 0.44], pos: { left: '4vw', top: '52%' },
    title: 'Noise Control button', body: 'One press moves between Active Noise Cancellation and Transparency mode.' },
  { id: 'canopy', anchor: 'canopy', side: 'left', win: [0.455, 0.49, 0.545, 0.575], pos: { left: '4vw', top: '26%' },
    title: 'Knit-mesh canopy', body: 'A breathable canopy spans the headband, distributing weight for a feather-light fit.' },
  { id: 'cushion', anchor: 'cushionR', side: 'right', win: [0.46, 0.495, 0.545, 0.575], pos: { right: '4vw', top: '54%' },
    title: 'Memory-foam cushions', body: 'Acoustically engineered foam in woven textile — with L / R woven into the mesh.' },
  { id: 'magnet', anchor: 'magnet', side: 'left', win: [0.60, 0.635, 0.685, 0.715], pos: { left: '4vw', top: '30%' },
    title: 'Magnetic attachment', body: 'Cushions unseat with a gentle pull — and snap back with a satisfying magnetic click.' },
  { id: 'baffle', anchor: 'baffle', side: 'right', win: [0.605, 0.64, 0.685, 0.715], pos: { right: '4vw', top: '56%' },
    title: 'Acoustic baffle', body: 'A perforated grille and optical sensor sit behind every cushion, sealed for immersion.' },
  { id: 'shell', anchor: 'shell', side: 'right', win: [0.75, 0.785, 0.845, 0.875], pos: { right: '4vw', top: '20%' },
    title: 'Anodised aluminium', body: 'Each cup is machined from a single billet, bead-blasted and anodised.' },
  { id: 'h1', anchor: 'h1', side: 'left', win: [0.755, 0.79, 0.845, 0.875], pos: { left: '4vw', top: '24%' },
    title: 'Apple H1 — in each cup', body: '10 audio cores run computational audio, adaptive EQ and spatial sound in real time.' },
  { id: 'driver', anchor: 'driver', side: 'left', win: [0.76, 0.795, 0.845, 0.875], pos: { left: '4vw', top: '58%' },
    title: '40 mm dynamic driver', body: 'A dual-neodymium ring magnet motor delivers Hi-Res detail with under 0.1% distortion.' },
  { id: 'case', anchor: 'caseFlap', side: 'right', win: [0.905, 0.935, 1.01, 1.02], pos: { right: '4vw', top: '26%' },
    title: 'Smart Case', body: 'Slip them in and AirPods Max enter an ultralow-power state. The flap folds shut — magnetically.' },
]

class GLBoundary extends React.Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (this.state.err) return <div className="gl-fallback">WebGL is unavailable in this browser — the AirPods Max showcase needs GPU rendering.</div>
    return this.props.children
  }
}

export default function App() {
  const [colorIdx, setColorIdx] = useState(2)
  const [ready, setReady] = useState(false)
  const stageRefs = useRef([])
  const calloutRefs = useRef({})
  const lineRefs = useRef({})
  const dotRefs = useRef({})
  const progressRef = useRef()
  const colorNameRef = useRef()
  const stageLabelRef = useRef()
  const scrollHintRef = useRef()
  const swatchWrapRef = useRef()

  // Lenis smooth scroll + raw progress + mouse parallax
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.4 })
    let raf
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      scrollState.rawProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    lenis.on('scroll', onScroll); onScroll()
    // deep-link a stage for review: /?p=0.8
    const q = parseFloat(new URLSearchParams(location.search).get('p'))
    if (q > 0 && q <= 1) setTimeout(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * q), 120)
    const onMouse = (e) => {
      scrollState.mouseX = (e.clientX / innerWidth) * 2 - 1
      scrollState.mouseY = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener('pointermove', onMouse, { passive: true })
    return () => { cancelAnimationFrame(raf); lenis.destroy(); removeEventListener('pointermove', onMouse) }
  }, [])

  // Hero entrance
  useEffect(() => {
    gsap.fromTo('.hero-el', { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 1.25, stagger: 0.12, ease: 'power3.out', delay: 0.25 })
  }, [])

  // keep swatch highlight in sync with scroll-driven auto colour
  useEffect(() => {
    const id = setInterval(() => {
      const i = COLORWAYS.findIndex((c) => c.name === scrollState.activeColorName)
      if (i >= 0) setColorIdx((prev) => (prev === i ? prev : i))
    }, 350)
    return () => clearInterval(id)
  }, [])

  // DOM overlay driver — opacity / lines straight from scroll + projected anchors
  useEffect(() => {
    let raf
    const windows = [
      [-0.05, -0.01, 0.085, 0.125], [0.125, 0.155, 0.225, 0.26], [0.265, 0.295, 0.405, 0.44],
      [0.445, 0.475, 0.545, 0.58], [0.585, 0.615, 0.685, 0.72], [0.725, 0.755, 0.845, 0.88],
      [0.885, 0.915, 1.01, 1.02],
    ]
    const tick = () => {
      const p = scrollState.rawProgress
      stageRefs.current.forEach((el, i) => {
        if (!el) return
        const w = windows[i], o = fadeWindow(p, ...w)
        el.style.opacity = o
        el.style.transform = `translateY(${(1 - o) * 26}px)`
        el.style.pointerEvents = i === 6 && p > 0.93 ? 'auto' : 'none'
        el.style.visibility = o <= 0.001 ? 'hidden' : 'visible'
      })
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
      if (scrollHintRef.current) scrollHintRef.current.style.opacity = 1 - smooth(0, 0.05, p)
      if (swatchWrapRef.current) {
        const s = 0.72 + fadeWindow(p, 0.12, 0.16, 0.23, 0.27) * 0.28
        swatchWrapRef.current.style.transform = `translateX(-50%) scale(${s})`
      }
      const stageIdx = Math.min(6, Math.floor(p * 7.4))
      if (stageLabelRef.current) stageLabelRef.current.textContent = `${STAGES[stageIdx].n} — ${STAGES[stageIdx].label}`
      if (colorNameRef.current) colorNameRef.current.textContent = scrollState.activeColorName

      for (const c of CALLOUTS) {
        const card = calloutRefs.current[c.id]
        const line = lineRefs.current[c.id]
        const dot = dotRefs.current[c.id]
        const a = anchors[c.anchor]
        const o = (!a.behind) ? fadeWindow(p, ...c.win) : 0
        if (card) {
          card.style.opacity = o
          card.style.transform = `translateY(${(1 - o) * 14}px)`
          card.style.visibility = o <= 0.001 ? 'hidden' : 'visible'
        }
        if (line && card) {
          const r = card.getBoundingClientRect()
          const x2 = c.side === 'right' ? r.left + 6 : r.right - 6
          const y2 = r.top + r.height / 2
          line.setAttribute('x1', a.sx); line.setAttribute('y1', a.sy)
          line.setAttribute('x2', x2); line.setAttribute('y2', y2)
          line.style.opacity = o * 0.85
        }
        if (dot) {
          dot.setAttribute('cx', a.sx); dot.setAttribute('cy', a.sy)
          dot.style.opacity = o
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const pickColor = (i) => {
    setColorIdx(i)
    scrollState.manualColor = i
    scrollState.manualStamp = performance.now()
    scrollState.activeColorName = COLORWAYS[i].name
    if (scrollState.rawProgress < 0.10 || scrollState.rawProgress > 0.30) {
      window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * 0.19, behavior: 'smooth' })
    }
  }

  return (
    <>
      <div className="canvas-wrap" style={{ opacity: ready ? 1 : 0 }}>
        <GLBoundary>
          <Canvas
            dpr={[1, 2]} shadows
            camera={{ position: [0, 0.25, 5.5], fov: 38, near: 0.1, far: 60 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = 4 /* ACESFilmicToneMapping */; gl.toneMappingExposure = 1.02
              setReady(true)
            }}
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </GLBoundary>
      </div>

      {/* leader lines */}
      <svg className="leader-svg" aria-hidden="true">
        {CALLOUTS.map((c) => (
          <React.Fragment key={c.id}>
            <line ref={(el) => { lineRefs.current[c.id] = el }} className="leader-line" />
            <circle ref={(el) => { dotRefs.current[c.id] = el }} r="4" className="leader-dot" />
          </React.Fragment>
        ))}
      </svg>

      {/* callout cards */}
      {CALLOUTS.map((c) => (
        <aside key={c.id} ref={(el) => { calloutRefs.current[c.id] = el }} className="callout" style={c.pos}>
          <h3>{c.title}</h3><p>{c.body}</p>
        </aside>
      ))}

      {/* ── fixed UI chrome ── */}
      <header className="nav">
        <span className="nav-brand">AirPods Max</span>
        <span className="nav-stage" ref={stageLabelRef}>01 — Design</span>
        <a className="nav-buy" href="#buy" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }) }}>Buy</a>
      </header>
      <div className="progress"><div ref={progressRef} className="progress-fill" /></div>

      {/* ── stage copy ── */}
      <main className="stages">
        <section ref={(el) => { stageRefs.current[0] = el }} className="stage stage-hero">
          <p className="eyebrow hero-el">AirPods Max</p>
          <h1 className="hero-el">Symphonic.<br />Spatial. Max.</h1>
          <p className="lede hero-el">High-fidelity audio, Adaptive EQ and Active Noise Cancellation —<br />in an over-ear design machined to disappear.</p>
          <div className="scroll-hint hero-el" ref={scrollHintRef}><span>Scroll to explore</span><i /></div>
        </section>

        <section ref={(el) => { stageRefs.current[1] = el }} className="stage stage-top">
          <p className="eyebrow">Finishes</p>
          <h2>Five finishes.<br />One icon.</h2>
          <p className="lede">Anodised aluminium, knit-mesh canopy and cushions —<br />colour-matched in <strong ref={colorNameRef}>Sky Blue</strong>.</p>
        </section>

        <section ref={(el) => { stageRefs.current[2] = el }} className="stage stage-top">
          <p className="eyebrow">Controls</p>
          <h2>Precision,<br />at your fingertips.</h2>
          <p className="lede">The Digital Crown, borrowed from Apple Watch —<br />watch it turn as you zoom in.</p>
        </section>

        <section ref={(el) => { stageRefs.current[3] = el }} className="stage stage-top">
          <p className="eyebrow">Comfort</p>
          <h2>A canopy<br />of calm.</h2>
          <p className="lede">Breathable knit mesh and memory foam,<br />balanced so the weight simply vanishes.</p>
        </section>

        <section ref={(el) => { stageRefs.current[4] = el }} className="stage stage-top">
          <p className="eyebrow">Ear cushions</p>
          <h2>Snap. Seal. Sound.</h2>
          <p className="lede">Magnetically attached cushions lift away —<br />then glide back and click into place.</p>
        </section>

        <section ref={(el) => { stageRefs.current[5] = el }} className="stage stage-top">
          <p className="eyebrow">Engineering</p>
          <h2>Inside out.</h2>
          <p className="lede">Shell, H1 silicon, a 40&nbsp;mm ring-magnet driver,<br />acoustic baffle and knit cushion — separated.</p>
        </section>

        <section ref={(el) => { stageRefs.current[6] = el }} className="stage stage-finale" id="buy">
          <p className="eyebrow">Smart Case</p>
          <h2>Put them down.<br />They power down.</h2>
          <div className="specs">
            <div><strong>20 hrs</strong><span>Listening with ANC</span></div>
            <div><strong>2× H1</strong><span>One chip per cup</span></div>
            <div><strong>9 mics</strong><span>ANC + beamforming</span></div>
            <div><strong>Spatial</strong><span>Dynamic head tracking</span></div>
          </div>
          <div className="cta-row">
            <span className="price">$549</span>
            <button className="cta" onClick={() => alert('AirPods Max — demo showcase. Thanks for scrolling to the end.')}>Buy AirPods Max</button>
          </div>
        </section>
      </main>

      {/* colour swatches */}
      <div className="swatches" ref={swatchWrapRef}>
        <span className="swatch-label">Finish</span>
        {COLORWAYS.map((c, i) => (
          <button key={c.name} className={`swatch${i === colorIdx ? ' active' : ''}`} style={{ background: c.swatch }}
            aria-label={`AirPods Max in ${c.name}`} title={c.name} onClick={() => pickColor(i)} />
        ))}
      </div>

      <div className="scroll-track" aria-hidden="true">
        {STAGES.map((s) => <div key={s.n} className="track-chapter" />)}
      </div>
    </>
  )
}
