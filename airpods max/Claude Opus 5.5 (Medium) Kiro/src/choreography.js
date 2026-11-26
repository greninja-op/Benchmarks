// Single scrubbed GSAP timeline. Duration 100 == 0..100 % of page scroll.
import gsap from 'gsap';

export const S = {
  // camera orbit (world space)
  tx: 0, ty: 0.42, tz: 0, az: 0.42, el: 0.1, dist: 6.3, shiftX: 0, shiftY: -0.11,
  // lighting
  envRot: 0, lightAz: 0.6, dark: 0,
  // product state
  color: 0, crown: 0, ext: 0, lift: 0, snap: 0, explode: 0, ghost: 0,
  swivel: 0, rise: 0, caseRise: 0, flap: 0,
  // UI
  callCrown: 0, callExplode: 0,
};

// time at which each colorway is fully shown during stage 2
export const COLOR_TIMES = [13.5, 16.6, 19.2, 21.8, 24.4];

export const STAGES = [
  { id: 'hero', label: 'Design', at: 0 },
  { id: 'color', label: 'Colors', at: 13 },
  { id: 'crown', label: 'Controls', at: 34 },
  { id: 'knit', label: 'Comfort', at: 50 },
  { id: 'magnet', label: 'Cushions', at: 64 },
  { id: 'explode', label: 'Engineering', at: 80 },
  { id: 'case', label: 'Smart Case', at: 99 },
];

export function buildTimeline() {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const at = (t, d, vars, ease) => tl.to(S, { ...vars, duration: d, ...(ease ? { ease } : {}) }, t);

  // 1. Hero (0-12): slow studio orbit, highlights drift
  at(0, 12, { az: 0.62, el: 0.14, dist: 5.3 }, 'none');
  at(9, 5, { shiftY: 0 });
  at(0, 12, { envRot: 0.5, lightAz: 0.9 }, 'none');

  // 2. Colorways (12-26): product slides left, turntable
  at(12, 3.5, { shiftX: 0.17, dist: 5.6, el: 0.06, az: -0.5 });
  at(15.5, 10.5, { az: 0.4 }, 'none');
  at(12, 14, { envRot: 1.6, lightAz: 1.6 }, 'none');
  for (let k = 0; k < 4; k++) at(COLOR_TIMES[k + 1] - 1.9, 1.9, { color: k + 1 }, 'power1.inOut');

  // 3. Digital Crown + Noise Control macro (26-44)
  at(26, 6, { tx: 0.76, ty: 0.36, tz: 0.05, az: 1.0, el: 0.42, dist: 1.95, shiftX: -0.06 }, 'power3.inOut');
  at(26, 17, { envRot: 3.2, lightAz: 2.8 }, 'none');
  at(28.5, 14, { crown: Math.PI * 4 }, 'power1.inOut');
  at(32, 10.5, { az: 0.8, el: 0.36, dist: 1.75 }, 'none');
  at(33, 3, { callCrown: 1 });
  at(41, 2, { callCrown: 0 });

  // 4. Canopy glide + knit macro (44-58)
  at(43, 5, { tx: 0.12, ty: 1.12, tz: 0, az: 0.35, el: -0.5, dist: 2.2, shiftX: -0.14 }, 'power3.inOut');
  at(43, 15, { envRot: 4.4, lightAz: 3.6 }, 'none');
  at(45, 4, { ext: 0.1 });
  at(48, 3, { tx: -0.2, az: 0.15 }, 'none');
  at(51, 5, { tx: 0.6, ty: 0.0, tz: 0.0, az: -1.2, el: 0.12, dist: 1.2 }, 'power2.inOut');
  at(56, 2, { dist: 1.1 }, 'none');

  // 5. Magnetic cushion detach & snap (58-72)
  at(58, 4, { tx: 0.45, ty: 0.02, tz: 0.0, az: -0.55, el: 0.2, dist: 3.0, shiftX: 0.06, shiftY: 0.07 }, 'power3.inOut');
  at(58, 3, { ext: 0 });
  at(58, 14, { envRot: 5.2, lightAz: 4.4 }, 'none');
  at(61.5, 3.5, { lift: 1 }, 'power2.inOut');
  at(65, 3, { az: -0.7 }, 'none');
  at(67.5, 2.4, { lift: 0 }, 'power3.in');
  at(69.9, 1.2, { snap: 1 }, 'none');

  // 6. Exploded engineering view (72-88)
  at(71, 3, { dark: 1 });
  at(72, 3, { ghost: 1 });
  at(72, 4, { tx: 0.24, ty: 0.02, tz: 0.06, az: 0.62, el: 0.14, dist: 3.9, shiftX: 0, shiftY: -0.04 }, 'power3.inOut');
  at(72, 16, { envRot: 6.4, lightAz: 5.4 }, 'none');
  at(75, 5.5, { explode: 1 }, 'power2.inOut');
  at(76, 9, { az: 0.82, el: 0.2 }, 'none');
  at(79.5, 2, { callExplode: 1 });
  at(84, 1.2, { callExplode: 0 });
  at(84.5, 4, { explode: 0 }, 'power2.inOut');
  at(87, 2.5, { ghost: 0, dark: 0 });

  // 7. Smart Case finale (88-100)
  at(88.5, 3.5, { tx: 0, ty: 0.2, tz: 0, az: 0, el: 0.12, dist: 7.6, shiftY: -0.02 }, 'power3.inOut');
  at(88, 12, { envRot: 6.9, lightAz: 6.2 }, 'none');
  at(89, 3, { swivel: 1 });
  at(90, 2.5, { rise: 0.85 });
  at(91, 3.5, { caseRise: 1 }, 'power2.out');
  at(94, 2.6, { rise: -0.25 }, 'power2.inOut');
  at(96.4, 2.6, { flap: 1 }, 'power2.inOut');
  at(99.9, 0.1, {}, 'none');
  return tl;
}
