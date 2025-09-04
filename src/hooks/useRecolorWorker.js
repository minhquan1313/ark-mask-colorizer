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
        for (const item of extraMasks || []) {
          if (!item?.img) continue;
          // Prepare mask image data
          mctx.clearRect(0, 0, w, h);
          mctx.drawImage(item.img, 0, 0, w, h);
          const maskN = mctx.getImageData(0, 0, w, h);

          // Restrict overlay strictly to magenta-coded areas to avoid spill/misalignment
          // Keep only pixels close to magenta; zero out others
          {
            const d = maskN.data;
            for (let p = 0; p < d.length; p += 4) {
              const r = d[p], g = d[p + 1], b = d[p + 2];
              // Heuristic: strong magenta if R and B high, G low, R~B
              const mag = r >= 150 && b >= 150 && g <= 80 && Math.abs(r - b) <= 64;
              if (!mag) {
                d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; // drop non-magenta
              } else {
                d[p] = 255; d[p + 1] = 0; d[p + 2] = 255; // normalize to pure magenta
              }
            }
          }

          // Compute additive mix from pair indices
          const [ia, ib] = Array.isArray(item.pair) ? item.pair : [];
          if (ia == null || ib == null) continue;
          const ca = coerceRGB(slots?.[ia]);
          const cb = coerceRGB(slots?.[ib]);
          if (!ca || !cb) continue;
          const mix = addMix(ca, cb);
          if (!mix) continue;

          const overlaySlots = [null, null, null, null, null, null];
          overlaySlots[5] = mix; // only magenta channel active

          // Overlays: avoid cumulative smoothing/cleaning which causes haze and blur
          const overlayParams = { ...params, speckleClean: 0, edgeSmooth: 0, feather: 0 };
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
