// src/utils/storage.js
const NS = 'ark-mask-colorizer:v1';

export const STORAGE_KEYS = {
  slots: `${NS}:slots`,
  creature: `${NS}:creature`,
  exportBg: `${NS}:exportBg`,
  exportTx: `${NS}:exportTx`,
  threshold: `${NS}:threshold`,
  strength: `${NS}:strength`,
  feather: `${NS}:feather`,
  gamma: `${NS}:gamma`,
  keepLight: `${NS}:keepLight`,
  chromaBoost: `${NS}:chromaBoost`,
  chromaCurve: `${NS}:chromaCurve`,
  speckleClean: `${NS}:speckleClean`,
  edgeSmooth: `${NS}:edgeSmooth`,
  overlayStrength: `${NS}:overlayStrength`,
  cmdName: `${NS}:cmd:name`,
  cmdBaseStats: `${NS}:cmd:base`,
  cmdIncStats: `${NS}:cmd:inc`,
};

export function saveJSON(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}
export function loadJSON(key, fallback = null) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
