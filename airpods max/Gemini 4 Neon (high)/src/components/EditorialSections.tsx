import { RotateCcw, Sparkles } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { COLORWAYS } from '../data/colorways';
import { STAGES } from '../data/stages';
import type { ShowcaseHUDState } from '../types/showcase';

export interface EditorialHUDHandle {
  update: (hud: ShowcaseHUDState) => void;
}

interface EditorialSectionsProps {
  activeColorIndex: number;
  onReplay: () => void;
  onJumpToExploded: () => void;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/**
 * Scroll-synchronized editorial storytelling layer.
 * Uses direct DOM opacity/transform updates inside rAF so every stage cross-fade is razor-smooth at 60fps.
 */
export const EditorialSections = forwardRef<EditorialHUDHandle, EditorialSectionsProps>(
  function EditorialSections({ activeColorIndex, onReplay, onJumpToExploded }, ref) {
    const heroRef = useRef<HTMLDivElement>(null);
    const finishesRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const crownDegRef = useRef<HTMLSpanElement>(null);
    const canopyRef = useRef<HTMLDivElement>(null);
    const meshRef = useRef<HTMLDivElement>(null);
    const magneticRef = useRef<HTMLDivElement>(null);
    const magneticStatusRef = useRef<HTMLSpanElement>(null);
    const explodedRef = useRef<HTMLDivElement>(null);
    const finaleRef = useRef<HTMLDivElement>(null);
    const caseStatusRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      update(hud) {
        const p = hud.progress;

        const applyEnvelope = (
          el: HTMLDivElement | null,
          inA: number,
          inB: number,
          outA: number,
          outB: number,
          liftPx = 18
        ) => {
          if (!el) return;
          const fadeIn = inA === inB ? 1 : smoothstep(inA, inB, p);
          const fadeOut = outA === outB ? 1 : 1 - smoothstep(outA, outB, p);
          const vis = fadeIn * fadeOut;
          const yShift = (1 - fadeIn) * liftPx - (1 - fadeOut) * (liftPx * 0.7);
          el.style.opacity = `${vis.toFixed(3)}`;
          el.style.transform = `translate3d(0, ${yShift.toFixed(1)}px, 0)`;
          el.style.visibility = vis < 0.01 ? 'hidden' : 'visible';
        };

        // Stage 1: Hero Entrance (0% - 12%)
        applyEnvelope(heroRef.current, 0.0, 0.0, 0.075, 0.118, 20);

        // Stage 2: Dynamic Colorway Morphing (12% - 26%)
        applyEnvelope(finishesRef.current, 0.115, 0.145, 0.235, 0.265);

        // Stage 3: Digital Crown & Noise Control Macro (26% - 44%)
        applyEnvelope(controlsRef.current, 0.265, 0.295, 0.415, 0.442);
        if (crownDegRef.current) {
          crownDegRef.current.textContent = `Digital Crown · ${hud.crownAngleDeg}° rotation`;
        }

        // Stage 4A: Breathable Knit-Mesh Canopy (44% - 51.5%)
        applyEnvelope(canopyRef.current, 0.442, 0.468, 0.505, 0.525);

        // Stage 4B: Diamond-Knit Cushion & Inner L/R Acoustic Mesh (51.5% - 58%)
        applyEnvelope(meshRef.current, 0.518, 0.54, 0.568, 0.588);

        // Stage 5: Magnetic Cushion Detach & Snap-Back (58% - 72%)
        applyEnvelope(magneticRef.current, 0.585, 0.612, 0.698, 0.722);
        if (magneticStatusRef.current) {
          if (hud.detachFactor > 0.72) {
            magneticStatusRef.current.textContent = 'Acoustic Baffle & Honeycomb Grille Exposed';
          } else if (p > 0.67 && hud.detachFactor > 0.05) {
            magneticStatusRef.current.textContent = 'Magnetic Alignment Returning…';
          } else if (p > 0.69 && hud.detachFactor <= 0.05) {
            magneticStatusRef.current.textContent = 'Magnetic Seal Locked';
          } else {
            magneticStatusRef.current.textContent = 'Unseating Magnetic Ear Cushions';
          }
        }

        // Stage 6: Engineering Exploded View (72% - 88%)
        applyEnvelope(explodedRef.current, 0.73, 0.76, 0.848, 0.875);

        // Stage 7: Smart Case Finale (88% - 100%)
        applyEnvelope(finaleRef.current, 0.885, 0.92, 1.0, 1.0, 14);
        if (caseStatusRef.current) {
          if (hud.caseCloseFactor > 0.88) {
            caseStatusRef.current.textContent = 'Magnetic Flap Closed · Ultra-Low-Power Active';
          } else if (p > 0.93) {
            caseStatusRef.current.textContent = 'Docking Into Contoured Smart Case…';
          } else {
            caseStatusRef.current.textContent = 'Swiveling Cups Flat for Smart Case';
          }
        }
      },
    }));

    const activeColor = COLORWAYS[activeColorIndex] ?? COLORWAYS[0];

    return (
      <div className="hud-layer">
        {/* Stage 1 — Hero Entrance */}
        <section ref={heroRef} className="hero-stage" aria-label="AirPods Max Overview">
          <div className="hero-top-group">
            <span className="eyebrow-pill">
              <Sparkles size={12} />
              {STAGES[0].eyebrow}
            </span>
            <h1 className="hero-title">{STAGES[0].headline}</h1>
          </div>

          <div className="hero-bottom-group">
            <p className="hero-subtitle">{STAGES[0].description}</p>
            <div className="scroll-cue">
              <span className="scroll-cue-mouse">
                <span className="scroll-cue-wheel" />
              </span>
              <span>Scroll to explore engineering</span>
            </div>
          </div>
        </section>

        {/* Stage 2 — Dynamic Colorway Morphing */}
        <section ref={finishesRef} className="editorial-panel" style={{ opacity: 0 }}>
          <span className="editorial-eyebrow">{STAGES[1].eyebrow}</span>
          <h2 className="editorial-headline">{STAGES[1].headline}</h2>
          <p className="editorial-body">{activeColor.tagline}</p>
          <div className="telemetry-chip">
            <span
              className="telemetry-dot"
              style={{
                background: activeColor.swatchHex,
                boxShadow: `0 0 0 3px ${activeColor.swatchRingHex}44`,
              }}
            />
            <span>Finish · {activeColor.name}</span>
          </div>
        </section>

        {/* Stage 3 — Digital Crown & Noise Control Macro */}
        <section ref={controlsRef} className="editorial-panel" style={{ opacity: 0 }}>
          <span className="editorial-eyebrow">{STAGES[2].eyebrow}</span>
          <h2 className="editorial-headline">{STAGES[2].headline}</h2>
          <p className="editorial-body">{STAGES[2].description}</p>
          <div className="telemetry-chip">
            <span className="telemetry-dot" />
            <span ref={crownDegRef}>Digital Crown · 0° rotation</span>
          </div>
        </section>

        {/* Stage 4A — Breathable Knit-Mesh Canopy */}
        <section ref={canopyRef} className="editorial-panel" style={{ opacity: 0 }}>
          <span className="editorial-eyebrow">Suspended Knit-Mesh Canopy</span>
          <h2 className="editorial-headline">Weightless tension.</h2>
          <p className="editorial-body">
            Woven from an open-cell breathable textile stretched across a stainless-steel arch,
            distributing weight evenly to eliminate on-head pressure.
          </p>
        </section>

        {/* Stage 4B — Ear Cushion Textile & Inner L/R Acoustic Mesh */}
        <section ref={meshRef} className="editorial-panel align-bottom-left" style={{ opacity: 0 }}>
          <span className="editorial-eyebrow">Custom Diamond-Knit Cushions</span>
          <h2 className="editorial-headline">Sculpted for acoustic seal.</h2>
          <p className="editorial-body">
            Acoustically engineered memory foam wrapped in diamond-knit textile encloses a finer
            darker-weave inner mesh with seamlessly knitted L and R indicators.
          </p>
        </section>

        {/* Stage 5 — Magnetic Ear Cushion Detach & Snap-Back */}
        <section ref={magneticRef} className="editorial-panel" style={{ opacity: 0 }}>
          <span className="editorial-eyebrow">{STAGES[4].eyebrow}</span>
          <h2 className="editorial-headline">{STAGES[4].headline}</h2>
          <p className="editorial-body">{STAGES[4].description}</p>
          <div className="telemetry-chip">
            <span className="telemetry-dot" />
            <span ref={magneticStatusRef}>Unseating Magnetic Ear Cushions</span>
          </div>
        </section>

        {/* Stage 6 — Engineering Exploded View */}
        <section ref={explodedRef} className="editorial-panel" style={{ opacity: 0 }}>
          <span className="editorial-eyebrow">{STAGES[5].eyebrow}</span>
          <h2 className="editorial-headline">{STAGES[5].headline}</h2>
          <p className="editorial-body">{STAGES[5].description}</p>
        </section>

        {/* Stage 7 — Smart Case Finale */}
        <section ref={finaleRef} className="finale-stage" style={{ opacity: 0 }}>
          <div className="finale-header">
            <span className="editorial-eyebrow">{STAGES[6].eyebrow}</span>
            <h2 className="editorial-headline">{STAGES[6].headline}</h2>
            <p className="editorial-body">{STAGES[6].description}</p>
            <div className="telemetry-chip">
              <span className="telemetry-dot" />
              <span ref={caseStatusRef}>Swiveling Cups Flat for Smart Case</span>
            </div>
          </div>

          <div className="finale-footer">
            <div className="specs-strip">
              <div className="spec-cell">
                <div className="spec-value">40 mm</div>
                <div className="spec-label">Dual-neodymium ring driver</div>
              </div>
              <div className="spec-cell">
                <div className="spec-value">2 × H1</div>
                <div className="spec-label">10 audio cores per ear cup</div>
              </div>
              <div className="spec-cell">
                <div className="spec-value">20 hrs</div>
                <div className="spec-label">ANC + Spatial Audio playback</div>
              </div>
              <div className="spec-cell">
                <div className="spec-value">9 Mics</div>
                <div className="spec-label">8 ANC + 3 voice pickup array</div>
              </div>
            </div>

            <div className="finale-actions">
              <button type="button" className="btn-secondary" onClick={onJumpToExploded}>
                Inspect Internals
              </button>
              <button type="button" className="btn-primary" onClick={onReplay}>
                <RotateCcw size={14} />
                Replay Showcase
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }
);
