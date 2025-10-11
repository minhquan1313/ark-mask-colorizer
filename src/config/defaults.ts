export type OverlayBlendMode = 'add' | 'pastel';

export interface AppDefaults {
  threshold: number;
  strength: number;
  neutralStrength: number;
  feather: number;
  gamma: number;
  keepLight: number;
  chromaBoost: number;
  chromaCurve: number;
  speckleClean: number;
  edgeSmooth: number;
  boundaryBlend: number;
  overlayStrength: number;
  overlayColorStrength: number;
  colorMixBoost: number;
  overlayColorMixBoost: number;
  overlayBlendMode: OverlayBlendMode;
  overlayTint: number;
  slots: Array<number | null>;
  paletteFavorites: number[];
  defaultCreatureName: string;
  exportBg: string;
  exportText: string;
}

export const DEFAULTS: AppDefaults = {
  threshold: 150,
  strength: 1,
  neutralStrength: 2.2,
  feather: 0,
  gamma: 1,
  // Advanced OKLab tuning
  keepLight: 1,
  chromaBoost: 1,
  chromaCurve: 1.2,
  // Speckle removal strength (0..1)
  speckleClean: 1.45,
  // Edge-aware smoothing amount (0..1)
  edgeSmooth: 0.05,
  // Boundary blend between neighboring mask labels (0..1)
  boundaryBlend: 0.1,
  // Overlay strength (temporary UI control)
  overlayStrength: 1,
  // Overlay color strength multiplier for extra masks (0..1)
  overlayColorStrength: 1,
  // Color mix boost for vivid regions (0..1)
  colorMixBoost: 1,
  // Overlay color mix boost for extra masks (0..1)
  overlayColorMixBoost: 0.55,
  // Overlay blend mode for mask _m_xy: 'add' (legacy) | 'pastel'
  overlayBlendMode: 'add',
  // Overlay tint factor for white-partner case (0..1)
  overlayTint: 0.25,
  slots: [null, null, null, null, null, null],
  paletteFavorites: [1, 2, 3, 4, 5, 6, 36, 79, 68, 187, 203, 245],
  defaultCreatureName: 'Drakeling',
  exportBg: '#0f1115', // background when export/copy
  exportText: '#e5e7eb', // text color for palette strip
};
