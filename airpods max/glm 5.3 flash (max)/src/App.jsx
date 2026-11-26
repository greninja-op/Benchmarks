import { useEffect } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Scene from './scene/Scene.jsx'
import Hud from './ui/Hud.jsx'
import Sections from './ui/Sections.jsx'
import { APP } from './store.js'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  useEffect(() => {
    /* ---- smooth scroll + master progress ---- */
    const lenis = new Lenis({ lerp: 0.095, wheelMultiplier: 1.0, touchMultiplier: 1.35 })
    const onScroll = ({ scroll = 0, limit = 0, velocity = 0 } = {}) => {
      APP.raw = limit > 0 ? THREE.MathUtils.clamp(scroll / limit, 0, 1) : 0
      APP.scrollVelocity = velocity
      ScrollTrigger.update()
    }
    lenis.on('scroll', onScroll)
    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    /* ---- pointer parallax target ---- */
    const onMove = (e) => {
      APP.mouse.tx = (e.clientX / window.innerWidth) * 2 - 1
      APP.mouse.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    /* ---- scrubbed reveal animations ---- */
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-rev]').forEach((el) => {
        gsap.fromTo(el,
          { yPercent: 46, opacity: 0, filter: 'blur(7px)' },
          {
            yPercent: 0, opacity: 1, filter: 'blur(0px)', ease: 'none',
            scrollTrigger: {
              trigger: el.closest('section'),
              start: 'top 88%',
              end: 'top 42%',
              scrub: true,
            },
          })
      })
    })

    return () => {
      window.removeEventListener('pointermove', onMove)
      lenis.destroy()
      gsap.ticker.remove(tick)
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <>
      <div className="gl-holder" aria-hidden="true">
        <Canvas
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          camera={{ fov: 30, position: [0.5, 0.9, 27.5], near: 0.1, far: 220 }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
          }}
        >
          <Scene />
        </Canvas>
      </div>
      <div className="vignette" aria-hidden="true" />
      <Hud />
      <Sections />
    </>
  )
}
