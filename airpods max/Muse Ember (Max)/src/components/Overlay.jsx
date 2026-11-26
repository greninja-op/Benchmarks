import { COLORWAYS } from '../three/materials';

export default function Overlay({ colorway, setColorway, overlayRefs, progressRef }) {
  const set = (id) => (e) => {
    e.stopPropagation();
    const c = COLORWAYS.find((c) => c.id === id);
    if (c) setColorway(c);
  };

  return (
    <>
      {/* fixed nav */}
      <header className="nav glass">
        <div className="nav-inner">
          <span className="apple-mark"></span>
          <span className="nav-title">AirPods Max</span>
          <nav className="nav-links">
            <a href="#colors">Colors</a><a href="#crown">Crown</a>
            <a href="#knit">Knit</a><a href="#detach">Detach</a>
            <a href="#engineered">Engineered</a><a href="#case">Case</a>
          </nav>
          <button className="buy-btn">Buy — $549</button>
        </div>
      </header>

      {/* color swatches */}
      <div className="swatches glass">
        {COLORWAYS.map((c) => (
          <button key={c.id} title={c.name}
            onClick={set(c.id)}
            className={`sw ${colorway.id === c.id ? 'active' : ''}`}
            style={{ background: `linear-gradient(135deg, ${c.aluminum}, ${c.knit})` }} />
        ))}
        <span className="sw-name">{colorway.name}</span>
      </div>

      {/* leader-line layer */}
      <div className="leader-layer">
        <svg className="leader-svg">
          <line ref={(el) => (overlayRefs.current.crownLine = el)} className="leader-line" x1="0" y1="0" x2="0" y2="0" />
          <line ref={(el) => (overlayRefs.current.noiseLine = el)} className="leader-line" x1="0" y1="0" x2="0" y2="0" />
          <line ref={(el) => (overlayRefs.current.drvLine = el)} className="leader-line" x1="0" y1="0" x2="0" y2="0" />
          <line ref={(el) => (overlayRefs.current.bafLine = el)} className="leader-line" x1="0" y1="0" x2="0" y2="0" />
        </svg>
        <div ref={(el) => (overlayRefs.current.crownWrap = el)} className="leader-group">
          <div ref={(el) => (overlayRefs.current.crownDot = el)} className="anchor-dot" />
          <div ref={(el) => (overlayRefs.current.crownCard = el)} data-x={window.innerWidth > 900 ? window.innerWidth * 0.76 : window.innerWidth * 0.5} data-y={window.innerHeight * 0.3} className="callout" style={{ left: '76%', top: '30%' }}>
            <h4>Digital Crown</h4>
            <p>Knurled precision dial — volume, track navigation, Siri &amp; calls. Rotates live as you zoom.</p>
          </div>
          <div ref={(el) => (overlayRefs.current.noiseDot = el)} className="anchor-dot" />
          <div ref={(el) => (overlayRefs.current.noiseCard = el)} data-x={window.innerWidth > 900 ? window.innerWidth * 0.76 : window.innerWidth * 0.5} data-y={window.innerHeight * 0.62} className="callout" style={{ left: '76%', top: '62%' }}>
            <h4>Noise Control</h4>
            <p>Flush pill — toggles Active Noise Cancellation &amp; Transparency mode.</p>
          </div>
        </div>
        <div ref={(el) => (overlayRefs.current.explWrap = el)} className="leader-group">
          <div ref={(el) => (overlayRefs.current.drvDot = el)} className="anchor-dot" />
          <div ref={(el) => (overlayRefs.current.drvCard = el)} data-x={window.innerWidth * 0.12} data-y={window.innerHeight * 0.32} className="callout left" style={{ left: '4%', top: '32%' }}>
            <h4>40 mm Driver</h4>
            <p>Dual-neodymium ring magnet — deep, controlled bass to 20 Hz.</p>
          </div>
          <div ref={(el) => (overlayRefs.current.bafDot = el)} className="anchor-dot" />
          <div ref={(el) => (overlayRefs.current.bafCard = el)} data-x={window.innerWidth * 0.12} data-y={window.innerHeight * 0.62} className="callout left" style={{ left: '4%', top: '62%' }}>
            <h4>H1 + Sensors</h4>
            <p>Apple H1 chip, optical &amp; position sensors on flex assembly.</p>
          </div>
        </div>
      </div>

      {/* scroll story */}
      <main className="story">
        <section className="panel hero">
          <p className="eyebrow">Apple · AirPods Max</p>
          <h1 className="display"><span>AirPods Max</span></h1>
          <p className="sub">A perfect balance of exhilarating high-fidelity audio and effortless simplicity.</p>
          <div className="hud-row">
            <span className="hud glass">H1 chip</span>
            <span className="hud glass">ANC + Transparency</span>
            <span className="hud glass">40 mm drivers</span>
          </div>
          <span className="scroll-hint">Scroll to explore ↓</span>
        </section>

        <section id="colors" className="panel side">
          <div className="card glass">
            <p className="eyebrow">02 — Colorways</p>
            <h2>Five finishes.<br />One icon.</h2>
            <p>Anodized aluminum, knit canopy, cushions &amp; Smart Case morph live in PBR — Silver, Space Gray, Sky Blue, Pink, Green. Tap the swatches.</p>
            <div className="mini-swatches">
              {COLORWAYS.map((c) => (
                <button key={c.id} onClick={set(c.id)} className={`pill ${colorway.id === c.id ? 'on' : ''}`}>{c.name}</button>
              ))}
            </div>
          </div>
        </section>

        <section id="crown" className="panel side right">
          <div className="card glass">
            <p className="eyebrow">03 — Precision controls</p>
            <h2>Digital Crown,<br />macro close-up.</h2>
            <p>44 individually modeled knurls. Stainless arm, mic slits &amp; chamfered cup catch the sweeping studio key light as the crown spins.</p>
          </div>
        </section>

        <section id="knit" className="panel side">
          <div className="card glass">
            <p className="eyebrow">04 — Knit-mesh canopy</p>
            <h2>Breathable by design.</h2>
            <p>Diamond-knit canopy + memory-foam cushions with woven L / R acoustic mesh. Procedural albedo, bump &amp; perforation-alpha — zero pressure, all-day comfort.</p>
          </div>
        </section>

        <section id="detach" className="panel center">
          <div className="card glass wide">
            <p className="eyebrow">05 — Magnetic cushions</p>
            <h2>Detach. Reveal. Snap.</h2>
            <p>Cushions lift away to expose the perforated baffle &amp; magnetic ring — then snap home with a magnetic click.</p>
            <img src="/ref-detach.jpg" alt="Cushion detach reference" className="ref-thumb" onError={(e) => (e.target.style.display = 'none')} />
          </div>
        </section>

        <section id="engineered" className="panel side right">
          <div className="card glass">
            <p className="eyebrow">06 — Engineering exploded</p>
            <h2>Inside the sound.</h2>
            <p>Shell → H1 &amp; sensors → 40 mm dual-neodymium driver → baffle → cushion. Horizontally staged like the engineering render.</p>
            <img src="/ref-exploded.jpg" alt="Exploded reference" className="ref-thumb" onError={(e) => (e.target.style.display = 'none')} />
          </div>
        </section>

        <section id="case" className="panel finale">
          <div className="card glass wide">
            <p className="eyebrow">07 — Smart Case finale</p>
            <h2>Slip in. Sleep.</h2>
            <p>Cups swivel flat, glide into the color-matched Smart Case, flap folds shut — ultra-low-power mode on.</p>
            <div className="spec-grid">
              <div><b>20 hrs</b><span>ANC listening</span></div>
              <div><b>H1</b><span>each cup</span></div>
              <div><b>9 mics</b><span>ANC + voice</span></div>
              <div><b>385 g</b><span>balanced</span></div>
            </div>
            <div className="cta-row">
              <button className="buy-btn big">Buy AirPods Max — $549</button>
              <a className="ghost" href="#top">Back to top ↑</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
