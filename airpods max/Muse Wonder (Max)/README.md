# AirPods Max — Scroll-Driven 3D Product Showcase

A photorealistic, interactive product showcase for **Apple AirPods Max**, built
entirely in code — zero external 3D embeds, zero Spline dependencies.
The headset and its Smart Case are procedurally modelled in Three.js with
PBR materials, canvas-generated fabric/metal textures, and a custom
in-code studio HDRI (Drei `Lightformer` softboxes).

## Stack

- **React 18 + Vite 5**
- **Three.js / React Three Fiber / Drei** — PBR scene, PMREM studio env, contact shadows
- **GSAP** — hero entrance choreography
- **Lenis** — butter-smooth scroll, damped into a scroll-progress value that drives everything

## The 7 scroll stages (one persistent 3D model)

| Scroll | Stage | What happens |
|---|---|---|
| 0–12% | Hero | Front three-quarter studio pose, display type fade/mask reveal |
| 12–26% | Finishes | PBR colour morph across Silver · Space Gray · Sky Blue · Pink · Green (also click the floating swatches) |
| 26–44% | Controls | Macro push-in on the right cup; knurled Digital Crown rotates; SVG leader lines to glass callout cards |
| 44–58% | Comfort | Glide across the knit-mesh canopy into the cushion texture, woven L/R mesh |
| 58–72% | Magnetic cushions | Cushions unseat, reveal perforated baffle + magnetic ring, then snap back |
| 72–88% | Engineering | Exploded view: shell → H1/battery/flex → 40 mm ring-magnet driver → baffle → cushion |
| 88–100% | Smart Case | Cups swivel flat, colour-matched Smart Case rises, headphones descend, magnetic flap folds shut + specs & CTA |

Leader lines are locked to real 3D sockets every frame via `Vector3.project(camera)`,
so they track hardware at any viewport. Studio key/rim lights orbit with scroll so
specular highlights glide across the anodised cups.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the production build
```

Deep-link any stage for review: `/?p=0.65` jumps to 65% scroll.

Screenshot helper (uses system Chrome + puppeteer-core):

```bash
node scripts/shots.mjs
```
