// @ts-nocheck
// src/components/Popover.jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const MARGIN = 8;
const MAX_WIDTH = 360;
const MAX_HEIGHT = 480;

export default function Popover({ anchorRef, onClose, children, className = '', style = {} }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: MAX_WIDTH, maxHeight: MAX_HEIGHT });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef?.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const anchorRect = anchor.getBoundingClientRect();
      const panelWidth = Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2);
      const maxHeight = Math.min(MAX_HEIGHT, window.innerHeight - MARGIN * 2);

      panel.style.width = `${panelWidth}px`;
      panel.style.maxHeight = `${maxHeight}px`;

      const panelHeight = Math.min(panel.offsetHeight, maxHeight);

      const spaceBelow = window.innerHeight - anchorRect.bottom - MARGIN;
      const spaceAbove = anchorRect.top - MARGIN;
      const spaceRight = window.innerWidth - anchorRect.right - MARGIN;
      const spaceLeft = anchorRect.left - MARGIN;

      const clampHorizontal = (value) => Math.min(Math.max(MARGIN, value), Math.max(MARGIN, window.innerWidth - panelWidth - MARGIN));
      const clampVertical = (value) => Math.min(Math.max(MARGIN, value), Math.max(MARGIN, window.innerHeight - panelHeight - MARGIN));

      let top;
      let left;

      if (spaceBelow >= panelHeight) {
        top = clampVertical(anchorRect.bottom + MARGIN);
        left = clampHorizontal(anchorRect.left + anchorRect.width / 2 - panelWidth / 2);
      } else if (spaceAbove >= panelHeight) {
        top = clampVertical(anchorRect.top - panelHeight - MARGIN);
        left = clampHorizontal(anchorRect.left + anchorRect.width / 2 - panelWidth / 2);
      } else if (spaceRight >= panelWidth || spaceRight >= spaceLeft) {
        left = clampHorizontal(anchorRect.right + MARGIN);
        top = clampVertical(anchorRect.top + anchorRect.height / 2 - panelHeight / 2);
      } else {
        left = clampHorizontal(anchorRect.left - panelWidth - MARGIN);
        top = clampVertical(anchorRect.top + anchorRect.height / 2 - panelHeight / 2);
      }

      setPos({ top, left, width: panelWidth, maxHeight });
    };

    updatePosition();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null;
    if (resizeObserver && panelRef.current) {
      resizeObserver.observe(panelRef.current);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const onClick = (e) => {
      if (!panelRef.current) return;
      const anchor = anchorRef?.current;
      const clickedInsidePanel = panelRef.current.contains(e.target);
      const clickedAnchor = anchor ? anchor.contains(e.target) : false;
      if (!clickedInsidePanel && !clickedAnchor) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [anchorRef, onClose]);

  return (
    <div
      ref={panelRef}
      className={className}
      style={{
        position: 'fixed',
        zIndex: 1000,
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        overflow: 'auto',
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow)',
        ...(style || {}),
      }}>
      {children}
    </div>
  );
}
