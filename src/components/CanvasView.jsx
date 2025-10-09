import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.js';
import { hexToRgb, relLuminance } from '../utils/color';

const SLOT_REFERENCE_VECTORS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
].map((vector) => {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length > 0 ? [vector[0] / length, vector[1] / length, vector[2] / length] : vector;
});

const MIN_CHROMA = 4;

function resolveMaskSlot(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (chroma < MIN_CHROMA) {
    return { index: -1, chroma: 0 };
  }
  let rx = r - min;
  let gx = g - min;
  let bx = b - min;
  const norm = Math.hypot(rx, gx, bx);
  if (norm <= 1e-6) {
    return { index: -1, chroma: 0 };
  }
  rx /= norm;
  gx /= norm;
  bx /= norm;

  let bestIndex = -1;
  let bestScore = -Infinity;
  for (let s = 0; s < SLOT_REFERENCE_VECTORS.length; s++) {
    const ref = SLOT_REFERENCE_VECTORS[s];
    const score = rx * ref[0] + gx * ref[1] + bx * ref[2];
    if (score > bestScore) {
      bestScore = score;
      bestIndex = s;
    }
  }
  return { index: bestIndex, chroma };
}

export default function CanvasView({
  outCanvasRef,
  loading,
  busy = false,
  slots = [],
  exportBg = '#000',
  exportText = '#fff',
  maskImg,
  baseCanvasRef,
  baseImg,
  highlightSlots = [],
}) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const highlightCanvasRef = useRef(null);
  const maskImageDataRef = useRef(null);
  const maskImageKeyRef = useRef(null);
  const [maskVersion, setMaskVersion] = useState(0);
  const [hint, setHint] = useState(false);
  const [toast, setToast] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onEnter = () => setHint(true);
    const onLeave = () => setHint(false);
    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    wrap.addEventListener('mouseenter', onEnter);
    wrap.addEventListener('mouseleave', onLeave);
    wrap.addEventListener('mousemove', onMove);
    return () => {
      wrap.removeEventListener('mouseenter', onEnter);
      wrap.removeEventListener('mouseleave', onLeave);
      wrap.removeEventListener('mousemove', onMove);
    };
  }, []);

  useEffect(() => {
    if (!maskImg || !maskImg.complete) {
      maskImageDataRef.current = null;
      maskImageKeyRef.current = null;
      return;
    }
    const key = `${maskImg.src || ''}|${maskImg.naturalWidth}x${maskImg.naturalHeight}|${maskImg.currentSrc || ''}`;
    if (maskImageKeyRef.current === key && maskImageDataRef.current) {
      return;
    }
    try {
      const off = document.createElement('canvas');
      off.width = maskImg.naturalWidth || maskImg.width || 0;
      off.height = maskImg.naturalHeight || maskImg.height || 0;
      if (!off.width || !off.height) {
        maskImageDataRef.current = null;
        maskImageKeyRef.current = null;
        return;
      }
      const offCtx = off.getContext('2d');
      if (!offCtx) {
        maskImageDataRef.current = null;
        maskImageKeyRef.current = null;
        return;
      }
      offCtx.clearRect(0, 0, off.width, off.height);
      offCtx.drawImage(maskImg, 0, 0, off.width, off.height);
      const imageData = offCtx.getImageData(0, 0, off.width, off.height);
      maskImageDataRef.current = imageData;
      maskImageKeyRef.current = key;
      setMaskVersion((value) => value + 1);
    } catch {
      maskImageDataRef.current = null;
      maskImageKeyRef.current = null;
      setMaskVersion((value) => value + 1);
    }
  }, [maskImg]);

  useEffect(() => {
    const overlay = highlightCanvasRef.current;
    const outputCanvas = outCanvasRef?.current;
    if (!overlay || !outputCanvas) return;

    const width = outputCanvas.width || 0;
    const height = outputCanvas.height || 0;

    const resetOverlay = (w = width, h = height) => {
      overlay.width = w;
      overlay.height = h;
      const ctx = overlay.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, w, h);
    };

    if (!width || !height) {
      resetOverlay(overlay.width || 0, overlay.height || 0);
      return;
    }

    if (maskImg && !maskImg.complete) {
      resetOverlay();
      return;
    }

    const highlightSet = new Set(
      Array.isArray(highlightSlots)
        ? highlightSlots
            .map((idx) => Number(idx))
            .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx <= 5)
        : []
    );
    if (loading || busy || highlightSet.size === 0) {
      resetOverlay();
      return;
    }

    const maskData = maskImageDataRef.current;
    if (!maskData || maskData.width !== width || maskData.height !== height) {
      resetOverlay();
      return;
    }

    const alphaBuffer = new Uint8ClampedArray(width * height);
    const src = maskData.data;
    let painted = false;
    for (let i = 0, len = width * height; i < len; i++) {
      const p = i * 4;
      const { index, chroma } = resolveMaskSlot(src[p], src[p + 1], src[p + 2]);
      if (index === -1 || !highlightSet.has(index)) continue;
      const alpha = Math.max(90, Math.min(220, Math.round((chroma / 255) * 255)));
      if (alpha > alphaBuffer[i]) {
        alphaBuffer[i] = alpha;
        painted = true;
      }
    }

    if (!painted) {
      resetOverlay();
      return;
    }

    overlay.width = width;
    overlay.height = height;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const baseCanvas = baseCanvasRef?.current;
    const baseCanvasReady = baseCanvas && baseCanvas.width === width && baseCanvas.height === height;
    const baseImageReady = baseImg && baseImg.complete;

    if (baseCanvasReady) {
      ctx.drawImage(baseCanvas, 0, 0, width, height);
    } else if (baseImageReady) {
      ctx.drawImage(baseImg, 0, 0, width, height);
    } else {
      resetOverlay();
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      resetOverlay();
      return;
    }

    const overlayImage = tempCtx.createImageData(width, height);
    const dst = overlayImage.data;
    let hasAlpha = false;
    for (let i = 0, len = alphaBuffer.length; i < len; i++) {
      const alpha = alphaBuffer[i];
      if (!alpha) continue;
      const p = i * 4;
      dst[p + 3] = alpha;
      hasAlpha = true;
    }

    if (!hasAlpha) {
      resetOverlay();
      return;
    }

    tempCtx.putImageData(overlayImage, 0, 0);
    const prevComposite = tempCtx.globalCompositeOperation;
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = 'rgba(255, 48, 48, 0.88)';
    tempCtx.fillRect(0, 0, width, height);
    tempCtx.globalCompositeOperation = prevComposite || 'source-over';

    ctx.drawImage(tempCanvas, 0, 0);
  }, [baseCanvasRef, baseImg, busy, highlightSlots, loading, maskImg, maskVersion, outCanvasRef]);

  const notify = (text) => {
    setToast({ text, t: Date.now() });
    setTimeout(() => setToast(null), 1200);
  };

  const onClick = async () => {
    try {
      const src = outCanvasRef.current;
      if (!src) return;
      const W = src.width;
      const H = src.height;
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const ctx = off.getContext('2d');
      if (exportBg && exportBg !== 'transparent') {
        ctx.fillStyle = exportBg;
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      ctx.drawImage(src, 0, 0, W, H);
      const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify(t('canvas.copyImageSuccess'));
    } catch {
      notify(t('canvas.copyError'));
    }
  };

  const onContextMenu = async (e) => {
    e.preventDefault();
    try {
      const blob = await exportWithPaletteBlob(outCanvasRef.current, slots, {
        exportBg,
        exportText,
        slotLabel: (index) => t('canvas.slotLabel', { index }),
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify(t('canvas.copyWithPaletteSuccess'));
    } catch {
      notify(t('canvas.copyError'));
    }
  };

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      style={{ position: 'relative' }}>
      <div style={{ width: '100%', overflow: 'auto', position: 'relative' }}>
        {loading ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 12,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.04) 63%)',
              backgroundSize: '400% 100%',
              animation: 'shimmer 1.2s ease-in-out infinite',
            }}>
            <div
              aria-busy
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 28,
                height: 28,
                border: '2px solid var(--border)',
                borderTopColor: 'var(--text)',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: exportBg,
              overflow: 'hidden',
            }}>
            <canvas
              ref={outCanvasRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'contain',
                borderRadius: 12,
                cursor: 'copy',
              }}
              onClick={onClick}
              onContextMenu={onContextMenu}
            />
            <canvas
              ref={highlightCanvasRef}
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                borderRadius: 12,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          </div>
        )}
      </div>

      {!loading && busy && (
        <div
          aria-busy
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--text)',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
            background: 'rgba(0,0,0,0.0)',
          }}
        />
      )}

      {!loading && hint && (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: 12,
            padding: '6px 8px',
            borderRadius: 8,
            pointerEvents: 'none',
          }}>
          {t('canvas.hint')}
        </div>
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: mouse.x,
            top: mouse.y - 22,
            transform: 'translate(-50%, -100%)',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '6px 10px',
            boxShadow: 'var(--shadow)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

async function exportWithPaletteBlob(srcCanvas, slots, { exportBg, exportText, slotLabel }) {
  if (!srcCanvas) throw new Error('no canvas');
  const W = srcCanvas.width;
  const H = srcCanvas.height;

  const padX = 16;
  const padTop = 10;
  const padBottom = 18;
  const gap = 12;
  const sw = 44;
  const sh = 44;
  const labelY = 14;
  const items = 6;
  const contentW = items * sw + (items - 1) * gap;
  const stripW = Math.min(W - padX * 2, contentW);
  const startX = Math.round((W - stripW) / 2);
  const startY = H + padTop;

  const totalH = H + padTop + sh + labelY + padBottom;

  const off = document.createElement('canvas');
  off.width = W;
  off.height = totalH;
  const ctx = off.getContext('2d');

  if (exportBg && exportBg !== 'transparent') {
    ctx.fillStyle = exportBg;
    ctx.fillRect(0, 0, W, totalH);
  } else {
    ctx.clearRect(0, 0, W, totalH);
  }
  ctx.drawImage(srcCanvas, 0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `12px system-ui, -apple-system, Segoe UI, Roboto`;

  let x = startX;
  const y = startY;
  for (let i = 0; i < items; i++) {
    const entry = slots[i];
    if (entry?.hex) {
      ctx.fillStyle = entry.hex;
      roundRect(ctx, x, y, sw, sh, 8);
      ctx.fill();
    } else {
      drawChecker(ctx, x, y, sw, sh, 8);
      ctx.strokeStyle = '#ccc';
      roundRect(ctx, x, y, sw, sh, 8);
      ctx.stroke();
    }
    if (entry?.hex) {
      const [r, g, b] = hexToRgb(entry.hex);
      const lum = relLuminance(r, g, b);
      ctx.fillStyle = lum > 0.55 ? '#111' : '#fff';
      ctx.fillText(String(entry.index), x + sw / 2, y + sh / 2);
    }
    ctx.fillStyle = exportText || '#fff';
    ctx.font = `12px system-ui, -apple-system, Segoe UI, Roboto`;
    const labelText = typeof slotLabel === 'function' ? slotLabel(i) : `Slot ${i}`;
    ctx.fillText(labelText, x + sw / 2, y + sh + labelY - 4);

    x += sw + gap;
  }

  return await new Promise((res) => off.toBlob(res, 'image/png'));
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function drawChecker(c, x, y, w, h, size) {
  c.save();
  c.fillStyle = '#cfcfcf';
  c.fillRect(x, y, w, h);
  c.fillStyle = '#e9e9e9';
  for (let yy = 0; yy < h; yy += size) {
    for (let xx = Math.floor(yy / size) % 2 === 0 ? 0 : size; xx < w; xx += size * 2) {
      c.fillRect(x + xx, y + yy, size, size);
    }
  }
  c.restore();
}

if (typeof document !== 'undefined' && !document.getElementById('cv-spin-style')) {
  const style = document.createElement('style');
  style.id = 'cv-spin-style';
  style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
  document.head.appendChild(style);
}
