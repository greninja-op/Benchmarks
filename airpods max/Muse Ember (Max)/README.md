# AirPods Max — Photorealistic Scroll Showcase

React + Vite + Three.js (R3F + Drei) + Lenis. Single persistent procedural 3D model, zero external 3D embeds.

## Run

```powershell
cd airpods-max-showcase
npm install
npm run dev    # http://localhost:5173
npm run build  # production → dist/
```

## What's inside

- `src/three/AirPodsMaxModel.jsx` — hierarchical parametric AirPods Max: arched headband (TubeGeometry),
  perforated knit canopy (procedural alpha), anodized aluminum cups (RoundedBox + micro-grain PBR),
  chrome telescoping arms, 44-ridge Digital Crown (rotates on scroll zoom), Noise pill, mic slits,
  magnetic rings, perforated baffle, 40 mm dual-magnet driver, H1/flex electronics, L/R acoustic mesh,
  Smart Case with articulated flap.
- `src/three/textures.js` — procedural canvas textures: diamond knit (albedo+bump), bead-blasted grain
  (bump+roughness), canopy perforation alpha, L/R acoustic mesh, baffle holes, leather grain.
- `src/three/Scene.jsx` — studio HDRI (Lightformer softboxes) + animated key/rim lights (speculars glide
  with scroll), ACES tone mapping, contact shadows, 7-stage camera choreography, detach/explode/case
  animation, `Vector3.project(camera)` leader lines.
- `src/components/Overlay.jsx` — Apple-minimal editorial UI: nav, swatches, 7 story panels, SVG callouts,
  spec grid + CTA.
- Reference frames from your WhatsApp images are copied to `public/ref-*.jpg` and shown in context
  (detach + exploded panels).

## Scroll map

1. 0–12% hero entrance · 2. 12–26% colorway morph (auto-cycles + clickable swatches) ·
3. 26–44% crown macro + leader lines · 4. 44–58% knit/canopy macro ·
5. 58–72% cushion detach/snap · 6. 72–88% exploded view + callouts · 7. 88–100% Smart Case finale.
