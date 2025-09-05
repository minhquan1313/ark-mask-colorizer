// Worker-based recolor to avoid blocking the main thread
import { useMemo, useRef, useState, useCallback } from 'react';
import { useRecolor as useRecolorSync } from './useRecolor.js';

export function useRecolorWorker({ threshold = 80, strength = 1, feather = 0, gamma = 1, keepLight = 0.98, chromaBoost = 1.18, chromaCurve = 0.9, speckleClean = 0.35, edgeSmooth = 0, boundaryBlend = 0.28, overlayStrength = 1, overlayTint = 0.25 } = {}) {
  const workerRef = useRef(null);
  const jobRef = useRef(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend }), [threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend]);
  const sync = useMemo(() => useRecolorSync(params), [params]);
  const debounceRef = useRef(0);
  const pendingArgsRef = useRef(null);

  const getWorker = () => {
    if (workerRef.current && workerRef.current._alive) return workerRef.current;
    // Use classic worker for broader compatibility with dev servers
    const w = new Worker(new URL('../workers/recolorWorker.js', import.meta.url));
    w._alive = true;
    workerRef.current = w;
    return w;
  };

  // Coerce slot entry -> [r,g,b] or null
  const coerceRGB = (v) => {
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
  };

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
    // Do not clear the output canvas if size unchanged to avoid flicker
    if (!sameSize) octx.clearRect(0, 0, w, h);
    if (baseImg) bctx.drawImage(baseImg, 0, 0, w, h);
    if (maskImg) mctx.drawImage(maskImg, 0, 0, w, h);
    if (!maskImg) { octx.drawImage(B, 0, 0); return; }
    // Keep previous recolored image on screen; only show spinner overlay

    const base0 = bctx.getImageData(0, 0, w, h);
    const mask0 = mctx.getImageData(0, 0, w, h);

    // Fallback path if worker init fails (single mask only)
    let worker;
    try {
      worker = getWorker();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Worker init failed, using main thread:', e);
      try { sync.draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots }); } catch {}
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
        // Pass 1: primary mask with user-selected slots
        let out = await recolorOnce(base0, mask0, slots, params);

        // Pass 2+: overlay masks in order; overlays are RED-only masks now
        const overlaysArr = extraMasks || [];
        for (let idx = 0; idx < overlaysArr.length; idx++) {
          const item = overlaysArr[idx];
          if (!item?.img) continue;
          // Prepare mask image data (red + black only, no hue gating needed)
          mctx.clearRect(0, 0, w, h);
          mctx.drawImage(item.img, 0, 0, w, h);
          const maskN = mctx.getImageData(0, 0, w, h);
          // Overlays are red-only masks: fill RED channel with additive mix of two slots from filename (_m_xy)
          const overlaySlots = [null, null, null, null, null, null];
          const [ia, ib] = Array.isArray(item.pair) ? item.pair : [];
          if (ia == null || ib == null) continue;
          const ca = coerceRGB(slots?.[ia]);
          const cb = coerceRGB(slots?.[ib]);
          if (!ca && !cb) continue;
          const sameColor = !!(ca && cb && ca[0] === cb[0] && ca[1] === cb[1] && ca[2] === cb[2]);
          const isWhite = (c) => c && c[0] >= 245 && c[1] >= 245 && c[2] >= 245;
          const hasWhitePartner = !!(ca && cb && (isWhite(ca) ^ isWhite(cb)));
          // White partner -> treat as tint of the other color (avoid additive to white)
          let mix = hasWhitePartner
            ? (isWhite(ca) ? cb : ca)
            : (sameColor ? ca : (ca && cb) ? addMix(ca, cb) : (ca || cb));
          let isNearWhite = false;
          // Only treat as near-white when it's a true additive combination of two different colors
          if (!sameColor && ca && cb && mix) {
            const M = Math.max(mix[0], mix[1], mix[2]);
            const m = Math.min(mix[0], mix[1], mix[2]);
            isNearWhite = M >= 245 && (M - m) <= 20; // very bright, low chroma
          }
          if (!mix) continue;
          overlaySlots[0] = mix; // only RED channel active

          // Overlays: avoid cumulative smoothing/cleaning which causes haze and blur
          const sOV = Math.max(0, Math.min(3, overlayStrength));
          // Same-color no longer forces zero; always use slider-derived strength
          const sEff = Math.min(1, sOV);
          const overlayParams = hasWhitePartner
            ? {
                ...params,
                speckleClean: 0,
                edgeSmooth: 0,
                feather: 0,
                strength: Math.min(1, Math.max(0, overlayTint) * Math.min(1, sOV)),
                blendMode: 'oklab',
                // White partner: make it a very light tint of the other color
                keepLight: 0.96,
                minChroma: 0.0,
                chromaBoost: 0.85,
              }
            : sameColor
            ? {
                ...params,
                speckleClean: 0,
                edgeSmooth: 0,
                feather: 0,
                strength: sEff,
                blendMode: 'oklab',
                // do NOT override keepLight/minChroma/chromaBoost when colors are identical
              }
            : {
                ...params,
                speckleClean: 0,
                // disable smoothing on overlays to avoid global haze
                edgeSmooth: 0,
                feather: 0,
                // intensity control (kBase uses 0..1); keep within 0..1 for stability
                strength: sEff,
                // Colorfulness controls scale with overlayStrength for visible effect
                blendMode: 'oklab',
                keepLight: Math.max(0.6, 0.9 - 0.1 * sOV),
                minChroma: 0.02 + 0.08 * sOV,
                chromaBoost: 1.0 + 0.6 * sOV,
              };
          out = await recolorOnce(out, maskN, overlaySlots, overlayParams);
        }

        // Draw final image
        octx.putImageData(out, 0, 0);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Recolor pipeline error:', err);
        try { sync.draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots }); } catch {}
      } finally {
        setBusy(false);
      }
    })();
  }, [params, sync, overlayStrength, overlayTint]);

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

  return { draw, busy };
}
