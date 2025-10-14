// src/utils/storage.js
const NS = 'ark-mask-colorizer:v1';

export const STORAGE_KEYS = {
  slots: `${NS}:slots`,
  creature: `${NS}:creature`,
  language: `${NS}:lang`,
  exportBg: `${NS}:exportBg`,
  exportTx: `${NS}:exportTx`,
  threshold: `${NS}:threshold`,
  strength: `${NS}:strength`,
  neutralStrength: `${NS}:neutralStrength`,
  feather: `${NS}:feather`,
  gamma: `${NS}:gamma`,
  keepLight: `${NS}:keepLight`,
  chromaBoost: `${NS}:chromaBoost`,
  chromaCurve: `${NS}:chromaCurve`,
  speckleClean: `${NS}:speckleClean`,
  edgeSmooth: `${NS}:edgeSmooth`,
  boundaryBlend: `${NS}:boundaryBlend`,
  overlayStrength: `${NS}:overlayStrength`,
  overlayColorStrength: `${NS}:overlayColorStrength`,
  colorMixBoost: `${NS}:colorMixBoost`,
  overlayColorMixBoost: `${NS}:overlayColorMixBoost`,
  hideSliders: `${NS}:hideSliders`,
  paletteFavorites: `${NS}:paletteFavorites`,
  overlayTint: `${NS}:overlayTint`,
  overlayBlendMode: `${NS}:overlayBlendMode`, // 'add' | 'pastel'
  overlayPastelKappa: `${NS}:overlayPastelKappa`, // 0.3..0.8
  overlayPastelWdeg: `${NS}:overlayPastelWdeg`, // 40..120 degrees
  cmdName: `${NS}:cmd:name`,
  cmdBaseStats: `${NS}:cmd:base`,
  cmdIncStats: `${NS}:cmd:inc`,
  unlockAllSlots: `${NS}:unlockAllSlots`,
  decayServers: `${NS}:decayServers`,
} as const;

export function saveJSON(key: string, data: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore storage errors */
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function remove(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore storage errors */
  }
}
