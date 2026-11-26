export interface ColorwaySpec {
  id: 'silver' | 'space-gray' | 'sky-blue' | 'pink' | 'green';
  name: string;
  tagline: string;
  aluminum: string;
  aluminumRoughness: number;
  aluminumMetalness: number;
  canopy: string;
  headbandSleeve: string;
  cushion: string;
  innerMesh: string;
  innerLetter: string;
  baffle: string;
  smartCase: string;
  smartCaseInner: string;
  swatchPrimary: string;
  swatchSecondary: string;
  bgTop: string;
  bgBottom: string;
  uiAccent: string;
}

export const COLORWAYS: ColorwaySpec[] = [
  {
    id: 'silver',
    name: 'Silver',
    tagline: 'Pure bead-blasted aluminum with crisp white acoustic knit.',
    aluminum: '#dfe2e7',
    aluminumRoughness: 0.23,
    aluminumMetalness: 0.92,
    canopy: '#f3f4f6',
    headbandSleeve: '#f5f6f8',
    cushion: '#eceef2',
    innerMesh: '#dfe2e8',
    innerLetter: '#b6bcc8',
    baffle: '#cfd4dc',
    smartCase: '#ebedf0',
    smartCaseInner: '#d8dce3',
    swatchPrimary: '#d9dde3',
    swatchSecondary: '#f5f6f8',
    bgTop: '#fbfbfd',
    bgBottom: '#ebedf2',
    uiAccent: '#1d1d1f',
  },
  {
    id: 'space-gray',
    name: 'Space Gray',
    tagline: 'Deep graphite anodized shell paired with obsidian mesh.',
    aluminum: '#4b4e54',
    aluminumRoughness: 0.25,
    aluminumMetalness: 0.92,
    canopy: '#26282c',
    headbandSleeve: '#2b2d32',
    cushion: '#31343a',
    innerMesh: '#23252a',
    innerLetter: '#555963',
    baffle: '#2a2d33',
    smartCase: '#2b2d32',
    smartCaseInner: '#1f2024',
    swatchPrimary: '#4b4e54',
    swatchSecondary: '#25272b',
    bgTop: '#f6f6f8',
    bgBottom: '#e3e5eb',
    uiAccent: '#1d1d1f',
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    tagline: 'Ice-blue anodized aluminum with deep cerulean textile weave.',
    aluminum: '#9cb4c9',
    aluminumRoughness: 0.23,
    aluminumMetalness: 0.92,
    canopy: '#365875',
    headbandSleeve: '#395b78',
    cushion: '#6d8aa3',
    innerMesh: '#4c6b86',
    innerLetter: '#87a4bd',
    baffle: '#516d85',
    smartCase: '#2d5370',
    smartCaseInner: '#213f57',
    swatchPrimary: '#9cb4c9',
    swatchSecondary: '#365875',
    bgTop: '#f5f9fc',
    bgBottom: '#e2ebf3',
    uiAccent: '#1f496b',
  },
  {
    id: 'pink',
    name: 'Pink',
    tagline: 'Warm blush anodized finish with coral-rose woven cushions.',
    aluminum: '#e4beb9',
    aluminumRoughness: 0.23,
    aluminumMetalness: 0.92,
    canopy: '#c96d68',
    headbandSleeve: '#cf746f',
    cushion: '#d99893',
    innerMesh: '#bf7974',
    innerLetter: '#e5b2ae',
    baffle: '#b87672',
    smartCase: '#c86c66',
    smartCaseInner: '#9e504b',
    swatchPrimary: '#e4beb9',
    swatchSecondary: '#c96d68',
    bgTop: '#fdf7f6',
    bgBottom: '#f3e5e4',
    uiAccent: '#99433e',
  },
  {
    id: 'green',
    name: 'Green',
    tagline: 'Celadon mist aluminum balanced by alpine sage knit fabric.',
    aluminum: '#b9cbb8',
    aluminumRoughness: 0.23,
    aluminumMetalness: 0.92,
    canopy: '#677d69',
    headbandSleeve: '#6f8671',
    cushion: '#95ab96',
    innerMesh: '#718873',
    innerLetter: '#b0c4b1',
    baffle: '#6d826f',
    smartCase: '#5e7660',
    smartCaseInner: '#455947',
    swatchPrimary: '#b9cbb8',
    swatchSecondary: '#677d69',
    bgTop: '#f6faf6',
    bgBottom: '#e4ede4',
    uiAccent: '#3d5740',
  },
];

export interface LeaderCalloutSpec {
  id: string;
  stage: 'crown' | 'exploded';
  socketKey: string;
  title: string;
  subtitle: string;
  detail: string;
  side: 'left' | 'right';
  offsetY: number;
}

export const LEADER_CALLOUTS: LeaderCalloutSpec[] = [
  {
    id: 'digital-crown',
    stage: 'crown',
    socketKey: 'crownSocket',
    title: 'Digital Crown',
    subtitle: '84 Radial Micro-Knurls',
    detail: 'Turn for ultra-fine volume control. Press once to play, pause, or answer calls; twice to skip forward; hold for Siri.',
    side: 'left',
    offsetY: -90,
  },
  {
    id: 'noise-control',
    stage: 'crown',
    socketKey: 'ancButtonSocket',
    title: 'Noise Control Button',
    subtitle: 'Flush Tactile Switch',
    detail: 'Instantly toggle between industry-leading Active Noise Cancellation and natural Transparency mode.',
    side: 'right',
    offsetY: -65,
  },
  {
    id: 'beamforming-mic',
    stage: 'crown',
    socketKey: 'upperMicSocket',
    title: 'Acoustic Vent & Mic',
    subtitle: 'Nine-Microphone Array',
    detail: 'Six outward-facing and two inward-facing mics isolate voice and cancel wind & environmental noise 200x per second.',
    side: 'left',
    offsetY: 85,
  },
  {
    id: 'exp-shell',
    stage: 'exploded',
    socketKey: 'expShellSocket',
    title: 'Anodized Aluminum Cup',
    subtitle: 'CNC Unibody + Gimbal',
    detail: 'Bead-blasted aluminum housing suspended on a revolutionary stainless-steel pivot mechanism that balances pressure.',
    side: 'left',
    offsetY: -125,
  },
  {
    id: 'exp-h1',
    stage: 'exploded',
    socketKey: 'expH1Socket',
    title: 'Apple H1 SiP & Sensors',
    subtitle: '10 Audio Cores • 9B Ops/sec',
    detail: 'Dual H1 chips power Adaptive EQ, Personalized Spatial Audio, optical wear detection, and gyroscope head tracking.',
    side: 'left',
    offsetY: 110,
  },
  {
    id: 'exp-driver',
    stage: 'exploded',
    socketKey: 'expDriverSocket',
    title: '40mm Dynamic Driver',
    subtitle: 'Dual-Neodymium Ring Magnet',
    detail: 'Modeled after floor-standing speakers to keep total harmonic distortion below 1% even at maximum volume.',
    side: 'right',
    offsetY: -130,
  },
  {
    id: 'exp-baffle',
    stage: 'exploded',
    socketKey: 'expBaffleSocket',
    title: 'Acoustic Baffle Chassis',
    subtitle: 'Magnetic Array + Honeycomb Grille',
    detail: 'Precision-ported polymer plate couples the driver output while seating the ear cushion with neodymium magnets.',
    side: 'right',
    offsetY: 10,
  },
  {
    id: 'exp-cushion',
    stage: 'exploded',
    socketKey: 'expCushionSocket',
    title: 'Memory Foam Cushion',
    subtitle: '3D Acoustic Knit Weave',
    detail: 'Acoustically engineered viscoelastic foam creates an immersive seal that adapts to unique head contours.',
    side: 'right',
    offsetY: 135,
  },
];

export interface StageDefinition {
  index: number;
  id: string;
  label: string;
  range: [number, number];
}

export const STAGES: StageDefinition[] = [
  { index: 1, id: 'hero', label: 'Overview', range: [0.0, 0.12] },
  { index: 2, id: 'colors', label: 'Five Finishes', range: [0.12, 0.26] },
  { index: 3, id: 'controls', label: 'Precision Controls', range: [0.26, 0.44] },
  { index: 4, id: 'mesh', label: 'Acoustic Textile', range: [0.44, 0.58] },
  { index: 5, id: 'detach', label: 'Magnetic Cushions', range: [0.58, 0.72] },
  { index: 6, id: 'exploded', label: 'Internal Architecture', range: [0.72, 0.88] },
  { index: 7, id: 'case', label: 'Smart Case', range: [0.88, 1.0] },
];
