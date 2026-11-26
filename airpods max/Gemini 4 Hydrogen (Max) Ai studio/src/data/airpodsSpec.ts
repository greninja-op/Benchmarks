export type ColorwayId = 'silver' | 'space-gray' | 'sky-blue' | 'pink' | 'green';

export interface AirPodsColorway {
  id: ColorwayId;
  name: string;
  swatchHex: string;
  swatchRingHex: string;
  aluminum: string;
  headband: string;
  canopy: string;
  cushion: string;
  innerMesh: string;
  baffleRing: string;
  smartCase: string;
  accentText: string;
}

export const AIRPODS_COLORWAYS: AirPodsColorway[] = [
  {
    id: 'silver',
    name: 'Silver',
    swatchHex: '#e3e4e6',
    swatchRingHex: '#b8bbc2',
    aluminum: '#dfe1e5',
    headband: '#eceef0',
    canopy: '#f0f1f4',
    cushion: '#e4e6ea',
    innerMesh: '#c7cad0',
    baffleRing: '#3b3d42',
    smartCase: '#dcdde0',
    accentText: '#1d1d1f',
  },
  {
    id: 'space-gray',
    name: 'Space Gray',
    swatchHex: '#4b4e54',
    swatchRingHex: '#2f3136',
    aluminum: '#4c4f56',
    headband: '#35373c',
    canopy: '#3d4046',
    cushion: '#3c3f45',
    innerMesh: '#23252a',
    baffleRing: '#202226',
    smartCase: '#2d2f34',
    accentText: '#1d1d1f',
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    swatchHex: '#7da1be',
    swatchRingHex: '#4b7191',
    aluminum: '#9eb6ca',
    headband: '#2b4d6d',
    canopy: '#396085',
    cushion: '#60809e',
    innerMesh: '#24415b',
    baffleRing: '#283645',
    smartCase: '#234666',
    accentText: '#1e3f5c',
  },
  {
    id: 'pink',
    name: 'Pink',
    swatchHex: '#e39a95',
    swatchRingHex: '#c36863',
    aluminum: '#e5a7a2',
    headband: '#cf5a57',
    canopy: '#da7370',
    cushion: '#de8783',
    innerMesh: '#ad4846',
    baffleRing: '#492b2c',
    smartCase: '#c85452',
    accentText: '#8c3331',
  },
  {
    id: 'green',
    name: 'Green',
    swatchHex: '#93ad97',
    swatchRingHex: '#5f7d65',
    aluminum: '#a4b9a8',
    headband: '#58765f',
    canopy: '#6a8971',
    cushion: '#7e9a83',
    innerMesh: '#47614c',
    baffleRing: '#2a372d',
    smartCase: '#547059',
    accentText: '#2f4d36',
  },
];

export interface ScrollStage {
  id: string;
  index: number;
  label: string;
  kicker: string;
  title: string;
  description: string;
  start: number;
  end: number;
  targetScroll: number;
  alignment: 'left' | 'right' | 'center-top' | 'center-bottom';
  metrics?: { label: string; value: string }[];
}

export const SCROLL_STAGES: ScrollStage[] = [
  {
    id: 'hero',
    index: 0,
    label: 'Overview',
    kicker: '01. Over-Ear Acoustic Architecture',
    title: 'AirPods Max',
    description:
      'A radically reimagined acoustic instrument. Anodized aluminum cups suspended from a breathable knit-mesh canopy deliver studio-grade fidelity.',
    start: 0.0,
    end: 0.12,
    targetScroll: 0.0,
    alignment: 'center-top',
    metrics: [
      { label: 'Driver', value: '40 mm' },
      { label: 'Chips', value: 'Dual H1' },
      { label: 'Weight', value: '384.8 g' },
    ],
  },
  {
    id: 'finishes',
    index: 1,
    label: 'Finishes',
    kicker: '02. Five Signature Finishes',
    title: 'Anodized to Precision',
    description:
      'Bead-blasted aluminum shells, color-matched stainless steel sleeves, and custom-dyed acoustic textiles morph seamlessly across every finish.',
    start: 0.12,
    end: 0.26,
    targetScroll: 0.19,
    alignment: 'left',
    metrics: [
      { label: 'Shell', value: 'Anodized Al' },
      { label: 'Arms', value: '316L Steel' },
    ],
  },
  {
    id: 'controls',
    index: 2,
    label: 'Controls',
    kicker: '03. Tactile Precision',
    title: 'Digital Crown & Noise Control',
    description:
      'Precision-machined radial knurling gives tactile volume control, playback navigation, and instant switching between Active Noise Cancellation and Transparency.',
    start: 0.26,
    end: 0.44,
    targetScroll: 0.35,
    alignment: 'left',
    metrics: [
      { label: 'Mics', value: '9 Total' },
      { label: 'ANC', value: '48,000 Hz' },
    ],
  },
  {
    id: 'textile',
    index: 3,
    label: 'Canopy',
    kicker: '04. Zero-Pressure Fit',
    title: 'Breathable Knit-Mesh',
    description:
      'Open-weave canopy mesh distributes weight evenly while 3D diamond-knit memory foam cushions form an acoustically engineered seal.',
    start: 0.44,
    end: 0.58,
    targetScroll: 0.51,
    alignment: 'right',
    metrics: [
      { label: 'Canopy', value: 'Tension Knit' },
      { label: 'Seal', value: 'Memory Foam' },
    ],
  },
  {
    id: 'detach',
    index: 4,
    label: 'Seal',
    kicker: '05. Modular Acoustics',
    title: 'Magnetic Ear Cushions',
    description:
      'Self-aligning magnetic mounts lock cushions flush to the perforated acoustic baffle, making swaps and acoustic alignment effortless.',
    start: 0.58,
    end: 0.72,
    targetScroll: 0.65,
    alignment: 'left',
    metrics: [
      { label: 'Mount', value: 'Magnetic Pins' },
      { label: 'Sensors', value: 'Optical Wear' },
    ],
  },
  {
    id: 'exploded',
    index: 5,
    label: 'Exploded',
    kicker: '06. Internal Engineering',
    title: 'Acoustic Stack',
    description:
      'Dual-neodymium ring magnet driver, dedicated 10-core Apple H1 audio processor, and sculpted acoustic chamber work in harmonic lockstep.',
    start: 0.72,
    end: 0.88,
    targetScroll: 0.80,
    alignment: 'center-top',
    metrics: [
      { label: 'THD', value: '< 1% @ 100dB' },
      { label: 'Eq', value: 'Adaptive' },
    ],
  },
  {
    id: 'smart-case',
    index: 6,
    label: 'Smart Case',
    kicker: '07. Ultra-Low-Power State',
    title: 'The Smart Case',
    description:
      'Ear cups rotate flat and glide into the soft-touch microfiber Smart Case, magnetically folding shut to preserve up to 20 hours of listening.',
    start: 0.88,
    end: 1.0,
    targetScroll: 0.985,
    alignment: 'left',
    metrics: [
      { label: 'Battery', value: '20 hrs' },
      { label: 'Quick Charge', value: '5 min = 1.5 hr' },
    ],
  },
];

export interface CalloutSpec {
  id: string;
  anchorKey:
    | 'crown'
    | 'noiseButton'
    | 'micSlit'
    | 'expShell'
    | 'expElectronics'
    | 'expDriver'
    | 'expBaffle'
    | 'expCushion';
  stage: 'controls' | 'exploded';
  title: string;
  detail: string;
  offsetX: number;
  offsetY: number;
}

export const CALLOUT_SPECS: CalloutSpec[] = [
  {
    id: 'callout-crown',
    anchorKey: 'crown',
    stage: 'controls',
    title: 'Digital Crown',
    detail: 'Rotate for volume · Press for play/pause, skip & Siri',
    offsetX: 165,
    offsetY: -125,
  },
  {
    id: 'callout-noise',
    anchorKey: 'noiseButton',
    stage: 'controls',
    title: 'Noise Control Button',
    detail: 'Toggle Active Noise Cancellation & Transparency mode',
    offsetX: 185,
    offsetY: -20,
  },
  {
    id: 'callout-mic',
    anchorKey: 'micSlit',
    stage: 'controls',
    title: 'Beamforming Microphone',
    detail: 'Isolates voice from ambient wind & acoustic noise',
    offsetX: -235,
    offsetY: 55,
  },
  {
    id: 'callout-exp-shell',
    anchorKey: 'expShell',
    stage: 'exploded',
    title: 'Anodized Aluminum Cup',
    detail: 'CNC-milled enclosure & stainless yoke hinge',
    offsetX: -65,
    offsetY: 165,
  },
  {
    id: 'callout-exp-elec',
    anchorKey: 'expElectronics',
    stage: 'exploded',
    title: 'H1 Chip & Sensor Array',
    detail: '10 audio cores · 9B ops/sec · Optical & gyro sensors',
    offsetX: -45,
    offsetY: -145,
  },
  {
    id: 'callout-exp-driver',
    anchorKey: 'expDriver',
    stage: 'exploded',
    title: '40 mm Dynamic Driver',
    detail: 'Dual-neodymium ring magnet motor minimizes distortion',
    offsetX: -15,
    offsetY: 165,
  },
  {
    id: 'callout-exp-baffle',
    anchorKey: 'expBaffle',
    stage: 'exploded',
    title: 'Acoustic Baffle Chamber',
    detail: 'Tuned airflow & perforated speaker grille',
    offsetX: -125,
    offsetY: -85,
  },
  {
    id: 'callout-exp-cushion',
    anchorKey: 'expCushion',
    stage: 'exploded',
    title: 'Knit-Mesh Ear Cushion',
    detail: 'Acoustically engineered memory foam & magnetic mount',
    offsetX: -120,
    offsetY: 165,
  },
];

export const TECHNICAL_SPECS = [
  { group: 'Audio Technology', items: [
    ['Transducer', 'Apple-designed 40 mm dynamic driver'],
    ['Magnet System', 'Dual-neodymium ring magnet motor'],
    ['Noise Control', 'Active Noise Cancellation & Transparency'],
    ['Spatial Audio', 'Dynamic head tracking with Dolby Atmos'],
    ['Adaptive EQ', 'Real-time inward mic frequency tuning'],
  ]},
  { group: 'Sensors & Silicon', items: [
    ['Silicon', 'Dual Apple H1 headphone chips (10 audio cores each)'],
    ['Sensors', 'Optical, position, case-detect, accelerometer & gyro'],
    ['Microphones', '8 ANC microphones + 3 voice pickup microphones'],
  ]},
  { group: 'Dimensions & Power', items: [
    ['Height × Width × Depth', '187.3 × 168.6 × 83.4 mm'],
    ['AirPods Max Weight', '384.8 g (anodized aluminum & steel)'],
    ['Smart Case Weight', '134.5 g (ultra-low-power magnetic sleep)'],
    ['Battery Life', 'Up to 20 hours ANC / Spatial Audio listening'],
  ]},
];
