// src/utils/colorize.js

type RGB = [number, number, number];

// ===== Linear <-> sRGB helpers =====
const srgb2lin = (v: number): number => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lin2srgb = (v: number): number => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// 6 mA�u tham chi���u c��a mask (slot 0..5)
const SLOT_REF: RGB[] = [
  [255, 0, 0], // 0 red
  [0, 255, 0], // 1 green
  [0, 0, 255], // 2 blue
  [0, 255, 255], // 3 cyan
  [255, 255, 0], // 4 yellow
  [255, 0, 255], // 5 magenta
];

const MAX_DIST = Math.sqrt(255 * 255 * 3); // �%^441.673 (kho���ng cA�ch t��`i �`a trong RGB 3D)

// smoothstep cho ng�����ng/feather
const smoothstep = (a: number, b: number, x: number): number => {
  if (b <= a) return x < a ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// parse hex "#RRGGBB" -> [r,g,b]
function hexToRgb(hex?: string | null): RGB | null {
  if (!hex) return null;
  const h = hex[0] === '#' ? hex.slice(1) : hex;
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type PaletteEntry = RGB | string | { hex?: string | null } | null | undefined;

// �`���m b���o target lA� [r,g,b]
export function coerceRGB(v: PaletteEntry): RGB | null {
  if (!v) return null;
  if (Array.isArray(v) && v.length === 3) {
    const [r, g, b] = v;
    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      return [r, g, b];
    }
    return null;
  }
  if (typeof v === 'string') return hexToRgb(v);
  if (typeof v === 'object') {
    const hex = 'hex' in v ? v.hex : null;
    return hexToRgb(hex ?? null);
  }
  return null;
}

export interface RecolorOptions {
  baseCtx: CanvasRenderingContext2D;
  maskCtx: CanvasRenderingContext2D;
  outCtx: CanvasRenderingContext2D;
  paletteMap?: PaletteEntry[];
  strength?: number;
  threshold?: number;
  feather?: number;
  gamma?: number;
  // debug?: boolean
}

// ===== Core recolor =====
export function recolor({
  baseCtx,
  maskCtx,
  outCtx,
  paletteMap = [],
  strength = 1,
  threshold = 80, // slider 0..150 (UI)
  feather = 0, // slider 0..4   (UI)
  gamma = 1, // 1.0 = off
  // debug = false // b��-t �`��� xem overlay mask weight
}: RecolorOptions): void {
  const w = baseCtx.canvas.width;
  const h = baseCtx.canvas.height;

  const b = baseCtx.getImageData(0, 0, w, h);
  const m = maskCtx.getImageData(0, 0, w, h);
  const o = outCtx.createImageData(w, h);

  // Chu��cn hoA� tham s��` UI �+' 0..1 trong khA'ng gian kho���ng cA�ch chu��cn hoA�
  // t: ng�����ng b��_t �`��u r��i, fw: �`��T r��Tng mAcp (feather) theo t��% l��� 0..1
  const t = Math.max(0, Math.min(1, threshold / 150)); // 0..1
  const fw = 0.02 + Math.max(0, Math.min(4, feather)) * 0.06; // ~0.02..0.26
  const t0 = Math.max(0, t - fw * 0.5);
  const t1 = Math.min(1, t + fw * 0.5);

  // Strength clamp 0..1
  const S = Math.max(0, Math.min(1, strength));

  // Chu��cn hoA� palette
  const pal: (RGB | null)[] = new Array(6);
  for (let s = 0; s < 6; s++) {
    pal[s] = coerceRGB(paletteMap[s]);
  }

  for (let i = 0; i < w * h; i++) {
    const j = i * 4;

    const br = b.data[j],
      bg = b.data[j + 1],
      bb = b.data[j + 2],
      ba = b.data[j + 3];
    const mr = m.data[j],
      mg = m.data[j + 1],
      mb = m.data[j + 2];

    // 1) GA�n slot theo mA�u mask g��n nh���t
    let slot = -1,
      best = 1e12;
    for (let s = 0; s < 6; s++) {
      const dr = mr - SLOT_REF[s][0];
      const dg = mg - SLOT_REF[s][1];
      const db = mb - SLOT_REF[s][2];
      const d2 = dr * dr + dg * dg + db * db;
      if (d2 < best) {
        best = d2;
        slot = s;
      }
    }

    // 2) Tr��?ng s��` mask (0..1) t��� kho���ng cA�ch chu��cn hoA�
    const distN = Math.sqrt(best) / MAX_DIST; // 0..1
    let wMask = 1 - smoothstep(t0, t1, distN);
    if (wMask <= 1e-5 || slot < 0) {
      // KhA'ng tA': chAcp pixel g��`c
      o.data[j] = br;
      o.data[j + 1] = bg;
      o.data[j + 2] = bb;
      o.data[j + 3] = ba;
      continue;
    }

    // 3) N���u slot undefined (255) �+' b��? qua
    const tgt = pal[slot];
    if (!tgt) {
      o.data[j] = br;
      o.data[j + 1] = bg;
      o.data[j + 2] = bb;
      o.data[j + 3] = ba;
      continue;
    }

    // 4) Linear blend (fix mA�u c���c t��`i/sA�ng luA'n ��n)
    const k = S * wMask;

    const rl = srgb2lin(br / 255);
    const gl = srgb2lin(bg / 255);
    const bl = srgb2lin(bb / 255);

    const tl0 = srgb2lin(tgt[0] / 255);
    const tl1 = srgb2lin(tgt[1] / 255);
    const tl2 = srgb2lin(tgt[2] / 255);

    let out0 = rl * (1 - k) + tl0 * k;
    let out1 = gl * (1 - k) + tl1 * k;
    let out2 = bl * (1 - k) + tl2 * k;

    // 5) Gamma (A�p lA�n linear tr����>c khi quay v��? sRGB)
    const gpow = gamma && gamma !== 1 ? 1 / gamma : 1;
    out0 = Math.pow(out0, gpow);
    out1 = Math.pow(out1, gpow);
    out2 = Math.pow(out2, gpow);

    o.data[j] = Math.max(0, Math.min(255, Math.round(lin2srgb(out0) * 255)));
    o.data[j + 1] = Math.max(0, Math.min(255, Math.round(lin2srgb(out1) * 255)));
    o.data[j + 2] = Math.max(0, Math.min(255, Math.round(lin2srgb(out2) * 255)));
    o.data[j + 3] = ba;

    // // DEBUG overlay mask weight (b��-t �`��� test)
    // if (debug) {
    //   const mm = Math.round(wMask * 255)
    //   o.data[j] = mm
    //   o.data[j + 1] = mm
    //   o.data[j + 2] = mm
    // }
  }

  outCtx.putImageData(o, 0, 0);
}
