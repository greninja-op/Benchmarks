import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { COLORWAYS, LEADER_CALLOUTS, STAGES } from './data/colorways';
import { AirPodsSceneController, SceneTelemetry } from './three/sceneController';
import { LeaderLinesOverlay, LeaderLinesRefs } from './components/LeaderLinesOverlay';
import { ChevronDown, Sparkles, Volume2, ShieldCheck, Cpu, Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<AirPodsSceneController | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const leaderRefs = useRef<LeaderLinesRefs>({
    containerEl: null,
    pathEls: {},
    dotEls: {},
    pulseEls: {},
    cardEls: {},
  });

  const [activeStage, setActiveStage] = useState(0);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [isManualColor, setIsManualColor] = useState(false);

  const stageRef = useRef(0);
  const colorRef = useRef(0);

  const handleTelemetry = useCallback((t: SceneTelemetry) => {
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = `scaleY(${t.scrollProgress})`;
    }

    if (t.stageIndex !== stageRef.current) {
      stageRef.current = t.stageIndex;
      setActiveStage(t.stageIndex);
    }

    if (t.activeColorIndex !== colorRef.current) {
      colorRef.current = t.activeColorIndex;
      setActiveColorIdx(t.activeColorIndex);
      const cw = COLORWAYS[t.activeColorIndex];
      if (backdropRef.current && cw) {
        backdropRef.current.style.background = `radial-gradient(circle at 50% 38%, ${cw.bgTop} 0%, ${cw.bgBottom} 100%)`;
      }
    }

    // Imperative 60fps DOM update for 3D-projected SVG Leader Lines & Cards
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isCompact = vw < 900;

    for (const spec of LEADER_CALLOUTS) {
      const anchor = t.anchors[spec.id];
      const pathEl = leaderRefs.current.pathEls[spec.id];
      const dotEl = leaderRefs.current.dotEls[spec.id];
      const pulseEl = leaderRefs.current.pulseEls[spec.id];
      const cardEl = leaderRefs.current.cardEls[spec.id];

      if (!anchor || !anchor.visible || anchor.opacity <= 0.015 || isCompact) {
        if (pathEl) pathEl.style.opacity = '0';
        if (dotEl) dotEl.style.opacity = '0';
        if (pulseEl) pulseEl.style.opacity = '0';
        if (cardEl) {
          cardEl.style.opacity = '0';
          cardEl.style.pointerEvents = 'none';
        }
        continue;
      }

      const cardWidth = 258;
      const margin = 36;
      const isRight = spec.side === 'right';

      // Position callout cards cleanly in left or right negative-space gutters
      const targetCardX = isRight
        ? Math.min(vw - cardWidth - margin, Math.max(anchor.x + 115, vw * 0.66))
        : Math.max(margin, Math.min(anchor.x - cardWidth - 115, vw * 0.34 - cardWidth));

      const targetCardY = Math.min(
        vh - 145,
        Math.max(96, anchor.y + spec.offsetY)
      );

      const lineEndX = isRight ? targetCardX - 12 : targetCardX + cardWidth + 12;
      const lineEndY = targetCardY + 26;
      const elbowX = isRight
        ? anchor.x + Math.min(64, (lineEndX - anchor.x) * 0.45)
        : anchor.x - Math.min(64, (anchor.x - lineEndX) * 0.45);

      const d = `M ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)} L ${elbowX.toFixed(1)} ${lineEndY.toFixed(1)} L ${lineEndX.toFixed(1)} ${lineEndY.toFixed(1)}`;

      if (pathEl) {
        pathEl.setAttribute('d', d);
        pathEl.style.opacity = anchor.opacity.toFixed(3);
      }
      if (dotEl) {
        dotEl.setAttribute('cx', anchor.x.toFixed(1));
        dotEl.setAttribute('cy', anchor.y.toFixed(1));
        dotEl.style.opacity = anchor.opacity.toFixed(3);
      }
      if (pulseEl) {
        pulseEl.setAttribute('cx', anchor.x.toFixed(1));
        pulseEl.setAttribute('cy', anchor.y.toFixed(1));
        pulseEl.style.opacity = (anchor.opacity * 0.85).toFixed(3);
      }
      if (cardEl) {
        const slideOffset = (1 - anchor.opacity) * (isRight ? 14 : -14);
        cardEl.style.transform = `translate3d(${(targetCardX + slideOffset).toFixed(1)}px, ${targetCardY.toFixed(1)}px, 0)`;
        cardEl.style.opacity = anchor.opacity.toFixed(3);
      }
    }
  }, []);

  useEffect(() => {
    if (!canvasHostRef.current || !scrollTrackRef.current) return;

    const controller = new AirPodsSceneController(canvasHostRef.current, handleTelemetry);
    controllerRef.current = controller;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tickerFn = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    const trigger = ScrollTrigger.create({
      trigger: scrollTrackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        controller.setScrollProgress(self.progress);
      },
    });

    // Entrance fade-in animations for editorial blocks
    const revealEls = document.querySelectorAll('.editorial-reveal');
    const triggers: ScrollTrigger[] = [];
    revealEls.forEach((el) => {
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 82%',
        end: 'bottom 18%',
        toggleClass: 'is-visible',
      });
      triggers.push(st);
    });

    return () => {
      trigger.kill();
      triggers.forEach((t) => t.kill());
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
      controller.dispose();
    };
  }, [handleTelemetry]);

  const jumpToProgress = (progress: number) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = maxScroll * progress;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 1.35 });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const handleSelectColor = (idx: number) => {
    setIsManualColor(true);
    setActiveColorIdx(idx);
    colorRef.current = idx;
    controllerRef.current?.selectColorway(idx, true);
    const cw = COLORWAYS[idx];
    if (backdropRef.current && cw) {
      backdropRef.current.style.background = `radial-gradient(circle at 50% 38%, ${cw.bgTop} 0%, ${cw.bgBottom} 100%)`;
    }
  };

  const handleResetAutoColor = () => {
    setIsManualColor(false);
    controllerRef.current?.clearManualColorOverride();
  };

  const activeColor = COLORWAYS[activeColorIdx] || COLORWAYS[0];

  return (
    <div className="showcase-root">
      {/* Dynamic Studio Backdrop */}
      <div
        ref={backdropRef}
        className="studio-backdrop"
        style={{
          background: `radial-gradient(circle at 50% 38%, ${COLORWAYS[0].bgTop} 0%, ${COLORWAYS[0].bgBottom} 100%)`,
        }}
      />

      {/* Persistent Single-Model 3D WebGL2 Canvas */}
      <div ref={canvasHostRef} className="webgl-viewport" />

      {/* 3D-Projected SVG Technical Leader Lines */}
      <LeaderLinesOverlay refsBag={leaderRefs} />

      {/* Minimalist Apple Global Sub-Navigation */}
      <header className="top-nav">
        <div className="top-nav__inner">
          <button
            type="button"
            className="top-nav__brand"
            onClick={() => jumpToProgress(0)}
          >
            AirPods Max
          </button>

          <nav className="top-nav__links" aria-label="Product sections">
            <button
              type="button"
              className={activeStage === 1 ? 'is-active' : ''}
              onClick={() => jumpToProgress(0.18)}
            >
              Finishes
            </button>
            <button
              type="button"
              className={activeStage === 2 ? 'is-active' : ''}
              onClick={() => jumpToProgress(0.35)}
            >
              Controls
            </button>
            <button
              type="button"
              className={activeStage === 3 || activeStage === 4 ? 'is-active' : ''}
              onClick={() => jumpToProgress(0.64)}
            >
              Design
            </button>
            <button
              type="button"
              className={activeStage === 5 ? 'is-active' : ''}
              onClick={() => jumpToProgress(0.80)}
            >
              Audio Architecture
            </button>
            <button
              type="button"
              className={activeStage === 6 ? 'is-active' : ''}
              onClick={() => jumpToProgress(0.96)}
            >
              Smart Case
            </button>
          </nav>

          <button
            type="button"
            className="top-nav__cta"
            onClick={() => jumpToProgress(0.98)}
          >
            Buy
          </button>
        </div>
      </header>

      {/* Right-Side Minimal Choreography Progress Rail */}
      <aside className="stage-rail" aria-label="Scroll Choreography Progress">
        <div className="stage-rail__track">
          <div ref={progressFillRef} className="stage-rail__fill" />
        </div>
        <div className="stage-rail__dots">
          {STAGES.map((st, idx) => (
            <button
              key={st.id}
              type="button"
              className={`stage-rail__dot ${activeStage === idx ? 'is-active' : ''}`}
              onClick={() => jumpToProgress((st.range[0] + st.range[1]) * 0.5)}
              title={st.label}
            >
              <span className="stage-rail__tooltip">{st.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Persistent Floating Dual-Tone Colorway Swatch Dock */}
      <div className={`swatch-dock ${activeStage === 1 ? 'swatch-dock--expanded' : ''}`}>
        <div className="swatch-dock__pill">
          <span className="swatch-dock__label">{activeColor.name}</span>
          <div className="swatch-dock__list" role="radiogroup" aria-label="AirPods Max Finish">
            {COLORWAYS.map((cw, idx) => (
              <button
                key={cw.id}
                type="button"
                role="radio"
                aria-checked={activeColorIdx === idx}
                aria-label={cw.name}
                className={`swatch-btn ${activeColorIdx === idx ? 'is-selected' : ''}`}
                onClick={() => handleSelectColor(idx)}
              >
                <span
                  className="swatch-btn__split"
                  style={{
                    background: `linear-gradient(135deg, ${cw.swatchPrimary} 50%, ${cw.swatchSecondary} 50%)`,
                  }}
                />
              </button>
            ))}
          </div>
          {isManualColor && (
            <button
              type="button"
              className="swatch-dock__reset"
              onClick={handleResetAutoColor}
              title="Resume scroll-driven color morphing"
            >
              Auto
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          7-STAGE SCROLL CHOREOGRAPHY TRACK (1100vh Total Height)
         ========================================================= */}
      <main ref={scrollTrackRef} className="scroll-track">
        {/* STAGE 1: HERO ENTRANCE (0% - 12%) */}
        <section className="stage-section stage-section--hero" style={{ height: '132vh' }}>
          <div className="hero-layout">
            <div className="hero-heading">
              <p className="eyebrow">Computational Audio</p>
              <h1 className="hero-title">AirPods Max</h1>
            </div>

            <div className="hero-footer">
              <p className="hero-subtitle">
                A radically original composition of high-fidelity acoustics, anodized aluminum, and effortless magic.
              </p>
              <button
                type="button"
                className="scroll-cue"
                onClick={() => jumpToProgress(0.16)}
              >
                <span>Scroll to explore</span>
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* STAGE 2: DYNAMIC COLORWAY MORPHING (12% - 26%) */}
        <section className="stage-section stage-section--left" style={{ height: '154vh' }}>
          <div className="editorial-block editorial-reveal">
            <p className="eyebrow">Five Signature Finishes</p>
            <h2 className="section-title">
              Sculpted in color.
              <br />
              Matched down to the weave.
            </h2>
            <p className="section-copy">
              Every surface—from the micro-bead-blasted anodized aluminum cups to the breathable knit canopy and contoured Smart Case—harmonizes across five tonal palettes.
            </p>
            <div className="active-finish-badge">
              <span
                className="active-finish-badge__dot"
                style={{ backgroundColor: activeColor.swatchSecondary }}
              />
              <div>
                <div className="active-finish-badge__name">{activeColor.name}</div>
                <div className="active-finish-badge__desc">{activeColor.tagline}</div>
              </div>
            </div>
          </div>
        </section>

        {/* STAGE 3: MACRO ZOOM — DIGITAL CROWN & NOISE CONTROL (26% - 44%) */}
        <section className="stage-section stage-section--bottom-left" style={{ height: '198vh' }}>
          <div className="editorial-block editorial-block--compact editorial-reveal">
            <p className="eyebrow">Tactile Precision</p>
            <h2 className="section-title">Command every decibel.</h2>
            <p className="section-copy">
              Inspired by classic horology, the knurled <strong>Digital Crown</strong> delivers mechanical precision over volume, playback, calls, and Siri—paired with a flush <strong>Noise Control button</strong> for instant acoustic immersion.
            </p>
          </div>
        </section>

        {/* STAGE 4: ACOUSTIC KNIT-MESH & CANOPY MACRO (44% - 58%) */}
        <section className="stage-section stage-section--left" style={{ height: '154vh' }}>
          <div className="editorial-block editorial-block--compact editorial-reveal">
            <p className="eyebrow">Ergonomic Acoustics</p>
            <h2 className="section-title">
              Weightless canopy.
              <br />
              Custom-woven seal.
            </h2>
            <p className="section-copy">
              A breathable open-weave mesh spanning the stainless-steel headband distributes weight to reduce on-head pressure, while acoustically engineered memory foam cushions wrap in three-dimensional cellular knit with integrated <strong>L</strong> and <strong>R</strong> acoustic scrims.
            </p>
            <div className="micro-metrics">
              <div className="micro-metric">
                <span className="micro-metric__val">3D Knit</span>
                <span className="micro-metric__lbl">Breathable Acoustic Weave</span>
              </div>
              <div className="micro-metric">
                <span className="micro-metric__val">110°</span>
                <span className="micro-metric__lbl">Independent Cup Pivot</span>
              </div>
            </div>
          </div>
        </section>

        {/* STAGE 5: MAGNETIC EAR CUSHION DETACH & SNAP-BACK (58% - 72%) */}
        <section className="stage-section stage-section--top-center" style={{ height: '154vh' }}>
          <div className="editorial-block editorial-block--centered editorial-reveal">
            <p className="eyebrow">Modular Precision</p>
            <h2 className="section-title">Magnetically seated. Effortlessly swappable.</h2>
            <p className="section-copy">
              Instead of mechanical clips or adhesives, custom neodymium magnet arrays unseat cleanly and snap each ear cushion into micron-accurate acoustic alignment over the honeycomb baffle.
            </p>
          </div>
        </section>

        {/* STAGE 6: 5-LAYER HORIZONTAL ENGINEERING EXPLODED VIEW (72% - 88%) */}
        <section className="stage-section stage-section--top-center" style={{ height: '176vh' }}>
          <div className="editorial-block editorial-block--centered editorial-block--wide editorial-reveal">
            <p className="eyebrow">Internal Architecture</p>
            <h2 className="section-title">Custom 40mm driver meets dual H1 silicon.</h2>
            <p className="section-copy">
              Modeled after high-end floor-standing speakers, the dual-neodymium ring magnet motor minimizes total harmonic distortion across the entire audible spectrum—while 10 audio cores in each cup run 9 billion operations per second.
            </p>
          </div>
        </section>

        {/* STAGE 7: SMART CASE FINALE (88% - 100%) */}
        <section className="stage-section stage-section--finale" style={{ height: '132vh' }}>
          <div className="finale-grid editorial-reveal">
            <div className="finale-header">
              <p className="eyebrow">Ultra-Low-Power State</p>
              <h2 className="section-title">Tucks in. Preserves charge.</h2>
              <p className="section-copy">
                Swivel the anodized cups flat and glide them into the soft, contoured <strong>Smart Case</strong>. Closing the magnetic flap immediately places AirPods Max in an ultra-low-power state.
              </p>
            </div>

            <div className="finale-specs">
              <div className="spec-pill">
                <Volume2 size={18} strokeWidth={1.6} />
                <div>
                  <strong>20 hrs</strong>
                  <span>High-fidelity audio with ANC & Spatial Audio</span>
                </div>
              </div>
              <div className="spec-pill">
                <Cpu size={18} strokeWidth={1.6} />
                <div>
                  <strong>Dual Apple H1</strong>
                  <span>Adaptive EQ & dynamic head tracking</span>
                </div>
              </div>
              <div className="spec-pill">
                <ShieldCheck size={18} strokeWidth={1.6} />
                <div>
                  <strong>2x Pro-Level ANC</strong>
                  <span>8 microphones counter external sound</span>
                </div>
              </div>
              <div className="spec-pill">
                <Layers size={18} strokeWidth={1.6} />
                <div>
                  <strong>5 min = 1.5 hrs</strong>
                  <span>Fast-charge recovery in Smart Case</span>
                </div>
              </div>
            </div>

            <div className="finale-cta-row">
              <div className="finale-price">
                <span className="finale-price__amount">$549</span>
                <span className="finale-price__note">Includes AirPods Max & Smart Case in {activeColor.name}</span>
              </div>
              <div className="finale-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => jumpToProgress(0.18)}
                >
                  <Sparkles size={15} />
                  <span>Customize Finish</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => jumpToProgress(0)}
                >
                  Replay Showcase
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
