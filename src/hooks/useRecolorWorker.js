// Worker-based recolor to avoid blocking the main thread
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useRecolor as useRecolorSync } from './useRecolor.js';
import { STORAGE_KEYS, loadJSON } from '../utils/storage.js';

// --- OKLab helpers for pastel mixing on overlays ---
const srgb2lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lin2srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
function rgb2oklab01(r, g, b) {
  const rl = srgb2lin(r), gl = srgb2lin(g), bl = srgb2lin(b);
  const L = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const M = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const S = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l = Math.cbrt(L), m = Math.cbrt(M), s = Math.cbrt(S);
  return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s };
}
function oklabToLch(L, a, b) {
  const C = Math.hypot(a, b), h = Math.atan2(b, a);
  return { L, C, h };
}
function lchToOklab(L, C, h) {
  return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}
function oklab2rgb01(L, a, b) {
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
const wrapPi = (a) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

export function useRecolorWorker({ threshold = 80, strength = 1, neutralStrength = 1, feather = 0, gamma = 1, keepLight = 0.98, chromaBoost = 1.18, chromaCurve = 0.9, speckleClean = 0.35, edgeSmooth = 0, boundaryBlend = 0.28, overlayStrength = 1, overlayTint = 0.25, overlayBlendMode = 'add' } = {}) {
  const workerRef = useRef(null);
  const jobRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [overlayBlendModeLocal, setOverlayBlendModeLocal] = useState(() => {
    try { const v = loadJSON(STORAGE_KEYS.overlayBlendMode, overlayBlendMode) || overlayBlendMode; return v === 'pastel' ? 'add' : v; } catch { return 'add'; }
  });

  useEffect(() => {
    const onChanged = (e) => {
      const m = e?.detail?.mode;
      if (m === 'add') setOverlayBlendModeLocal('add');
    };
    window.addEventListener('overlay-blend-mode-changed', onChanged);
    return () => window.removeEventListener('overlay-blend-mode-changed', onChanged);
  }, []);

  const params = useMemo(() => ({ threshold, strength, neutralStrength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayBlendMode: overlayBlendModeLocal }), [threshold, strength, neutralStrength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayBlendModeLocal]);
  const sync = useRecolorSync(params);
  const debounceRef = useRef(0);
  const pendingArgsRef = useRef(null);
  const lastJobKeyRef = useRef(null);
  const imageIdentityRef = useRef(new WeakMap());
  const imageIdentitySeqRef = useRef(0);


  const getWorker = () => {
    if (workerRef.current && workerRef.current._alive) return workerRef.current;
    // Use classic worker for broader compatibility with dev servers
    const w = new Worker(new URL('../workers/recolorWorker.js', import.meta.url));
    w._alive = true;
    workerRef.current = w;
    return w;
  };

  // Coerce slot entry -> [r,g,b] or null
  const coerceRGB = useCallback((v) => {
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
  }, []);

  const getImageSignature = useCallback((img) => {
    if (!img) return 'null';
    const map = imageIdentityRef.current;
    let id = map.get(img);
    if (!id) {
      id = `img${++imageIdentitySeqRef.current}`;
      map.set(img, id);
    }
    const src = typeof img.src === 'string' ? img.src : '';
    const size = `${img.naturalWidth || 0}x${img.naturalHeight || 0}`;
    return `${id}:${src}:${size}`;
  }, []);

  const getOverlaySignature = useCallback((extraMasks = []) => {
    if (!Array.isArray(extraMasks) || extraMasks.length === 0) {
      return '';
    }
    return extraMasks
      .map((item, idx) => {
        if (!item) return `null:${idx}`;
        const imgSig = getImageSignature(item.img);
        const pair = Array.isArray(item.pair) ? item.pair.join(',') : 'x';
        const name = item.name || '';
        return `${imgSig}:${name}:${pair}`;
      })
      .join(';');
  }, [getImageSignature]);

  const getSlotsSignature = useCallback((slots = []) => {
    if (!Array.isArray(slots) || slots.length === 0) {
      return '';
    }
    return slots
      .map((slot) => {
        const rgb = coerceRGB(slot);
        if (!rgb) return 'x';
        return `${rgb[0]},${rgb[1]},${rgb[2]}`;
      })
      .join('|');
  }, [coerceRGB]);

  const pastelBlendRGB = useCallback((aRGB, bRGB, opts) => {
    if (!aRGB || !bRGB) return aRGB || bRGB;
    const rA = (aRGB[0] | 0) / 255, gA = (aRGB[1] | 0) / 255, bA = (aRGB[2] | 0) / 255;
    const rB = (bRGB[0] | 0) / 255, gB = (bRGB[1] | 0) / 255, bB = (bRGB[2] | 0) / 255;
    const A = rgb2oklab01(rA, gA, bA), B = rgb2oklab01(rB, gB, bB);
    const LA = A.L, LB = B.L;
    const LCA = oklabToLch(A.L, A.a, A.b), LCB = oklabToLch(B.L, B.a, B.b);
    const CA = LCA.C, CB = LCB.C, HA = LCA.h, HB = LCB.h;
    const kappa = (opts && opts.kappa != null) ? opts.kappa : 0.45;
    const Wdeg = (opts && opts.Wdeg != null) ? opts.Wdeg : 80; // degrees
    const beta = (opts && opts.beta != null) ? opts.beta : 0.06;
    const Cmin = (opts && opts.cmin != null) ? opts.cmin : 0.02;
    // Weighted hue mean
    const dH = wrapPi(HB - HA);
    const Hmix = wrapPi(HA + Math.atan2(Math.sin(dH) * CB, CA + CB * Math.cos(dH)));
    // Lightness pastel
    const Lm = 0.55 * Math.max(LA, LB) + 0.45 * Math.min(LA, LB) + beta * (0.5 - Math.abs(LA - LB));
    let Lmix = Math.max(0, Math.min(1, Lm));
    // Chroma falloff with hue difference
    const W = (Wdeg * Math.PI) / 180;
    const fH = Math.exp(-Math.pow(Math.abs(dH) / W, 2));
    let Cbase = Math.min(CA, CB);
    let Cmix = Math.max(Cmin, Cbase * kappa * fH);
    const O = lchToOklab(Lmix, Cmix, Hmix);
    const [r, g, b] = oklab2rgb01(O.L, O.a, O.b);
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }, []);

  const addMix = (a, b) => {
    if (!a || !b) return null;
    return [
      Math.min(255, (a[0] | 0) + (b[0] | 0)),
      Math.min(255, (a[1] | 0) + (b[1] | 0)),
      Math.min(255, (a[2] | 0) + (b[2] | 0)),
    ];
  };

  const runDraw = useCallback(({ baseImg, maskImg, extraMasks = [], baseCanvasRef, maskCanvasRef, outCanvasRef, slots }) => {
    const src = baseImg || maskImg;
    if (!src) return;

    const jobKeyParts = [
      getImageSignature(baseImg),
      getImageSignature(maskImg),
      getOverlaySignature(extraMasks),
      getSlotsSignature(slots),
      JSON.stringify(params),
      String(overlayStrength ?? ''),
      String(overlayTint ?? '')
    ];
    const jobKey = jobKeyParts.join('||');
    if (jobKey && jobKey === lastJobKeyRef.current) {
      return;
    }

    const w = src.naturalWidth, h = src.naturalHeight;
    const B = baseCanvasRef?.current, M = maskCanvasRef?.current, O = outCanvasRef?.current;
    if (!B || !M || !O) return;
    B.width = w; B.height = h; M.width = w; M.height = h;
    const sameSize = O.width === w && O.height === h;
    if (!sameSize) { O.width = w; O.height = h; }
    const bctx = B.getContext('2d', { willReadFrequently: !0 });
    const mctx = M.getContext('2d', { willReadFrequently: !0 });
    const octx = O.getContext('2d');
    bctx.imageSmoothingEnabled = mctx.imageSmoothingEnabled = octx.imageSmoothingEnabled = !1;
    bctx.clearRect(0, 0, w, h); mctx.clearRect(0, 0, w, h);
    if (!sameSize) octx.clearRect(0, 0, w, h);
    if (baseImg) bctx.drawImage(baseImg, 0, 0, w, h);
    if (maskImg) mctx.drawImage(maskImg, 0, 0, w, h);
    if (!maskImg) {
      octx.drawImage(B, 0, 0);
      lastJobKeyRef.current = jobKey;
      return;
    }

    const base0 = bctx.getImageData(0, 0, w, h);
    const mask0 = mctx.getImageData(0, 0, w, h);

    lastJobKeyRef.current = jobKey;

    let worker;
    try {
      worker = getWorker();
    } catch (e) {
      console.warn('Worker init failed, using main thread:', e);
      try {
        sync.draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots });
      } catch {
        /* ignore fallback draw errors */
      }
      lastJobKeyRef.current = null;
      return;
    }

    const recolorOnce = (baseImageData, maskImageData, slotsOverride, paramsOverride) => {
      return new Promise((resolve, reject) => {
        const jobId = ++jobRef.current;
        const onMessage = (ev) => {
          const msg = ev.data || {};
          if (msg.jobId !== jobId) return;
          if (msg.type === 'recolor:done') {
            worker.removeEventListener('message', onMessage);
            resolve(new ImageData(new Uint8ClampedArray(msg.outBuffer), msg.width, msg.height));
          } else if (msg.type === 'recolor:error') {
            worker.removeEventListener('message', onMessage);
            reject(new Error(String(msg.error || 'worker error')));
          }
        };
        const onError = (e) => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          reject(e);
        };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError, { once: true });

        const payload = {
          jobId,
          width: w,
          height: h,
          base: baseImageData.data.slice(),
          mask: maskImageData.data.slice(),
          slots: slotsOverride,
          params: paramsOverride || params,
        };
        try {
          worker.postMessage({ type: 'recolor', payload });
        } catch (err) {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          reject(err);
        }
      });
    };

    (async () => {
      setBusy(true);
      try {
        let out = await recolorOnce(base0, mask0, slots, params);

        const overlaysArr = extraMasks || [];
        for (let idx = 0; idx < overlaysArr.length; idx++) {
          const item = overlaysArr[idx];
          if (!item?.img) continue;
          mctx.clearRect(0, 0, w, h);
          mctx.drawImage(item.img, 0, 0, w, h);
          const maskN = mctx.getImageData(0, 0, w, h);
          const overlaySlots = [null, null, null, null, null, null];
          const [ia, ib] = Array.isArray(item.pair) ? item.pair : [];
          if (ia == null || ib == null) continue;
          const ca = coerceRGB(slots?.[ia]);
          const cb = coerceRGB(slots?.[ib]);
          if (!ca && !cb) continue;
          const sameColor = !!(ca && cb && ca[0] === cb[0] && ca[1] === cb[1] && ca[2] === cb[2]);
          const isWhite = (c) => c && c[0] >= 245 && c[1] >= 245 && c[2] >= 245;
          const isBlack = (c) => c && c[0] <= 5 && c[1] <= 5 && c[2] <= 5;
          const hasWhitePartner = !!(ca && cb && (isWhite(ca) ^ isWhite(cb)));
          const hasBlackPartner = !!(ca && cb && (isBlack(ca) ^ isBlack(cb)));
          let mix = null;
          const usePastel = (params && params.overlayBlendMode === 'pastel');
          if (hasWhitePartner) {
            mix = isWhite(ca) ? cb : ca;
          } else if (hasBlackPartner) {
            const col = isBlack(ca) ? cb : ca;
            mix = pastelBlendRGB(col, col, { kappa: 0.4, Wdeg: 80, beta: 0.0, cmin: 0.0 });
          } else if (sameColor) {
            mix = ca;
          } else if (ca && cb) {
            if (usePastel) {
              mix = pastelBlendRGB(ca, cb, { kappa: 0.45, Wdeg: 80, beta: 0.06, cmin: 0.02 });
            } else {
              mix = addMix(ca, cb);
              const T = 200;
              const ua = [+(ca[0] >= T), +(ca[1] >= T), +(ca[2] >= T)];
              const ub = [+(cb[0] >= T), +(cb[1] >= T), +(cb[2] >= T)];
              const u = [ua[0] | ub[0], ua[1] | ub[1], ua[2] | ub[2]];
              const present = u[0] + u[1] + u[2];
              if (present >= 2) {
                mix = [u[0] ? 255 : 0, u[1] ? 255 : 0, u[2] ? 255 : 0];
              }
            }
          } else {
            mix = ca || cb;
          }
          let isNearWhite = false;
          if (!sameColor && ca && cb && mix) {
            const M = Math.max(mix[0], mix[1], mix[2]);
            const m = Math.min(mix[0], mix[1], mix[2]);
            isNearWhite = M >= 245 && (M - m) <= 20;
          }
          if (!mix) continue;
          if (!usePastel && isNearWhite) {
            mix = [255, 255, 255];
          }
          overlaySlots[0] = mix;

          const sOV = Math.max(0, Math.min(3, overlayStrength));
          const sEff = Math.min(1, sOV);
          const F_OV = 0.6;
          const overlayParams = hasWhitePartner
            ? {
                ...params,
                speckleClean: 0,
                edgeSmooth: 0,
                feather: F_OV,
                strength: Math.min(1, Math.max(0, overlayTint) * Math.min(1, sOV)),
                blendMode: 'oklab',
                keepLight: 0.96,
                minChroma: 0.0,
                chromaBoost: 0.85,
              }
            : sameColor
            ? {
                ...params,
                speckleClean: 0,
                edgeSmooth: 0,
                feather: F_OV,
                strength: sEff,
                blendMode: 'oklab',
              }
            : isNearWhite && !usePastel
            ? {
                ...params,
                speckleClean: 0,
                edgeSmooth: 0,
                feather: F_OV,
                strength: Math.min(1, 0.8 * sEff),
                blendMode: 'oklab',
                keepLight: 0.98,
                minChroma: 0.0,
                chromaBoost: 0.85,
              }
            : {
                ...params,
                speckleClean: 0,
                edgeSmooth: 0,
                feather: F_OV,
                strength: sEff,
                blendMode: 'oklab',
                ...(usePastel
                  ? { keepLight: Math.max(0.7, 0.92 - 0.08 * sOV), minChroma: 0.0, chromaBoost: 0.9 }
                  : { keepLight: Math.max(0.6, 0.9 - 0.1 * sOV), minChroma: 0.02 + 0.08 * sOV, chromaBoost: 1.0 + 0.6 * sOV }),
              };
          out = await recolorOnce(out, maskN, overlaySlots, overlayParams);
        }

        octx.putImageData(out, 0, 0);
      } catch (err) {
        console.error('Recolor pipeline error:', err);
        lastJobKeyRef.current = null;
        try {
          sync.draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots });
        } catch {
          /* ignore fallback draw errors */
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [params, sync, overlayStrength, overlayTint, pastelBlendRGB, getImageSignature, getOverlaySignature, getSlotsSignature, coerceRGB]);

  const draw = useCallback((args) => {
    pendingArgsRef.current = args;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Debounce to wait until user stops sliding
    debounceRef.current = setTimeout(() => {
      debounceRef.current = 0;
      const a = pendingArgsRef.current;
      if (a) runDraw(a);
    }, 160);
  }, [runDraw]);

  // Redraw when params change (e.g., overlay blend toggled)
  useEffect(() => {
    const a = pendingArgsRef.current;
    if (a) runDraw(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return { draw, busy };
}
