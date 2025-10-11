// src/utils/maskOps.js
// 6 key colors in mask (R,G,B,C,Y,M)
const KEYS: [number, number, number][] = [
  [255, 0, 0], // 0
  [0, 255, 0], // 1
  [0, 0, 255], // 2
  [0, 255, 255], // 3
  [255, 255, 0], // 4
  [255, 0, 255], // 5
];

// Euclidean distance in RGB
function dist2(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2,
    dg = g1 - g2,
    db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

// Map each pixel -> label (0..5) or -1 if none
export function buildLabelMap(maskRGBA: Uint8ClampedArray, W: number, H: number, threshold: number): Int16Array {
  const out = new Int16Array(W * H).fill(-1);
  const thr2 = threshold * threshold;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = maskRGBA[p],
      g = maskRGBA[p + 1],
      b = maskRGBA[p + 2],
      a = maskRGBA[p + 3];
    if (a < 8) {
      out[i] = -1;
      continue;
    }
    let best = -1,
      bestD = 1e12;
    for (let k = 0; k < 6; k++) {
      const d = dist2(r, g, b, KEYS[k][0], KEYS[k][1], KEYS[k][2]);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    out[i] = bestD <= thr2 ? best : -1;
  }
  return out;
}

// Simple separable blur on alpha array for feathering edges
export function featherAlpha(A: Float32Array, W: number, H: number, sigma: number): Float32Array {
  if (!sigma || sigma <= 0.01) return A;
  // Gaussian separable kernel, radius ~ 3*sigma
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const inv2s2 = 1 / (2 * sigma * sigma);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const w = Math.exp(-x * x * inv2s2);
    kernel[i] = w;
    sum += w;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const tmp = new Float32Array(W * H);

  // horizontal
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(W - 1, Math.max(0, x + k));
        acc += A[y * W + xx] * kernel[k + radius];
      }
      tmp[y * W + x] = acc;
    }
  }
  // vertical
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(H - 1, Math.max(0, y + k));
        acc += tmp[yy * W + x] * kernel[k + radius];
      }
      A[y * W + x] = acc;
    }
  }
  return A;
}
