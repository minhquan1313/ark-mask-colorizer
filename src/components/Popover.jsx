// src/components/Popover.jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function Popover({ anchorRef, onClose, children }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const width = 360;
    const left = Math.min(Math.max(margin, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - margin);
    const top = rect.bottom + margin;
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const onClick = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        zIndex: 1000,
        top: pos.top,
        left: pos.left,
        width: 360,
        maxHeight: 480,
        overflow: 'auto',
        background: 'var(--surface)', // ⬅️
        color: 'var(--text)', // ⬅️
        border: '1px solid var(--border)', // ⬅️
        borderRadius: 12,
        boxShadow: 'var(--shadow)', // ⬅️
      }}>
      {children}
    </div>
  );
}
