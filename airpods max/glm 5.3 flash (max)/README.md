# AirPods Max — Concept Showcase

A photorealistic, scroll-driven product site for **Apple AirPods Max**, modeled
and lit entirely in code — no external 3D embeds, no Spline, no downloaded
assets. Zero-geometry-fudge: every chamfer, cushion ring and knurl is
parametric.

## Stack

- **Vite + React 18**
- **Three.js + React Three Fiber + Drei** — WebGL2 renderer, `ACESFilmic` tone
  mapping, PMREM studio environment built from Lightformer softboxes
- **GSAP ScrollTrigger** — scrubbed section reveals
- **Lenis** — inertial smooth scrolling feeding one master progress value

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the production build
```

## How it works

| Path | Role |
| --- | --- |
| `src/store.js` | Shared render-state store + colorway palette + track/window math |
| `src/util.js` | Superellipse lofting, cushion-ring builder, headband arc curves |
| `src/textures.js` | Procedural canvas PBR maps: knit weave, canopy perforation, L/R acoustic mesh, aluminum micro-grain, case grain, perforated baffle |
| `src/scene/materials.js` | Central PBR material registry + damped 5-colorway morph |
| `src/scene/AirpodsMax.jsx` | The device: headband + knit canopy, telescoping arms, aluminum cups, baffle with magnetic pins, 40 mm driver, H1 board, knurled crown, noise-control button, cushions |
| `src/scene/SmartCase.jsx` | Smart Case with articulated magnetic flap |
| `src/scene/Scene.jsx` | One `useFrame` pipeline: choreography → transforms → anchor projection → camera → dynamic studio lights |
| `src/choreo.js` | 7-stage scroll choreography (camera segments + all scalar tracks) |
| `src/ui/Hud.jsx` | 3D→2D-projected leader lines, callout cards, floating swatches |
| `src/ui/Sections.jsx` | Editorial copy sections (heights map 1:1 onto stage windows) |

### Scroll stages (single persistent model)

1. **0–12%** Hero entrance, front three-quarter pose
2. **12–26%** Colorway turntable — PBR colors morph across Silver / Space Gray / Sky Blue / Pink / Green (also clickable via floating swatches)
3. **26–44%** Macro dives on the Digital Crown (knurl visibly rotates) and Noise Control button with projected leader-line callouts
4. **44–58%** Canopy glide + ear-cushion weave macro (inner acoustic mesh, "L")
5. **58–72%** Magnetic cushion detach → drift → snap-back with overshoot
6. **72–88%** Horizontal exploded view (shell → chassis → H1 board → driver → baffle → cushion) with callouts, then reassembly
7. **88–100%** Cups swivel flat, Smart Case rises, magnetic flap opens/closes with a snap; specs grid + CTA

Leader lines are projected from live 3D anchor sockets (`Vector3.project`) so
they stay locked to the hardware at any viewport size.

## Verification

`node smoke.mjs` builds every procedural geometry headlessly and sweeps the
full choreography (1001 scroll samples) asserting finite values.

*Concept study. Not affiliated with Apple.*
