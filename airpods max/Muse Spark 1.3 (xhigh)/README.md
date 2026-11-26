# AirPods Max — Scroll-Driven 3D Showcase

A photorealistic, interactive product showcase for **Apple AirPods Max**,
built **entirely in code** — a single persistent Three.js model driven by
scroll. No Spline, no 3D embeds, no external model files. All geometry,
PBR textures, lighting and choreography are generated procedurally.

## Stack

- **Three.js r160** (ESM via importmap, CDN) + **WebGL2**
- **Procedural PBR**: canvas-generated textures (bead-blasted aluminum
  normal map, diamond-knit weave albedo/bump, perforation alpha,
  microfiber grain, acoustic mesh) — zero image assets
- **Custom studio HDRI**: PMREM-baked softbox room + dynamic key/rim
  lights, ACES filmic tone mapping, PCFSoft contact shadows
- **Scroll choreography**: smoothed-progress (Lenis-style lerp, 0.08)
  keyframe camera path + feature stages, mouse parallax, SVG leader
  lines projected from live 3D anchors (`Vector3.project`)

## The 7 stages (one model, scroll-scrubbed)

| Scroll | Stage | What happens |
|---|---|---|
| 0–12% | Hero | Front three-quarter studio pose, display type reveal |
| 12–26% | Colourway morph | Slow orbit; PBR colors interpolate Silver / Space Gray / Sky Blue / Pink / Green (swatches also clickable) |
| 26–44% | Crown macro | Camera pushes to right cup; knurled Digital Crown rotates; leader lines → Digital Crown + Noise Control callouts |
| 44–58% | Knit macro | Camera glides over canopy into ear-cushion mesh macro |
| 58–72% | Cushion detach | Both cushions unseat (revealing perforated baffle + magnetic connectors) then snap back |
| 72–88% | Exploded view | Shell / H1 chip / 40 mm driver / baffle / cushion fan out horizontally with technical callouts, then reassemble |
| 88–100% | Smart Case finale | Cups swivel flat, headphones lower into the color-matched Smart Case, magnetic flap folds shut |

## Run it

```powershell
cd C:\Users\knava\Downloads\dshspark
python -m http.server 8123
# open http://127.0.0.1:8123
```

> The page loads Three.js from the jsDelivr CDN (importmap) — internet
> access required on first load. Everything else is local.

## Files

- [index.html](index.html) — page shell, 7 stage sections, swatches, leader-line SVG
- [css/style.css](css/style.css) — Apple-grade minimalism, glass HUD, reveal system
- [js/main.js](js/main.js) — boot + model adapter (colorway smoothing, anchors, case fit)
- [js/scene.js](js/scene.js) — renderer, PMREM studio env, lights, dust, ground shadow
- [js/textures.js](js/textures.js) — procedural canvas texture factory
- [js/headphones.js](js/headphones.js) — 19-part AirPods Max + Smart Case model (106 meshes)
- [js/choreography.js](js/choreography.js) — 7-stage scroll engine, leader lines, colorways
