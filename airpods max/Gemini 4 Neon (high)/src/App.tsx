import Lenis from 'lenis';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ColorSwatchBar } from './components/ColorSwatchBar';
import { EditorialSections, type EditorialHUDHandle } from './components/EditorialSections';
import { LeaderLinesOverlay, type LeaderLinesHandle } from './components/LeaderLinesOverlay';
import { STAGES } from './data/stages';
import { ShowcaseEngine } from './three/ShowcaseEngine';

export function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ShowcaseEngine | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<LeaderLinesHandle>(null);
  const editorialRef = useRef<EditorialHUDHandle>(null);

  const [activeStage, setActiveStage] = useState(0);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [isColorLocked, setIsColorLocked] = useState(false);

  const lastStageRef = useRef(0);
  const lastColorRef = useRef(0);

  // Smooth jump to any normalized scroll progress (0..1)
  const scrollToProgress = useCallback((targetP: number) => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = Math.max(0, Math.min(maxScroll, targetP * maxScroll));
    if (lenisRef.current) {
      lenisRef.current.scrollTo(y, { duration: 1.35 });
    } else {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Initialize Lenis buttery smooth scroll
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    const syncScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      engineRef.current?.setScrollProgress(p);
    };

    lenis.on('scroll', syncScroll);
    window.addEventListener('scroll', syncScroll, { passive: true });

    let lenisRaf = 0;
    const rafLenis = (time: number) => {
      lenis.raf(time);
      lenisRaf = requestAnimationFrame(rafLenis);
    };
    lenisRaf = requestAnimationFrame(rafLenis);

    // 2. Mount Persistent Photorealistic WebGL2 Three.js Showcase Engine
    const engine = new ShowcaseEngine(mount, {
      onFrame: (hud, anchors, backdropHex) => {
        // Imperative zero-re-render updates at 60fps
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${hud.progress.toFixed(4)})`;
        }
        document.documentElement.style.setProperty('--backdrop-tint', backdropHex);

        leaderRef.current?.update(anchors, hud);
        editorialRef.current?.update(hud);

        // Discrete React UI updates only when stage or rounded colorway changes
        if (hud.stageIndex !== lastStageRef.current) {
          lastStageRef.current = hud.stageIndex;
          setActiveStage(hud.stageIndex);
        }
        if (hud.activeColorwayIndex !== lastColorRef.current) {
          lastColorRef.current = hud.activeColorwayIndex;
          setActiveColorIndex(hud.activeColorwayIndex);
        }
      },
    });
    engineRef.current = engine;
    syncScroll();

    return () => {
      cancelAnimationFrame(lenisRaf);
      window.removeEventListener('scroll', syncScroll);
      lenis.destroy();
      engine.dispose();
      engineRef.current = null;
      lenisRef.current = null;
    };
  }, []);

  const handleSelectColor = useCallback((index: number) => {
    setIsColorLocked(true);
    setActiveColorIndex(index);
    engineRef.current?.selectColorway(index);
  }, []);

  const handleResetAutoColor = useCallback(() => {
    setIsColorLocked(false);
    engineRef.current?.selectColorway(null);
  }, []);

  return (
    <>
      {/* Persistent Full-Viewport Photorealistic 3D Studio Stage */}
      <div className="studio-viewport">
        <div ref={mountRef} className="webgl-mount" />
        <div className="studio-vignette" />
      </div>

      {/* Top Minimal Apple-Caliber Navigation Bar */}
      <header className="top-nav">
        <button
          type="button"
          className="nav-brand"
          onClick={() => scrollToProgress(0)}
          aria-label="Scroll to top"
        >
          <span className="nav-brand-dot" />
          <span>AirPods Max</span>
        </button>

        <nav className="nav-chapters" aria-label="Showcase stages">
          {STAGES.map((stage) => {
            const targetP =
              stage.index === 0
                ? 0
                : stage.index === 6
                ? 0.99
                : (stage.start + stage.end) * 0.5;
            return (
              <button
                key={stage.id}
                type="button"
                className={`nav-chapter-btn ${activeStage === stage.index ? 'active' : ''}`}
                onClick={() => scrollToProgress(targetP)}
              >
                {stage.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="nav-cta"
          onClick={() => scrollToProgress(0.99)}
        >
          Smart Case
        </button>
      </header>

      {/* Hairline Scroll Progress Bar */}
      <div className="scroll-progress-hairline" aria-hidden="true">
        <div ref={progressBarRef} className="scroll-progress-fill" />
      </div>

      {/* Scroll-Driven Editorial Storytelling Overlay */}
      <EditorialSections
        ref={editorialRef}
        activeColorIndex={activeColorIndex}
        onReplay={() => scrollToProgress(0)}
        onJumpToExploded={() => scrollToProgress(0.8)}
      />

      {/* Precision 3D-Projected SVG Technical Leader Lines */}
      <LeaderLinesOverlay ref={leaderRef} />

      {/* Minimal Right-Side Vertical Stage Rail */}
      <aside className="stage-rail" aria-label="Chapter progress">
        {STAGES.map((stage) => {
          const targetP =
            stage.index === 0
              ? 0
              : stage.index === 6
              ? 0.99
              : (stage.start + stage.end) * 0.5;
          return (
            <button
              key={stage.id}
              type="button"
              title={stage.label}
              aria-label={`Jump to ${stage.label}`}
              className={`stage-rail-dot ${activeStage === stage.index ? 'active' : ''}`}
              onClick={() => scrollToProgress(targetP)}
            />
          );
        })}
      </aside>

      {/* Interactive Colorway Swatch Dock (5 Signature Finishes) */}
      <ColorSwatchBar
        activeIndex={activeColorIndex}
        isLocked={isColorLocked}
        onSelectColor={handleSelectColor}
        onResetAuto={handleResetAutoColor}
      />

      {/* Tall Native Scroll Track driving 0% -> 100% Choreography */}
      <main className="scroll-track" aria-label="AirPods Max Scroll Showcase Track" />
    </>
  );
}
export default App;
