import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.js';
import { hexToRgb, relLuminance } from '../utils/color';

export default function CanvasView({ outCanvasRef, loading, busy = false, slots = [], exportBg = '#000', exportText = '#fff' }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
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
