// src/config/defaults.js
export const DEFAULTS = {
  threshold: 150,
  strength: 1,
  feather: 0,
  gamma: 1,
  // Advanced OKLab tuning
  keepLight: 1,
  chromaBoost: 1.5,
  chromaCurve: 1.2,
  // Speckle removal strength (0..1)
  speckleClean: 1.45,
  // Edge-aware smoothing amount (0..1)
  edgeSmooth: 0.05,
  // Overlay strength (temporary UI control)
  overlayStrength: 1,
  slots: [null, null, null, null, null, null],
  defaultCreatureName: 'Drakeling',
  exportBg: '#0f1115', // background when export/copy
  exportText: '#e5e7eb', // text color for palette strip
};
