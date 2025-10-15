/* Web Worker: recolor rendering off the main thread */
// This mirrors the algorithm from useRecolor.js but operates on raw ImageData buffers.

// Color space helpers (OKLab)
const srgb2lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lin2srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
function rgb2oklab(r, g, b) {
  const rl = srgb2lin(r),
    gl = srgb2lin(g),
    bl = srgb2lin(b);
  const L = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const M = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const S = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l = Math.cbrt(L),
    m = Math.cbrt(M),
    s = Math.cbrt(S);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}
function oklab2rgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const rl = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = 0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [Math.max(0, Math.min(1, lin2srgb(rl))), Math.max(0, Math.min(1, lin2srgb(gl))), Math.max(0, Math.min(1, lin2srgb(bl)))];
}
function oklabToLch(L, a, b) {
  const C = Math.hypot(a, b),
    h = Math.atan2(b, a);
  return { L, C, h };
}
function lchToOklab(L, C, h) {
  return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}
const smoothstep = (a, b, x) => {
  if (b <= a) return x < a ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const REF = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
].map((v) => {
  const L = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / L, v[1] / L, v[2] / L];
});

function coerceRGB(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const h = v[0] === '#' ? v.slice(1) : v;
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  if (typeof v === 'object' && v.hex) {
    const h = v.hex[0] === '#' ? v.hex.slice(1) : v.hex;
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

function render({ base, mask, w, h, slots, params }) {
  const {
    threshold = 80,
    strength = 1,
    neutralStrength = 1,
    feather = 0,
    gamma = 1,
    keepLight = 0.98,
    chromaBoost = 1.18,
    chromaCurve = 0.9,
    speckleClean = 0.35,
    edgeSmooth = 0,
    boundaryBlend = 0.28,
    colorMixBoost = 0,
    minChroma = 0,
    blendMode = 'oklab',
  } = params || {};

  const out = new Uint8ClampedArray(w * h * 4);
  const pal = new Array(6);
  for (let s = 0; s < 6; s++) pal[s] = coerceRGB(slots?.[s]);

  const mixBoostClamped = Math.max(0, Math.min(1.5, Number.isFinite(colorMixBoost) ? colorMixBoost : 0));

  const seedChr = 8 + Math.round((threshold / 150) * 96);
  const spreadPx = 2 + feather * 6;
  const INF = 1e9;
  const dist = new Float32Array(w * h);
  dist.fill(INF);
  let lab = new Int16Array(w * h);
  lab.fill(-1);
  const conf = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        j = 4 * i;
      const mr = mask[j],
        mg = mask[j + 1],
        mb = mask[j + 2];
      const maxC = Math.max(mr, mg, mb),
        minC = Math.min(mr, mg, mb);
      const chr = maxC - minC;
      let rx = mr - minC,
        gx = mg - minC,
        bx = mb - minC;
      const L = Math.hypot(rx, gx, bx);
      if (L > 1e-6) {
        rx /= L;
        gx /= L;
        bx /= L;
        let best = -2,
          si = -1;
        for (let s = 0; s < 6; s++) {
          const r = REF[s];
          const cs = rx * r[0] + gx * r[1] + bx * r[2];
          if (cs > best) {
            best = cs;
            si = s;
          }
        }
        lab[i] = si;
        conf[i] = chr / 255;
        if (chr >= seedChr) {
          dist[i] = 0;
        }
      }
    }
  }
  const W1 = 1,
    W2 = 1.41421356237;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let d = dist[i],
        l = lab[i];
      const relax = (nx, ny, cost) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const k = ny * w + nx,
          nd = dist[k] + cost;
        if (nd < d) {
          d = nd;
          l = lab[k];
        }
      };
      relax(x - 1, y, W1);
      relax(x, y - 1, W1);
      relax(x - 1, y - 1, W2);
      relax(x + 1, y - 1, W2);
      dist[i] = d;
      if (lab[i] < 0 && l >= 0) lab[i] = l;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let d = dist[i],
        l = lab[i];
      const relax = (nx, ny, cost) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const k = ny * w + nx,
          nd = dist[k] + cost;
        if (nd < d) {
          d = nd;
          l = lab[k];
        }
      };
      relax(x + 1, y, W1);
      relax(x, y + 1, W1);
      relax(x + 1, y + 1, W2);
      relax(x - 1, y + 1, W2);
      dist[i] = d;
      if (lab[i] < 0 && l >= 0) lab[i] = l;
    }
  }

  if (w * h <= 4096 || feather >= 0) {
    const scRaw = Math.max(0, Math.min(2, speckleClean));
    const sc1 = Math.min(scRaw, 1);
    const sc2 = Math.max(0, scRaw - 1);
    const confThr = 0.05 + 0.5 * sc1 + 0.3 * sc2;
    const minMajor = scRaw >= 1.0 ? 3 : scRaw >= 0.7 ? 4 : 5;
    const passes = scRaw >= 1.6 ? 3 : scRaw >= 0.6 ? 2 : 1;
    let srcLab = lab;
    for (let pass = 0; pass < passes; pass++) {
      const dstLab = new Int16Array(srcLab);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (conf[i] > confThr) continue;
          const cnt = new Int16Array(6);
          let best = -1,
            bestC = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const k = (y + dy) * w + (x + dx);
              const lk = srcLab[k];
              if (lk >= 0 && lk < 6) {
                const c = ++cnt[lk];
                if (c > bestC) {
                  bestC = c;
                  best = lk;
                }
              }
            }
          }
          if (best >= 0 && bestC >= minMajor) {
            dstLab[i] = best;
          }
        }
      }
      srcLab = dstLab;
    }
    lab = srcLab;
  }

  const tolPix = (2 + feather * 6) * 1.25;
  for (let i = 0; i < w * h; i++) {
    const j = 4 * i;
    const br = base[j],
      bg = base[j + 1],
      bb = base[j + 2],
      ba = base[j + 3];
    const mr = mask[j],
      mg = mask[j + 1],
      mb = mask[j + 2];
    const maxC = Math.max(mr, mg, mb),
      val = maxC / 255;
    let si = lab[i];
    if (si < 0 || !pal[si]) {
      out[j] = br;
      out[j + 1] = bg;
      out[j + 2] = bb;
      out[j + 3] = ba;
      continue;
    }
    const d = dist[i];
    const ws = Math.exp(-(d / (spreadPx + 0.0001)) * (d / (spreadPx + 0.0001)));
    let wMask = (d <= tolPix ? ws : 0) * (0.7 * conf[i] + 0.3 * val);
    const whiteness = val * (1 - conf[i]);
    let whiteClip = smoothstep(0.2, 0.55, whiteness);
    const blackness = 1 - val;
    let blackClip = smoothstep(0.8, 0.98, blackness);
    const chromaSoft = smoothstep(0.05, 0.25, 1 - conf[i]);
    let hardCut = (1 - whiteClip) * (1 - blackClip);
    let softCut = 1 - 0.4 * chromaSoft;
    wMask *= hardCut * softCut;
    if (wMask > 1) wMask = 1;
    if (wMask < 0) wMask = 0;
    if (wMask <= 1e-5) {
      out[j] = br;
      out[j + 1] = bg;
      out[j + 2] = bb;
      out[j + 3] = ba;
      continue;
    }

    const minC2 = Math.min(mr, mg, mb);
    let rxd = mr - minC2,
      gxd = mg - minC2,
      bxd = mb - minC2;
    const Ln = Math.hypot(rxd, gxd, bxd);
    const sharp = Math.max(1.5, 12 - 2.5 * Math.max(0, Math.min(4, feather)));
    let weights = null;
    if (Ln > 1e-6) {
      rxd /= Ln;
      gxd /= Ln;
      bxd /= Ln;
      weights = new Float32Array(6);
      let sumW = 0,
        wmax = 0,
        w2 = 0,
        imax = -1;
      for (let s = 0; s < 6; s++) {
        if (!pal[s]) {
          weights[s] = 0;
          continue;
        }
        const r = REF[s];
        let cs = rxd * r[0] + gxd * r[1] + bxd * r[2];
        cs = Math.max(0, cs);
        const wv = Math.pow(cs, sharp);
        weights[s] = wv;
        sumW += wv;
        if (wv > wmax) {
          w2 = wmax;
          wmax = wv;
          imax = s;
        } else if (wv > w2) {
          w2 = wv;
        }
      }
      const ratio = w2 > 0 ? wmax / w2 : Infinity;
      const useBlend = sumW > 1e-6 && !(ratio >= 1.8 && wmax >= 0.75 && conf[i] >= 0.25);
      if (!useBlend) {
        if (imax >= 0) {
          si = imax;
          weights = null;
        }
      }
    }

    let tR, tG, tB;
    if (weights) {
      let sumW = 0,
        aR = 0,
        aG = 0,
        aB = 0;
      for (let s = 0; s < 6; s++) {
        const wv = weights[s];
        if (wv <= 0) continue;
        const pv = pal[s];
        aR += wv * (pv[0] / 255);
        aG += wv * (pv[1] / 255);
        aB += wv * (pv[2] / 255);
        sumW += wv;
      }
      if (sumW > 1e-6) {
        const inv = 1 / sumW;
        tR = aR * inv;
        tG = aG * inv;
        tB = aB * inv;
      }
    }
    if (tR === undefined) {
      const tgt = pal[si];
      if (!tgt) {
        out[j] = br;
        out[j + 1] = bg;
        out[j + 2] = bb;
        out[j + 3] = ba;
        continue;
      }
      tR = tgt[0] / 255;
      tG = tgt[1] / 255;
      tB = tgt[2] / 255;
    }

    // Boundary color band: soften seams between different labels by gently
    // pulling target color toward the most common neighboring different label.
    // This only adjusts the target chroma; lightness is handled later via OKLab.
    {
      const y = Math.floor(i / w),
        x = i - y * w;
      const BSTR = Math.max(0, Math.min(2, boundaryBlend || 0)); // allow up to 2x strength
      let nb = -1,
        cntOther = 0,
        cnt = 0,
        nbVotes = new Int16Array(6);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const k = yy * w + xx;
          const lk = lab[k];
          if (lk >= 0) {
            cnt++;
            if (lk !== si) {
              cntOther++;
              if (++nbVotes[lk] > (nb >= 0 ? nbVotes[nb] : 0)) nb = lk;
            }
          }
        }
      }
      if (nb >= 0 && pal[nb] && BSTR > 0.0001) {
        const ratio = cnt > 0 ? cntOther / cnt : 0;
        const a = Math.max(0, Math.min(1, BSTR * ratio));
        const nbCol = pal[nb];
        const nr = nbCol[0] / 255,
          ng = nbCol[1] / 255,
          nbv = nbCol[2] / 255;
        tR = tR * (1 - a) + nr * a;
        tG = tG * (1 - a) + ng * a;
        tB = tB * (1 - a) + nbv * a;
      }
    }

    const targetOK = rgb2oklab(tR || 0, tG || 0, tB || 0);
    const targetLCH = oklabToLch(targetOK.L, targetOK.a, targetOK.b);
    if (targetLCH.C <= 0.03 && wMask < 0.999) {
      const cf = conf[i] || 0;
      // Lower cap when confidence is low
      const cap = 0.65 + 0.3 * cf; // 0.65..0.95
      if (wMask > cap) wMask = cap;
    }
    const bL = br / 255,
      bG = bg / 255,
      bB = bb / 255;
    const rl = srgb2lin(bL),
      gl = srgb2lin(bG),
      bl = srgb2lin(bB);
    const baseMix = Math.max(0, Math.min(1, strength)) * wMask;
    const neutralAmt = Math.max(0, Math.min(5, Number.isFinite(neutralStrength) ? neutralStrength : 1));
    const neutralWeight = neutralAmt === 1 ? 0 : Math.max(0, Math.min(1, 1 - Math.min(1, targetLCH.C / 0.12)));
    const baseLum = Math.max(0, Math.min(1, 0.2126 * bL + 0.7152 * bG + 0.0722 * bB));
    const highlight = baseLum <= 0.5 ? 0 : Math.pow((baseLum - 0.5) / 0.5, 1.25);
    const shadow = baseLum >= 0.45 ? 0 : Math.pow((0.45 - baseLum) / 0.45, 1.15);
    const highlightGuard = Math.max(0.45, 1 - 0.4 * neutralWeight * Math.min(1, highlight * neutralAmt));
    const shadowBoost = 1 + 0.25 * neutralWeight * Math.min(1.2, shadow * Math.max(0, neutralAmt - 1));
    const neutralScale = neutralAmt === 1 ? 1 : 1 + (neutralAmt - 1) * neutralWeight;
    const mixScale = Math.max(0, Math.min(1.2, neutralScale * highlightGuard * shadowBoost));
    const kBase = Math.max(0, Math.min(1, baseMix * mixScale));
    const vivid = Math.max(0, Math.min(1, (targetLCH.C - 0.06) / 0.24));
    const vividWeight = vivid > 0 ? Math.pow(vivid, 0.65) : 0;
    const coverageBoost = mixBoostClamped > 0 && vividWeight > 0 ? Math.min(1, (0.35 + 0.65 * vividWeight) * mixBoostClamped * vividWeight) : 0;
    const vividLift = mixBoostClamped > 0 ? mixBoostClamped * vividWeight : 0;
    let kAdj = coverageBoost > 0 ? Math.min(1, kBase + (1 - kBase) * coverageBoost) : kBase;
    let o0, o1, o2;
    if (blendMode !== 'oklab') {
      const ov = (B, T) => (B <= 0.5 ? 2 * B * T : 1 - 2 * (1 - B) * (1 - T));
      const mul = (B, T) => B * T;
      let rMix, gMix, bMix;
      if (blendMode === 'multiplyRGB') {
        rMix = mul(bL, tR);
        gMix = mul(bG, tG);
        bMix = mul(bB, tB);
      } else if (blendMode === 'autoRGB') {
        const baseLum = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
        const useMul = baseLum > 0.8;
        if (useMul) {
          rMix = mul(bL, tR);
          gMix = mul(bG, tG);
          bMix = mul(bB, tB);
        } else {
          rMix = ov(bL, tR);
          gMix = ov(bG, tG);
          bMix = ov(bB, tB);
        }
      } else {
        rMix = ov(bL, tR);
        gMix = ov(bG, tG);
        bMix = ov(bB, tB);
      }
      const tl0 = srgb2lin(Math.max(0, Math.min(1, rMix)));
      const tl1 = srgb2lin(Math.max(0, Math.min(1, gMix)));
      const tl2 = srgb2lin(Math.max(0, Math.min(1, bMix)));
      o0 = rl * (1 - kAdj) + tl0 * kAdj;
      o1 = gl * (1 - kAdj) + tl1 * kAdj;
      o2 = bl * (1 - kAdj) + tl2 * kAdj;
    } else {
      const baseOK = rgb2oklab(bL, bG, bB);
      const tLC = targetLCH;
      const targetC = Math.max(tLC.C, minChroma);
      let Cx = Math.pow(targetC, chromaCurve) * chromaBoost;
      if (vividLift > 0) {
        Cx *= 1 + 0.3 * vividLift;
      }
      const C_REF = 0.3;
      const Cn = Math.max(0, Math.min(1, Cx / C_REF));
      const neutralPull = neutralWeight * Math.max(0, neutralAmt - 1);
      const keepLightDropBase = 0.15;
      const keepLightDrop = Math.min(0.75, keepLightDropBase + 0.3 * neutralPull);
      let keepL = Math.max(0, Math.min(1, keepLight - (1 - Cn) * keepLightDrop));
      keepL = Math.min(1, keepL + 0.2 * neutralWeight * highlight);
      if (vividLift > 0) {
        const lightDrop = 0.25 * vividLift;
        keepL = Math.max(0, Math.min(1, keepL - lightDrop));
      }
      const Lmix = baseOK.L * keepL + tLC.L * (1 - keepL);
      const Cmix = Cx;
      const Hmix = tLC.h;
      const tint = lchToOklab(Lmix, Cmix, Hmix);
      const [rt, gt, bt] = oklab2rgb(tint.L, tint.a, tint.b);
      const tl0 = srgb2lin(rt);
      const tl1 = srgb2lin(gt);
      const tl2 = srgb2lin(bt);
      o0 = rl * (1 - kAdj) + tl0 * kAdj;
      o1 = gl * (1 - kAdj) + tl1 * kAdj;
      o2 = bl * (1 - kAdj) + tl2 * kAdj;
    }
    const gpow = gamma && gamma !== 1 ? 1 / gamma : 1;
    o0 = Math.pow(o0, gpow);
    o1 = Math.pow(o1, gpow);
    o2 = Math.pow(o2, gpow);
    out[j] = Math.round(Math.max(0, Math.min(1, lin2srgb(o0))) * 255);
    out[j + 1] = Math.round(Math.max(0, Math.min(1, lin2srgb(o1))) * 255);
    out[j + 2] = Math.round(Math.max(0, Math.min(1, lin2srgb(o2))) * 255);
    out[j + 3] = ba;
  }

  // Optional edge-aware smoothing (joint bilateral guided by base luminance)
  // Adjusted to avoid "watery glue" blending across different mask labels
  if (edgeSmooth && edgeSmooth > 0.001) {
    const sAmt = Math.max(0, Math.min(1, edgeSmooth));
    // Deadzone: very low settings do nothing to avoid unintended blur
    if (sAmt > 0.12) {
      const sNorm = (sAmt - 0.12) / 0.88; // remap 0.12..1 -> 0..1
      const radius = sNorm < 0.4 ? 1 : 2; // 3x3 or 5x5
      const sigmaS = 0.2 + 1.0 * sNorm;
      const sigmaR = 0.03 + 0.12 * sNorm; // luminance range in linear space
      const inv2sS = 1 / (2 * sigmaS * sigmaS);
      const inv2sR = 1 / (2 * sigmaR * sigmaR);
      const W = w,
        H = h;
      const outLin0 = new Float32Array(W * H * 3);
      const baseLum = new Float32Array(W * H);
      for (let i = 0, p = 0; i < W * H; i++, p += 4) {
        const r = out[p] / 255,
          g = out[p + 1] / 255,
          b = out[p + 2] / 255;
        const rl = srgb2lin(r),
          gl = srgb2lin(g),
          bl = srgb2lin(b);
        outLin0[i * 3 + 0] = rl;
        outLin0[i * 3 + 1] = gl;
        outLin0[i * 3 + 2] = bl;
        const br = base[p] / 255,
          bg = base[p + 1] / 255,
          bb = base[p + 2] / 255;
        const brl = srgb2lin(br),
          bgl = srgb2lin(bg),
          bbl = srgb2lin(bb);
        baseLum[i] = 0.2126 * brl + 0.7152 * bgl + 0.0722 * bbl;
      }
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const Lc = baseLum[i];
          let ws = 0,
            a0 = 0,
            a1 = 0,
            a2 = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            const yy = Math.min(H - 1, Math.max(0, y + dy));
            for (let dx = -radius; dx <= radius; dx++) {
              const xx = Math.min(W - 1, Math.max(0, x + dx));
              const k = yy * W + xx;
              const ds2 = dx * dx + dy * dy;
              const wS = Math.exp(-ds2 * inv2sS);
              const dL = baseLum[k] - Lc;
              const wR = Math.exp(-(dL * dL) * inv2sR);
              let wgt = wS * wR;
              // Label-aware gating: drastically reduce mixing across different mask labels
              if (lab && conf) {
                const sameLab = lab[k] >= 0 && lab[i] >= 0 && lab[k] === lab[i];
                if (!sameLab) {
                  const ci = conf[i] || 0,
                    ck = conf[k] || 0;
                  const cMax = ci > ck ? ci : ck;
                  // If either pixel is reasonably confident, almost block cross-label smoothing
                  // Allow a bit when both are low confidence (edge/ambiguous zones)
                  wgt *= cMax >= 0.3 ? 0.03 : 0.3;
                }
              }
              ws += wgt;
              a0 += wgt * outLin0[k * 3 + 0];
              a1 += wgt * outLin0[k * 3 + 1];
              a2 += wgt * outLin0[k * 3 + 2];
            }
          }
          const inv = ws > 1e-8 ? 1 / ws : 1;
          const rl = a0 * inv,
            gl = a1 * inv,
            bl = a2 * inv;
          const p = i * 4;
          out[p] = Math.round(Math.max(0, Math.min(1, lin2srgb(rl))) * 255);
          out[p + 1] = Math.round(Math.max(0, Math.min(1, lin2srgb(gl))) * 255);
          out[p + 2] = Math.round(Math.max(0, Math.min(1, lin2srgb(bl))) * 255);
        }
      }
    }
  }

  return out.buffer;
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  if (msg.type !== 'recolor') return;
  // Stash jobId early for error reporting
  let jid = (msg && msg.payload && msg.payload.jobId) || 0;
  try {
    const { jobId, width, height, baseBuffer, maskBuffer, base, mask, slots, params } = msg.payload || {};
    jid = jobId;
    const baseArr = base instanceof Uint8ClampedArray ? base : baseBuffer ? new Uint8ClampedArray(baseBuffer) : new Uint8ClampedArray(base);
    const maskArr = mask instanceof Uint8ClampedArray ? mask : maskBuffer ? new Uint8ClampedArray(maskBuffer) : new Uint8ClampedArray(mask);
    const outBuffer = render({ base: baseArr, mask: maskArr, w: width, h: height, slots, params });
    // Post back with transferable
    self.postMessage({ type: 'recolor:done', jobId, width, height, outBuffer }, [outBuffer]);
  } catch (e) {
    self.postMessage({ type: 'recolor:error', jobId: jid, error: String(e && e.message ? e.message : e) });
  }
};
