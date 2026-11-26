// Numeric check of the scroll choreography: prints the state at stage boundaries
// and confirms each finish swatch lands on its own color index.
import { evaluate, STAGES, stageIndexOf } from '../src/scene/choreography.js';

const probes = [0, 0.12, 0.2, 0.26, 0.36, 0.44, 0.5, 0.58, 0.61, 0.64, 0.66, 0.7, 0.71, 0.72, 0.76, 0.8, 0.84, 0.88, 0.9, 0.92, 0.94, 0.97, 1];
const header = ['p', 'colorT', 'crown', 'detach', 'explode', 'swivel', 'headDrop', 'caseRise', 'lidOpen', 'yaw', 'dist', 'dark', 'stage'];
console.log(header.join('\t'));
for (const p of probes) {
  const s = evaluate(p);
  console.log([
    p.toFixed(2), s.colorT.toFixed(2), s.crownAngle.toFixed(2), s.detach.toFixed(3), s.explode.toFixed(2),
    s.swivel.toFixed(2), s.headDrop.toFixed(2), s.caseRise.toFixed(2), s.lidOpen.toFixed(2),
    s.yaw.toFixed(2), s.dist.toFixed(1), s.dark.toFixed(2), STAGES[stageIndexOf(p)].id,
  ].join('\t'));
}

let swatchOk = true;
for (let i = 0; i < 5; i++) {
  const p = 0.12 + (0.14 * i) / 4;
  const colorT = evaluate(p).colorT;
  if (Math.abs(colorT - i) > 1e-6) swatchOk = false;
  console.log(`swatch ${i}: p=${p.toFixed(4)} colorT=${colorT.toFixed(4)}`);
}
console.log(swatchOk ? 'swatch check: PASS' : 'swatch check: FAIL');
