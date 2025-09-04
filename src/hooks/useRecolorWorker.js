// Worker-based recolor to avoid blocking the main thread
import { useMemo, useRef, useState, useCallback } from 'react';
import { useRecolor as useRecolorSync } from './useRecolor.js';

export function useRecolorWorker({ threshold = 80, strength = 1, feather = 0, gamma = 1, keepLight = 0.98, chromaBoost = 1.18, chromaCurve = 0.9, speckleClean = 0.35, edgeSmooth = 0 } = {}) {
  const workerRef = useRef(null);
  const jobRef = useRef(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth }), [threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth]);
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

        // Pass 2+: overlay masks in order; only paint magenta via slot[5]
        const overlaysArr = extraMasks || [];
        for (let idx = 0; idx < overlaysArr.length; idx++) {
          const item = overlaysArr[idx];
          if (!item?.img) continue;
          // Prepare mask image data
          mctx.clearRect(0, 0, w, h);
          mctx.drawImage(item.img, 0, 0, w, h);
          const maskN = mctx.getImageData(0, 0, w, h);
          // Gate to magenta stripes using HSV hue around 300deg
          {
            const d = maskN.data;
            let kept = 0;
            for (let p = 0; p < d.length; p += 4) {
              const r = d[p] / 255, g = d[p + 1] / 255, b = d[p + 2] / 255;
              const max = Math.max(r, g, b), min = Math.min(r, g, b);
              const delta = max - min;
              let hue = 0;
              if (delta > 1e-6) {
                if (max === r) hue = 60 * (((g - b) / delta) % 6);
                else if (max === g) hue = 60 * (((b - r) / delta) + 2);
                else hue = 60 * (((r - g) / delta) + 4);
              }
              if (hue < 0) hue += 360;
              const sat = max <= 1e-6 ? 0 : delta / max;
              // magenta ~300deg +/- 40deg, allow anti-aliased edges
              const isMag = (sat >= 0.2) && (max >= 0.15) && (hue >= 260 && hue <= 340);
              if (!isMag) {
                d[p] = d[p + 1] = d[p + 2] = 0;
              } else {
                // normalize to pure magenta to maximize confidence/seed
                d[p] = 255; d[p + 1] = 0; d[p + 2] = 255;
                kept++;
              }
            }
            const minKeep = Math.max(100, Math.floor(w * h * 0.0002));
            if (kept < minKeep) {
              // Fall back to original (no gating) if mask appears different
              mctx.clearRect(0, 0, w, h);
              mctx.drawImage(item.img, 0, 0, w, h);
              const m2 = mctx.getImageData(0, 0, w, h);
              maskN.data.set(m2.data);
            }
          }

          // Compute additive mix from pair indices
          const [ia, ib] = Array.isArray(item.pair) ? item.pair : [];
          if (ia == null || ib == null) continue;
          const ca = coerceRGB(slots?.[ia]);
          const cb = coerceRGB(slots?.[ib]);
          if (!ca || !cb) continue;
          let mix = addMix(ca, cb);
          // If additive result is near-white (low chroma, very bright),
          // switch to a softer blend (screen) and avoid pure 255 to reduce chalky look.
          if (mix) {
            const M = Math.max(mix[0], mix[1], mix[2]);
            const m = Math.min(mix[0], mix[1], mix[2]);
            const nearWhite = M >= 240 && (M - m) <= 24;
            if (nearWhite) {
              const scr = [
                255 - Math.round(((255 - ca[0]) * (255 - cb[0])) / 255),
                255 - Math.round(((255 - ca[1]) * (255 - cb[1])) / 255),
                255 - Math.round(((255 - ca[2]) * (255 - cb[2])) / 255),
              ];
              // Nudge down from pure white to keep texture
              mix = scr.map((v) => (v >= 255 ? 252 : v));
            }
          }
          if (!mix) continue;

          const overlaySlots = [null, null, null, null, null, null];
          overlaySlots[5] = mix; // only magenta channel active

          // Overlays: avoid cumulative smoothing/cleaning which causes haze and blur
          const overlayParams = {
            ...params,
            speckleClean: 0,
            // enable final smoothing only on the last overlay pass
            edgeSmooth: idx === overlaysArr.length - 1 ? (params.edgeSmooth || 0) : 0,
            feather: 0,
            // use the same light/chroma settings as user to avoid unintended dulling
            strength: 1,
            blendMode: 'overlayRGB',
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
  }, [params, sync]);

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
