# AirPods Max scroll showcase: working notes

## Stack and decisions
- Vite + vanilla Three.js + GSAP ScrollTrigger + Lenis. No external 3D, Spline, CDN, or HDRI downloads.
- Font: Inter Variable, bundled through @fontsource-variable/inter (SF Pro is Apple-only).
- Units are centimeters. The model is procedural: superellipsoid cups and cushions, a swept headband, extruded pill, knurled crown.
- Dimensions: height 187.3 mm and width 168.6 mm, from Apple's AirPods Max specifications page (the page lists the AirPods Max 2).
- Environment: PMREM prefiltered from emissive lightformers, built in code.
- Scroll progress p in [0, 1] drives one pure function, `evaluate(p)` in src/scene/choreography.js.
- Stages: hero 0.00, finish 0.12, controls 0.26, canopy 0.44, cushions 0.58, explode 0.72, case 0.88.
- Swatches scroll to their progress point. Swatch i sits at p = 0.12 + 0.14 * i / 4.

## Commands
- `npm run dev`: development server.
- `npm run build`: production build into dist/.
- `npm run shots`: serves dist/ in-process and captures frames with local Edge (SHOT_BROWSER overrides the path, SHOT_W/SHOT_H set the viewport, SHOT_PREFIX prefixes file names).
- `node scripts/check-timeline.mjs`: prints the choreography state at stage boundaries and checks the swatch mapping.
- `node scripts/geometry-check.mjs`: checks triangle winding against vertex normals.

## Verification done
- Build passes. Headless Edge shows no JavaScript errors.
- Screenshots checked at p = 0, 0.02, 0.33, 0.40, 0.50, 0.65, 0.76, 0.80, 0.85, 1.00 on desktop, and 0.02 and 0.50 at 390 x 844.
- Timeline and swatch mapping pass numerically.

## Known limits
- Procedural geometry approximates the reference photos. It is not Apple CAD.
- Smart Case flap is the lid itself, not a separate magnetic flap.
- Software GL runs slowly, so captures wait several seconds for the damped progress to settle.
- Not profiled on real GPUs or phones.
