import type { CalloutSpec } from '../types/showcase';

export interface StageDescriptor {
  index: number;
  id: string;
  label: string;
  start: number;
  end: number;
  eyebrow: string;
  headline: string;
  description: string;
}

export const STAGES: StageDescriptor[] = [
  {
    index: 0,
    id: 'hero',
    label: 'Overview',
    start: 0.0,
    end: 0.12,
    eyebrow: 'Apple Acoustic Architecture',
    headline: 'AirPods Max',
    description:
      'High-fidelity audio reimagined from cushion to canopy. Sculpted from anodized aluminum, stainless steel, and custom-woven acoustic mesh.',
  },
  {
    index: 1,
    id: 'finishes',
    label: 'Finishes',
    start: 0.12,
    end: 0.26,
    eyebrow: 'Five Signature Finishes',
    headline: 'Color, anodized in light.',
    description:
      'Bead-blasted aluminum ear cups, color-matched canopy mesh, and soft-touch headband sleeves shift effortlessly across five distinct studio finishes.',
  },
  {
    index: 2,
    id: 'controls',
    label: 'Controls',
    start: 0.26,
    end: 0.44,
    eyebrow: 'Precision Tactile Input',
    headline: 'Every turn, calibrated.',
    description:
      'Machined with micro-knurled ridges, the Digital Crown delivers exact volume and playback control alongside a dedicated Noise Control switch.',
  },
  {
    index: 3,
    id: 'textiles',
    label: 'Materials',
    start: 0.44,
    end: 0.58,
    eyebrow: 'Zero-Pressure Comfort',
    headline: 'Breathable knit. Acoustic seal.',
    description:
      'A suspended knit-mesh canopy distributes weight evenly, while diamond-woven memory-foam cushions enclose an acoustically transparent L/R inner weave.',
  },
  {
    index: 4,
    id: 'magnetic',
    label: 'Magnetic',
    start: 0.58,
    end: 0.72,
    eyebrow: 'Modular Engineering',
    headline: 'Snap-fit acoustic precision.',
    description:
      'Each ear cushion locks onto the anodized housing via precision-aligned magnets, concealing a honeycomb-perforated acoustic baffle.',
  },
  {
    index: 5,
    id: 'exploded',
    label: 'Architecture',
    start: 0.72,
    end: 0.88,
    eyebrow: 'Internal Acoustic Stack',
    headline: 'Computational audio, laid bare.',
    description:
      'An Apple-designed 40mm dual-neodymium ring magnet driver, dual H1 chips, and nine microphones work in concert at 9 billion operations per second.',
  },
  {
    index: 6,
    id: 'smart-case',
    label: 'Smart Case',
    start: 0.88,
    end: 1.0,
    eyebrow: 'Ultra-Low-Power State',
    headline: 'Folded. Protected. Always ready.',
    description:
      'Ear cups swivel flat into the contoured soft-touch Smart Case, snapping the magnetic flap shut to preserve charge automatically.',
  },
];

export const CONTROL_CALLOUTS: CalloutSpec[] = [
  {
    id: 'callout-crown',
    anchorId: 'crownAnchor',
    stage: 2,
    title: 'Digital Crown',
    subtitle: 'Knurled Machined Aluminum',
    detail: 'Rotate for exact volume · Press once to play/pause · Double-press to skip · Hold for Siri',
    side: 'left',
    offsetX: -220,
    offsetY: -78,
  },
  {
    id: 'callout-noise',
    anchorId: 'noiseBtnAnchor',
    stage: 2,
    title: 'Noise Control Button',
    subtitle: 'Flush Tactile Switch',
    detail: 'Single press toggles seamlessly between Active Noise Cancellation and Transparency mode',
    side: 'right',
    offsetX: 205,
    offsetY: -46,
  },
];

export const EXPLODED_CALLOUTS: CalloutSpec[] = [
  {
    id: 'exp-shell',
    anchorId: 'explodedShellAnchor',
    stage: 5,
    title: 'Anodized Aluminum Cup',
    subtitle: 'CNC-Milled Chassis',
    detail: 'Bead-blasted acoustic enclosure with independent stainless-steel pivot articulation',
    side: 'left',
    offsetX: -125,
    offsetY: -135,
  },
  {
    id: 'exp-h1',
    anchorId: 'explodedH1Anchor',
    stage: 5,
    title: 'Apple H1 & Sensor Array',
    subtitle: '10 Audio Cores per Ear',
    detail: 'Adaptive EQ, optical position detection, and real-time Active Noise Cancellation',
    side: 'left',
    offsetX: -48,
    offsetY: 145,
  },
  {
    id: 'exp-driver',
    anchorId: 'explodedDriverAnchor',
    stage: 5,
    title: '40mm Dynamic Driver',
    subtitle: 'Dual-Neodymium Ring Magnet',
    detail: 'Ultra-low distortion (<1% THD) across the entire audible frequency spectrum',
    side: 'right',
    offsetX: 12,
    offsetY: -145,
  },
  {
    id: 'exp-baffle',
    anchorId: 'explodedBaffleAnchor',
    stage: 5,
    title: 'Acoustic Baffle & Grille',
    subtitle: 'Honeycomb Vent Array',
    detail: 'Precision-tuned cavity with magnetic alignment pins and optical ear sensor',
    side: 'right',
    offsetX: 75,
    offsetY: 142,
  },
  {
    id: 'exp-cushion',
    anchorId: 'explodedCushionAnchor',
    stage: 5,
    title: 'Magnetic Knit Cushion',
    subtitle: 'Acoustically Engineered Foam',
    detail: 'Custom diamond-weave textile creates an immersive passive acoustic seal',
    side: 'right',
    offsetX: 138,
    offsetY: -102,
  },
];
