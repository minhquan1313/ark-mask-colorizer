// src/utils/color.js
export function normalizeHex(v?: string | null): string {
  let s = (v || '').trim().toLowerCase();
  if (s === '') return '';
  if (s[0] !== '#') s = '#' + s;
  if (!/^#([0-9a-f]{6})$/.test(s)) return s.replace(/[^#0-9a-f]/g, '').slice(0, 7); // gi��_ user gA� d��n
  return s;
}
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length !== 6) return [0, 0, 0];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function srgbToLinearGamma(c: number, g = 2.2): number {
  return Math.pow(c, g);
}
export function linearToSrgbGamma(c: number, g = 2.2): number {
  return Math.pow(c, 1 / g);
}
export function relLuminance(r: number, g: number, b: number): number {
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

// RGB(0..255) <-> HSL(0..360, 0..1, 0..1)
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - C / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (0 <= h && h < 60) {
    r = C;
    g = X;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = X;
    g = C;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = C;
    b = X;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = X;
    b = C;
  } else if (240 <= h && h < 300) {
    r = X;
    g = 0;
    b = C;
  } else {
    r = C;
    g = 0;
    b = X;
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
