// ===== Linear <-> sRGB =====
const srgb2lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lin2srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// ===== RGB <-> HSL (sRGB 0..1) =====
function rgb2hsl(r, g, b) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
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
    h /= 6;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

// 6 màu tham chiếu của mask (slot 0..5)
const SLOT_REF = [
  [255, 0, 0], // 0 red
  [0, 255, 0], // 1 green
  [0, 0, 255], // 2 blue
  [0, 255, 255], // 3 cyan
  [255, 255, 0], // 4 yellow
  [255, 0, 255], // 5 magenta
];
const MAX_DIST = Math.sqrt(255 * 255 * 3); // ≈441.673

// smoothstep
const smoothstep = (a, b, x) => {
  if (b <= a) return x < a ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// parse hex "#RRGGBB" -> [r,g,b]
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex[0] === '#' ? hex.slice(1) : hex;
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// đảm bảo target là [r,g,b]
function coerceRGB(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return hexToRgb(v);
  if (typeof v === 'object' && v.hex) return hexToRgb(v.hex);
  return null;
}

/**
 * Hook trả về hàm draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots })
 * Thuật toán:
 *  - gán slot mask theo màu gần nhất trong 6 màu chuẩn
 *  - tính trọng số theo threshold/feather đã chuẩn hoá
 *  - blend tuyến tính trong linear sRGB (fix màu cực tối/sáng: #000/#fff/#171717, v.v.)
 */
export function useRecolor({ threshold = 80, strength = 1, feather = 0, gamma = 1, preserveShading = true, satBoost = 1 }) {
  function draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots }) {
    if (!baseImg || !maskImg) return;
    const w = baseImg.naturalWidth;
    const h = baseImg.naturalHeight;

    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const outCanvas = outCanvasRef.current;

    if (!baseCanvas || !maskCanvas || !outCanvas) return;

    baseCanvas.width = w;
    baseCanvas.height = h;
    maskCanvas.width = w;
    maskCanvas.height = h;
    outCanvas.width = w;
    outCanvas.height = h;

    const bctx = baseCanvas.getContext('2d', { willReadFrequently: true });
    const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const octx = outCanvas.getContext('2d');
    bctx.clearRect(0, 0, w, h);
    mctx.clearRect(0, 0, w, h);
    octx.clearRect(0, 0, w, h);
    bctx.drawImage(baseImg, 0, 0, w, h);
    mctx.drawImage(maskImg, 0, 0, w, h);

    const b = bctx.getImageData(0, 0, w, h);
    const m = mctx.getImageData(0, 0, w, h);
    const o = octx.createImageData(w, h);

    // threshold: 0..150 (cao = khắt khe) → tolerance (thấp = khắt khe)
    const tolerance = ((150 - Math.max(0, Math.min(150, threshold))) / 150) * MAX_DIST; // 0..MAX_DIST
    // feather: 0..4 → độ rộng mép theo khoảng cách màu (px RGB)
    const featherWidth = (0.04 + 0.04 * Math.max(0, Math.min(4, feather))) * MAX_DIST; // ≈ 0.04..0.20 * MAX_DIST
    const S = Math.max(0, Math.min(1, strength));
    const gpow = gamma && gamma !== 1 ? 1 / gamma : 1;

    const pal = new Array(6);
    for (let s = 0; s < 6; s++) pal[s] = coerceRGB(slots?.[s]);

    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      const br = b.data[j],
        bg = b.data[j + 1],
        bb = b.data[j + 2],
        ba = b.data[j + 3];
      const mr = m.data[j],
        mg = m.data[j + 1],
        mb = m.data[j + 2];

      // chọn slot gần nhất
      let slot = -1,
        best = 1e12;
      for (let s = 0; s < 6; s++) {
        const dr = mr - SLOT_REF[s][0],
          dg = mg - SLOT_REF[s][1],
          db = mb - SLOT_REF[s][2];
        const d2 = dr * dr + dg * dg + db * db;
        if (d2 < best) {
          best = d2;
          slot = s;
        }
      }

      const dist = Math.sqrt(best); // khoảng cách màu tuyệt đối 0..MAX_DIST
      let wMask;
      if (dist <= tolerance) wMask = 1;
      else if (dist >= tolerance + featherWidth) wMask = 0;
      else wMask = 1 - smoothstep(tolerance, tolerance + featherWidth, dist);
      if (wMask <= 1e-5 || slot < 0) {
        o.data[j] = br;
        o.data[j + 1] = bg;
        o.data[j + 2] = bb;
        o.data[j + 3] = ba;
        continue;
      }

      const tgt = pal[slot];
      if (!tgt) {
        o.data[j] = br;
        o.data[j + 1] = bg;
        o.data[j + 2] = bb;
        o.data[j + 3] = ba;
        continue;
      }

      const k = S * wMask;

      // base (linear)
      const rl = srgb2lin(br / 255),
        gl = srgb2lin(bg / 255),
        bl = srgb2lin(bb / 255);

      let out0, out1, out2;

      if (preserveShading) {
        // 🆕 preserveShading path: Color blend (HSL): H,S từ target; L từ base
        const tr = tgt[0] / 255,
          tg = tgt[1] / 255,
          tb = tgt[2] / 255;
        const [ht, st] = rgb2hsl(tr, tg, tb); // H,S của target
        const [, , lb] = rgb2hsl(br / 255, bg / 255, bb / 255); // L của base

        const sAdj = Math.max(0, Math.min(1, st * satBoost)); // nếu muốn tăng giảm saturation
        const [rt, gt, bt] = hsl2rgb(ht, sAdj, lb); // “tint” giữ sáng base

        // blend (làm trên linear để mượt)
        const tl0 = srgb2lin(rt),
          tl1 = srgb2lin(gt),
          tl2 = srgb2lin(bt);
        let t0 = rl * (1 - k) + tl0 * k;
        let t1 = gl * (1 - k) + tl1 * k;
        let t2 = bl * (1 - k) + tl2 * k;

        // gamma
        t0 = Math.pow(t0, gpow);
        t1 = Math.pow(t1, gpow);
        t2 = Math.pow(t2, gpow);
        out0 = Math.round(lin2srgb(t0) * 255);
        out1 = Math.round(lin2srgb(t1) * 255);
        out2 = Math.round(lin2srgb(t2) * 255);
      } else {
        // đường cũ: linear lerp RGB (tô phẳng khi k≈1)
        const tl0 = srgb2lin(tgt[0] / 255),
          tl1 = srgb2lin(tgt[1] / 255),
          tl2 = srgb2lin(tgt[2] / 255);
        let t0 = rl * (1 - k) + tl0 * k;
        let t1 = gl * (1 - k) + tl1 * k;
        let t2 = bl * (1 - k) + tl2 * k;
        t0 = Math.pow(t0, gpow);
        t1 = Math.pow(t1, gpow);
        t2 = Math.pow(t2, gpow);
        out0 = Math.round(lin2srgb(t0) * 255);
        out1 = Math.round(lin2srgb(t1) * 255);
        out2 = Math.round(lin2srgb(t2) * 255);
      }

      o.data[j] = out0;
      o.data[j + 1] = out1;
      o.data[j + 2] = out2;
      o.data[j + 3] = ba;
    }

    octx.putImageData(o, 0, 0);
  }

  return { draw };
}
