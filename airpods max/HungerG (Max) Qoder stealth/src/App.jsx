import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { AirPodsExperience } from './scene/AirPodsScene';
import { COLORWAYS } from './scene/model';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  { start: 0, label: 'Introduction' },
  { start: 0.12, label: 'Color' },
  { start: 0.26, label: 'Precision' },
  { start: 0.44, label: 'Comfort' },
  { start: 0.58, label: 'Magnetic fit' },
  { start: 0.72, label: 'Engineering' },
  { start: 0.88, label: 'Smart Case' },
];

const CALLOUTS = {
  crown: { stage: 3, anchor: 'crown', title: 'Digital Crown', copy: 'Rotate for volume. Press for playback, calls and Siri.', side: 'right' },
  noise: { stage: 3, anchor: 'noise', title: 'Noise Control', copy: 'Switch between Active Noise Cancellation and Transparency.', side: 'right' },
  canopy: { stage: 4, anchor: 'canopy', title: 'Knit-mesh canopy', copy: 'A breathable diamond weave distributes weight and reduces pressure.', side: 'left' },
  cushion: { stage: 4, anchor: 'cushion', title: 'Memory-foam cushion', copy: 'Textile-wrapped foam. Magnetically attached. Acoustically sealed.', side: 'right' },
  shell: { stage: 6, anchor: 'shell', title: 'Anodized aluminum', copy: 'A bead-blasted shell with a precision-machined chamfer.', side: 'right' },
  h1: { stage: 6, anchor: 'h1', title: 'Apple H1', copy: 'Computational audio, sensors and Adaptive EQ in each cup.', side: 'left' },
  driver: { stage: 6, anchor: 'driver', title: '40 mm driver', copy: 'An Apple-designed dynamic driver with a dual-neodymium ring magnet.', side: 'right' },
};

function Mark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d="M7 20.5V9.2C7 5.9 9.7 3.5 13.1 3.5h1.8c3.4 0 6.1 2.4 6.1 5.7v11.3" />
      <rect x="4.5" y="14" width="5" height="9" rx="2.5" />
      <rect x="18.5" y="14" width="5" height="9" rx="2.5" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function Callout({ name, config, register }) {
  return (
    <article
      ref={(element) => register(name, element)}
      className={`callout callout--${name} callout--${config.side}`}
      data-stage={config.stage}
      data-callout={name}
    >
      <span className="callout__index">{String(Object.keys(CALLOUTS).indexOf(name) + 1).padStart(2, '0')}</span>
      <div>
        <h3>{config.title}</h3>
        <p>{config.copy}</p>
      </div>
    </article>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const trackRef = useRef(null);
  const experienceRef = useRef(null);
  const lenisRef = useRef(null);
  const calloutRefs = useRef({});
  const lineRefs = useRef({});
  const stageRef = useRef(0);
  const [stage, setStage] = useState(1);
  const [activeColor, setActiveColor] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const registerCallout = useCallback((name, element) => {
    calloutRefs.current[name] = element;
  }, []);

  const updateProjectedUI = useCallback((anchors) => {
    for (const [name, element] of Object.entries(calloutRefs.current)) {
      if (!element) continue;
      const point = anchors[name];
      const path = lineRefs.current[name]?.path;
      const dot = lineRefs.current[name]?.dot;
      if (!point || !path || !dot) continue;
      const endX = element.offsetLeft + (element.classList.contains('callout--left') ? element.offsetWidth : 0);
      const endY = element.offsetTop + element.offsetHeight * 0.5;
      const elbowX = endX + (element.classList.contains('callout--left') ? 44 : -44);
      path.setAttribute('d', `M ${point.x.toFixed(1)} ${point.y.toFixed(1)} L ${elbowX.toFixed(1)} ${endY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`);
      dot.setAttribute('cx', point.x.toFixed(1));
      dot.setAttribute('cy', point.y.toFixed(1));
      const opacity = point.visible ? '1' : '0';
      path.style.opacity = opacity;
      dot.style.opacity = opacity;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let experience;
    try {
      experience = new AirPodsExperience(canvas, {
        onFrame: (anchors, progress) => {
          updateProjectedUI(anchors);
          canvas.dataset.progress = progress.toFixed(3);
        },
        onColorChange: (index) => {
          setActiveColor(index);
          canvas.dataset.color = String(index);
        },
        onReady: () => window.setTimeout(() => setLoaded(true), 350),
      });
      experienceRef.current = experience;
    } catch (error) {
      console.error('Unable to initialize the 3D experience.', error);
      setWebglError(true);
      setLoaded(true);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = new Lenis({
      duration: reducedMotion ? 0 : 1.15,
      smoothWheel: !reducedMotion,
      wheelMultiplier: 0.88,
      touchMultiplier: 1.15,
    });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const trigger = ScrollTrigger.create({
      trigger: trackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        experienceRef.current?.setProgress(self.progress);
        document.documentElement.style.setProperty('--scroll-progress', self.progress.toFixed(4));
        const nextStage = STAGES.reduce((current, item, index) => (self.progress >= item.start ? index + 1 : current), 1);
        if (nextStage !== stageRef.current) {
          stageRef.current = nextStage;
          setStage(nextStage);
        }
      },
    });

    return () => {
      trigger.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
      experience?.dispose();
      experienceRef.current = null;
      lenisRef.current = null;
    };
  }, [updateProjectedUI]);

  const scrollToStage = useCallback((index) => {
    const track = trackRef.current;
    if (!track || !lenisRef.current) return;
    const stageIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    const distance = Math.max(0, track.offsetHeight - window.innerHeight);
    lenisRef.current.scrollTo(distance * STAGES[stageIndex].start + 2, { duration: 1.35 });
  }, []);

  const selectColor = (index) => {
    setActiveColor(index);
    experienceRef.current?.setColorway(index, true);
  };

  return (
    <main className={`experience ${loaded ? 'is-loaded' : ''}`} data-stage={stage}>
      <a className="skip-link" href="#story">Skip to product story</a>
      <div className="loader" aria-hidden={loaded}>
        <div className="loader__mark"><Mark /></div>
        <p>AirPods Max</p>
        <span><i /></span>
      </div>

      <div className="canvas-wrap" aria-hidden="true">
        <canvas ref={canvasRef} />
        {webglError && (
          <div className="webgl-fallback">
            <Mark />
            <h2>AirPods Max</h2>
            <p>This experience needs WebGL. Please enable hardware acceleration and reload.</p>
          </div>
        )}
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => scrollToStage(0)} aria-label="AirPods Max, back to top">
          <Mark />
          <span>AirPods Max</span>
        </button>
        <nav className="topnav" aria-label="Product chapters">
          <button onClick={() => scrollToStage(1)}>Design</button>
          <button onClick={() => scrollToStage(3)}>Comfort</button>
          <button onClick={() => scrollToStage(5)}>Engineering</button>
        </nav>
        <button className="topbar__cta" onClick={() => scrollToStage(6)}>
          Smart Case <Arrow />
        </button>
      </header>

      <div className="stage-count" aria-hidden="true">
        <span>{String(stage).padStart(2, '0')}</span><i /><span>07</span>
      </div>

      <aside className="progress-rail" aria-label="Scroll chapters">
        {STAGES.map((item, index) => (
          <button
            key={item.label}
            className={stage === index + 1 ? 'is-active' : ''}
            onClick={() => scrollToStage(index)}
            aria-label={`Go to ${item.label}`}
            aria-current={stage === index + 1 ? 'step' : undefined}
          >
            <span>{item.label}</span>
            <i />
          </button>
        ))}
      </aside>

      <svg className="callout-lines" aria-hidden="true">
        {Object.entries(CALLOUTS).map(([name]) => (
          <g
            key={name}
            className="callout-line"
            data-stage={CALLOUTS[name].stage}
            ref={(group) => {
              if (!lineRefs.current[name]) lineRefs.current[name] = {};
              lineRefs.current[name].group = group;
              lineRefs.current[name].path = group?.querySelector('path') ?? null;
              lineRefs.current[name].dot = group?.querySelector('circle') ?? null;
            }}
          >
            <path />
            <circle r="3.5" />
          </g>
        ))}
      </svg>

      <div className="callout-layer">
        {Object.entries(CALLOUTS).map(([name, config]) => (
          <Callout key={name} name={name} config={config} register={registerCallout} />
        ))}
      </div>

      <section className="hero-copy" aria-labelledby="hero-title">
        <p className="eyebrow">Sound. Perfected.</p>
        <h1 id="hero-title"><span>AirPods</span><span>Max</span></h1>
        <p className="hero-copy__sub">A high-fidelity blend of breakthrough audio and considered design.</p>
        <button className="text-button" onClick={() => scrollToStage(1)}>
          Explore the design <Arrow />
        </button>
      </section>

      <div className="scroll-cue" aria-hidden="true">
        <span>Scroll to discover</span><i />
      </div>

      <section className="chapter-copy chapter-copy--color" aria-labelledby="color-title">
        <p className="eyebrow">02 — Color</p>
        <h2 id="color-title">Five colors.<br /><em>One icon.</em></h2>
        <p>Anodized aluminum. Breathable knit. A finish that feels as good as it looks.</p>
      </section>

      <section className="chapter-copy chapter-copy--precision" aria-labelledby="precision-title">
        <p className="eyebrow">03 — Precision</p>
        <h2 id="precision-title">Every turn.<br /><em>Exactly right.</em></h2>
        <p>Tactile control, machined to the micron. No clutter. Just instinct.</p>
      </section>

      <section className="chapter-copy chapter-copy--comfort" aria-labelledby="comfort-title">
        <p className="eyebrow">04 — Comfort</p>
        <h2 id="comfort-title">Light on your head.<br /><em>Lost in the music.</em></h2>
        <p>A breathable canopy and memory-foam cushions create a seal without the pressure.</p>
      </section>

      <section className="chapter-copy chapter-copy--magnetic" aria-labelledby="magnetic-title">
        <p className="eyebrow">05 — Magnetic fit</p>
        <h2 id="magnetic-title">A perfect seal.<br /><em>A simple snap.</em></h2>
        <p>Tool-free cushions align magnetically, then lock into an acoustically precise fit.</p>
      </section>

      <section className="chapter-copy chapter-copy--engineering" aria-labelledby="engineering-title">
        <p className="eyebrow">06 — Engineering</p>
        <h2 id="engineering-title">Beauty,<br /><em>from the inside out.</em></h2>
        <p>Two H1 chips. Custom 40 mm drivers. Computational audio in every layer.</p>
      </section>

      <section className="chapter-copy chapter-copy--case" aria-labelledby="case-title">
        <p className="eyebrow">07 — Smart Case</p>
        <h2 id="case-title">Ready when<br /><em>you are.</em></h2>
        <p>Ear cups swivel flat. The color-matched Smart Case closes with a magnetic snap.</p>
        <div className="spec-grid">
          <div><strong>40 mm</strong><span>Apple-designed driver</span></div>
          <div><strong>20 hrs</strong><span>Listening time</span></div>
          <div><strong>384.8 g</strong><span>Considered balance</span></div>
          <div><strong>H1</strong><span>In each ear cup</span></div>
        </div>
        <div className="case-actions">
          <button className="primary-button" onClick={() => scrollToStage(0)}>Replay the experience <Arrow /></button>
          <a href="https://www.apple.com/airpods-max/" target="_blank" rel="noreferrer">View at Apple <Arrow /></a>
        </div>
      </section>

      <div className="color-dock" aria-label="Choose a finish">
        <span className="color-dock__label">Finish</span>
        <div className="color-dock__swatches">
          {COLORWAYS.map((color, index) => (
            <button
              key={color.name}
              className={activeColor === index ? 'is-active' : ''}
              style={{ '--swatch': color.aluminum }}
              onClick={() => selectColor(index)}
              aria-label={`Select ${color.name}`}
              aria-pressed={activeColor === index}
              title={color.name}
            >
              <i />
            </button>
          ))}
        </div>
        <span className="color-dock__name" aria-live="polite">{COLORWAYS[activeColor].name}</span>
      </div>

      <div id="story" className="scroll-track" ref={trackRef} aria-hidden="true">
        {STAGES.map((item, index) => <section key={item.label} id={`stage-${index + 1}`} />)}
      </div>

      <footer className="fine-print">
        <span>Independent 3D concept. Original AirPods Max, 2020.</span>
        <span>187.3 × 168.6 × 83.4 mm</span>
      </footer>
      <p className="sr-only" aria-live="polite">Chapter {stage} of 7: {STAGES[stage - 1].label}</p>
    </main>
  );
}
