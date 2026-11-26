export type ColorwayId = 'silver' | 'space-gray' | 'sky-blue' | 'pink' | 'green';

export interface ColorwaySpec {
  id: ColorwayId;
  name: string;
  tagline: string;
  swatchHex: string;
  swatchRingHex: string;
  aluminum: string;
  aluminumAccent: string;
  headbandSilicone: string;
  canopyMesh: string;
  cushionFabric: string;
  innerAcousticMesh: string;
  baffleTone: string;
  smartCaseOuter: string;
  smartCaseInner: string;
  backdropTint: string;
}

export interface ProjectedAnchor {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  depth: number;
}

export interface CalloutSpec {
  id: string;
  anchorId: string;
  stage: number;
  title: string;
  subtitle: string;
  detail: string;
  side: 'left' | 'right';
  offsetX: number;
  offsetY: number;
}

export interface ShowcaseHUDState {
  progress: number;
  stageIndex: number;
  activeColorwayIndex: number;
  colorwayBlend: number;
  isColorLocked: boolean;
  crownAngleDeg: number;
  explodeFactor: number;
  detachFactor: number;
  caseCloseFactor: number;
}
