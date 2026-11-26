import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Lenis from 'lenis';
import { useEffect } from 'react';
import Scene from './three/Scene';
import Overlay from './components/Overlay';
import { COLORWAYS } from './three/materials';
import useScrollProgress from './hooks/useScrollProgress';
import './index.css';

export default function App() {
  const [colorway, setColorway] = useState(COLORWAYS[2]); // Sky Blue hero
  const { progressRef, wrapRef } = useScrollProgress();
  const overlayRefs = useRef({});

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let raf = 0;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  // auto-cycle colorways while in color section (until user picks)
  const picked = useRef(false);
  const wrapPick = (c) => { picked.current = true; setColorway(c); };
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      const p = progressRef.current;
      if (!picked.current && p > 0.1 && p < 0.28) {
        i = (i + 1) % COLORWAYS.length;
        setColorway(COLORWAYS[i]);
      }
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div id="top" ref={wrapRef} className="app">
      <div className="canvas-fixed">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 1.2, 9], fov: 34 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = 4; // ACESFilmic
            gl.toneMappingExposure = 1.05;
          }}
        >
          <Scene colorway={colorway} progressRef={progressRef} overlayRefs={overlayRefs} />
        </Canvas>
      </div>
      <Overlay colorway={colorway} setColorway={wrapPick} overlayRefs={overlayRefs} progressRef={progressRef} />
      <footer className="footer">
        <span>AirPods Max concept showcase — procedural Three.js, no external 3D embeds.</span>
        <span>Reference frames: front · crown · detach · exploded · Smart Case.</span>
      </footer>
    </div>
  );
}
