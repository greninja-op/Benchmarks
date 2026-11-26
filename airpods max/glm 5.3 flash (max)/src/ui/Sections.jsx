/* ------------------------------------------------------------------ */
/*  DOM story sections — heights map 1:1 onto choreography windows.    */
/*  96 / 112 / 144 / 112 / 112 / 128 / 96 vh = 800vh total.            */
/* ------------------------------------------------------------------ */

export default function Sections() {
  return (
    <main className="sections">
      {/* Stage 1 — hero */}
      <section className="stage" style={{ height: '96vh' }}>
        <div className="block hero-block" data-rev>
          <p className="eyebrow">Introducing</p>
          <h1 className="display">AirPods&nbsp;Max</h1>
          <p className="lede">A perfect balance of high‑fidelity audio and the effortless magic of AirPods.</p>
        </div>
      </section>

      {/* Stage 2 — colorways */}
      <section className="stage" style={{ height: '112vh' }}>
        <div className="block right narrow" data-rev>
          <p className="eyebrow">Five finishes</p>
          <h2 className="headline">One obsession.</h2>
          <p className="body">
            Anodized aluminum, polished stainless steel and breathable knit —
            in <span className="finish-name" data-finish>Silver</span>, Space&nbsp;Gray, Sky&nbsp;Blue, Pink, and Green.
          </p>
        </div>
      </section>

      {/* Stage 3 — controls */}
      <section className="stage" style={{ height: '144vh' }}>
        <div className="block" data-rev>
          <p className="eyebrow">Precision controls</p>
          <h2 className="headline">Control, down<br />to the last detail.</h2>
          <p className="body">
            The Digital Crown and Noise Control button are cut at the micron scale —
            watch the knurled crown turn as the camera dives in.
          </p>
        </div>
      </section>

      {/* Stage 4 — knit */}
      <section className="stage" style={{ height: '112vh' }}>
        <div className="block" data-rev>
          <p className="eyebrow">Breathable by design</p>
          <h2 className="headline">Soft where it counts.</h2>
          <p className="body">
            A knit‑mesh canopy spans the headband, distributing weight across the top of
            your head. Memory‑foam ear cushions are wrapped in an acoustic woven textile
            with an inner knit mesh marked <em>L</em> and <em>R</em>.
          </p>
          <ul className="pill-row">
            <li>Knit‑mesh canopy</li>
            <li>Memory‑foam cushions</li>
            <li>Acoustic mesh</li>
          </ul>
        </div>
      </section>

      {/* Stage 5 — detach */}
      <section className="stage" style={{ height: '112vh' }}>
        <div className="block" data-rev>
          <p className="eyebrow">Magnetic docking</p>
          <h2 className="headline">Snap on.<br />Snap off.</h2>
          <p className="body">
            Ear cushions detach with a twist and glide back home — revealing the perforated
            speaker housing and magnetic connectors underneath.
          </p>
        </div>
      </section>

      {/* Stage 6 — exploded */}
      <section className="stage" style={{ height: '128vh' }}>
        <div className="block" data-rev>
          <p className="eyebrow">Engineering, exposed</p>
          <h2 className="headline">Built inside‑out.</h2>
          <p className="body">
            A custom acoustic design: high‑excursion 40&nbsp;mm drivers, H1 silicon, and
            computational audio — every layer engineered for sound you can feel.
          </p>
        </div>
      </section>

      {/* Stage 7 — Smart Case */}
      <section className="stage" style={{ height: '96vh' }}>
        <div className="block finale-block" data-rev>
          <p className="eyebrow">Smart Case</p>
          <h2 className="headline">Fits. Folded.<br />Protected.</h2>
          <div className="specs">
            <div className="spec"><b>384.8 g</b><span>Weight</span></div>
            <div className="spec"><b>168.6×187.3×83.0 mm</b><span>H × W × D</span></div>
            <div className="spec"><b>20 hr</b><span>Listening with ANC</span></div>
            <div className="spec"><b>40 mm</b><span>Custom driver</span></div>
            <div className="spec"><b>9</b><span>Microphones</span></div>
            <div className="spec"><b>H1</b><span>In each cup</span></div>
          </div>
          <div className="cta-row">
            <a className="cta" href="https://www.apple.com/shop/buy-airpods/airpods-max" target="_blank" rel="noreferrer">Buy</a>
            <a className="cta ghost" href="https://www.apple.com/airpods-max/" target="_blank" rel="noreferrer">Learn more</a>
          </div>
          <p className="footnote">
            Concept study — modeled &amp; lit entirely in code with WebGL, Three.js and custom
            PBR shaders. Not affiliated with Apple. AirPods Max is a trademark of Apple&nbsp;Inc.
          </p>
        </div>
      </section>
    </main>
  )
}
