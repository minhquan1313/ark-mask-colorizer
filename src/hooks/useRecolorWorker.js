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

  const runDraw = useCallback(({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots }) => {
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

    const base = bctx.getImageData(0, 0, w, h);
    const mask = mctx.getImageData(0, 0, w, h);

    // Fallback path if worker init fails
    let worker;
    try {
      worker = getWorker();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Worker init failed, using main thread:', e);
      sync.draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots });
      return;
    }
    const jobId = ++jobRef.current;
    setBusy(true);

    const onMessage = (ev) => {
      const msg = ev.data || {};
      if (msg.jobId !== jobId) return; // ignore stale
      if (msg.type === 'recolor:done') {
        try {
          const out = new ImageData(new Uint8ClampedArray(msg.outBuffer), msg.width, msg.height);
          octx.putImageData(out, 0, 0);
        } finally {
          setBusy(false);
          worker.removeEventListener('message', onMessage);
        }
      } else if (msg.type === 'recolor:error') {
        // eslint-disable-next-line no-console
        console.error('Worker recolor error:', msg.error);
        setBusy(false);
        worker.removeEventListener('message', onMessage);
      }
    };
    worker.addEventListener('message', onMessage);
    const onError = (e) => {
      // eslint-disable-next-line no-console
      console.error('Worker error:', e && e.message ? e.message : e);
      setBusy(false);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      // keep base placeholder already drawn
      // Fallback to main-thread recolor
      try {
        sync.draw({ baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots });
      } catch {}
    };
    worker.addEventListener('error', onError);
    const onMessageError = (e) => {
      // eslint-disable-next-line no-console
      console.error('Worker message error:', e);
      setBusy(false);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.removeEventListener('messageerror', onMessageError);
    };
    worker.addEventListener('messageerror', onMessageError);

    // Clone data to avoid transfer issues on some browsers/dev servers
    const baseArr = base.data.slice();
    const maskArr = mask.data.slice();
    const payload = {
      jobId,
      width: w,
      height: h,
      base: baseArr,
      mask: maskArr,
      slots,
      params,
    };
    try {
      worker.postMessage({ type: 'recolor', payload });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('postMessage failed:', err);
      setBusy(false);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.removeEventListener('messageerror', onMessageError);
    }
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
