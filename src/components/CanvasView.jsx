// src/components/CanvasView.jsx
import { useEffect, useRef, useState } from 'react';
import { hexToRgb, relLuminance } from '../utils/color';

export default function CanvasView({ outCanvasRef, loading, slots = [], exportBg = '#000', exportText = '#fff' }) {
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

  // Left click: copy ảnh thuần (nhưng fill BG để đồng nhất)
  const onClick = async () => {
    try {
      const src = outCanvasRef.current;
      if (!src) return;
      const W = src.width,
        H = src.height;
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const ctx = off.getContext('2d');
      ctx.fillStyle = exportBg;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(src, 0, 0, W, H);
      const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify('Đã copy ảnh!');
    } catch {
      notify('Copy thất bại');
    }
  };

  // Right click: copy ảnh + palette bên dưới (tăng chiều cao)
  const onContextMenu = async (e) => {
    e.preventDefault();
    try {
      const blob = await exportWithPaletteBlob(outCanvasRef.current, slots, { exportBg, exportText });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify('Đã copy ảnh kèm palette!');
    } catch {
      notify('Copy thất bại');
    }
  };

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      style={{ position: 'relative' }}>
      <div style={{ width: '100%', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>Đang tải ảnh…</div>
        ) : (
          // src/components/CanvasView.jsx (chỉ dòng style canvas)
          <canvas
            ref={outCanvasRef}
            style={{
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: exportBg, // ⬅️ dùng BG export trực tiếp
              cursor: 'copy',
            }}
            onClick={onClick}
            onContextMenu={onContextMenu}
          />
        )}
      </div>

      {/* tooltip */}
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
          Click: copy | Right-click: copy + palette
        </div>
      )}

      {/* toast gần con trỏ */}
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

/** ===== Helpers: export with palette strip (below) ===== */
async function exportWithPaletteBlob(srcCanvas, slots, { exportBg, exportText }) {
  if (!srcCanvas) throw new Error('no canvas');
  const W = srcCanvas.width,
    H = srcCanvas.height;

  // layout strip
  const padX = 16,
    padTop = 10,
    padBottom = 18;
  const gap = 12;
  const sw = 44,
    sh = 44;
  const labelY = 14; // space for "Slot n"
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

  // fill bg then draw original image
  ctx.fillStyle = exportBg;
  ctx.fillRect(0, 0, W, totalH);
  ctx.drawImage(srcCanvas, 0, 0, W, H);

  // draw swatches (no background box)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `12px system-ui, -apple-system, Segoe UI, Roboto`;

  let x = startX,
    y = startY;
  for (let i = 0; i < items; i++) {
    const entry = slots[i];
    // swatch background: color or checker
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
    // id text inside swatch: auto black/white
    if (entry?.hex) {
      const [r, g, b] = hexToRgb(entry.hex);
      const lum = relLuminance(r, g, b);
      ctx.fillStyle = lum > 0.55 ? '#111' : '#fff';
      ctx.fillText(String(entry.index), x + sw / 2, y + sh / 2);
    }
    // slot label below (uses exportText)
    ctx.fillStyle = exportText || '#fff';
    ctx.font = `12px system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.fillText(`Slot ${i}`, x + sw / 2, y + sh + labelY - 4);

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
