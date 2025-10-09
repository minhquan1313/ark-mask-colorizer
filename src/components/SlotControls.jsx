import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.js';
import SlotPicker from './SlotPicker.jsx';

export default function SlotControls({
  slots,
  disabledSet,
  slotLinks = {},
  onPickSlot,
  onRandomAll,
  onResetSlots,
  extraActions,
  onPasteCmd,
  onCopyCmd,
  favorites = [],
  onToggleFavorite,
  onResetFavorites,
  onReorderFavorites,
  onHighlightSlotsChange,
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const highlightSigRef = useRef('');
  const [openSlot, setOpenSlot] = useState(null);

  const highlightSet = useMemo(() => {
    if (openSlot !== null) {
      return new Set();
    }
    const indices = new Set();
    const resolveLinks = (idx) => {
      if (idx == null) return [];
      const numeric = Number(idx);
      const direct = slotLinks?.[numeric];
      const fallback = slotLinks?.[String(numeric)];
      const arr = Array.isArray(direct) ? direct : Array.isArray(fallback) ? fallback : [];
      return arr;
    };
    const append = (idx) => {
      if (idx == null) return;
      const numeric = Number(idx);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 5) return;
      if (indices.has(numeric)) return;
      indices.add(numeric);
      for (const linked of resolveLinks(numeric)) {
        const linkedIdx = Number(linked);
        if (Number.isInteger(linkedIdx) && linkedIdx >= 0 && linkedIdx <= 5) {
          indices.add(linkedIdx);
        }
      }
    };
    append(hoveredSlot);
    return indices;
  }, [hoveredSlot, openSlot, slotLinks]);

  useEffect(() => {
    if (typeof onHighlightSlotsChange !== 'function') return;
    const arr = Array.from(highlightSet).filter((idx) => Number.isInteger(idx) && idx >= 0 && idx <= 5);
    arr.sort((a, b) => a - b);
    const sig = arr.join(',');
    if (sig === highlightSigRef.current) return;
    highlightSigRef.current = sig;
    onHighlightSlotsChange(arr);
  }, [highlightSet, onHighlightSlotsChange]);

  return (
    <div className="slot-controls">
      <div className="slot-controls__grid">
        {slots.map((s, i) => (
          <SlotPicker
            key={i}
            slotIndex={i}
            value={s}
            disabled={disabledSet?.has(i)}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onResetFavorites={onResetFavorites}
            onReorderFavorites={onReorderFavorites}
            onChange={(v) => onPickSlot(i, v)}
            highlighted={highlightSet.has(i)}
            onHoverChange={(isHovering) =>
              setHoveredSlot((prev) => (isHovering ? i : prev === i ? null : prev))
            }
            onOpenChange={(isOpen) => {
              setOpenSlot((prev) => {
                if (isOpen) return i;
                return prev === i ? null : prev;
              });
            }}
          />
        ))}
      </div>
      <div className="slot-controls__actions">
        <button
          className="btn"
          onClick={onRandomAll}>
          {t('slotControls.random')}
        </button>
        <button
          className="btn"
          onClick={onResetSlots}>
          {t('slotControls.reset')}
        </button>
        {extraActions}
        <button
          className="btn"
          onClick={onPasteCmd}
          title={t('slotControls.pasteTitle')}>
          {t('slotControls.paste')}
        </button>
        <button
          className="btn"
          onClick={async () => {
            try {
              setCopyErr(false);
              if (typeof onCopyCmd === 'function') {
                await onCopyCmd();
              } else {
                const cmds = Array.from({ length: 6 }, (_, idx) => {
                  const v = slots?.[idx];
                  const id = v && typeof v.index !== 'undefined' ? v.index : 255;
                  return `setTargetDinoColor ${idx} ${id}`;
                });
                await navigator.clipboard.writeText(cmds.join(' | '));
              }
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch (e) {
              console.error('Copy Color failed', e);
              setCopyErr(true);
              setTimeout(() => setCopyErr(false), 1500);
            }
          }}
          title={t('slotControls.copyTitle')}
          aria-live="polite">
          {copyErr ? t('slotControls.copyFailed') : copied ? t('slotControls.copySuccess') : t('slotControls.copy')}
        </button>
      </div>
    </div>
  );
}
