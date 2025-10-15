import { Button, Space } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import SlotPicker from './SlotPicker';

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
  controlsDisabled = false,
  copyDisabledSet = null,
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
    const arr = hoveredSlot != null && Number.isInteger(hoveredSlot) && hoveredSlot >= 0 && hoveredSlot <= 5 ? [Number(hoveredSlot)] : [];
    const sig = arr.join(',');
    if (sig === highlightSigRef.current) return;
    highlightSigRef.current = sig;
    onHighlightSlotsChange(arr);
  }, [hoveredSlot, onHighlightSlotsChange]);

  return (
    <div className="slot-controls">
      <div className="slot-controls__grid">
        {slots.map((s, i) => (
          <SlotPicker
            key={i}
            slotIndex={i}
            value={s}
            disabled={controlsDisabled || disabledSet?.has(i)}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onResetFavorites={onResetFavorites}
            onReorderFavorites={onReorderFavorites}
            onChange={(v) => onPickSlot(i, v)}
            highlighted={highlightSet.has(i)}
            onHoverChange={(isHovering) => setHoveredSlot((prev) => (isHovering ? i : prev === i ? null : prev))}
            onOpenChange={(isOpen) => {
              setOpenSlot((prev) => {
                if (isOpen) return i;
                return prev === i ? null : prev;
              });
            }}
          />
        ))}
      </div>

      <Space.Compact
        block
        className="slot-controls__actions"
        style={{
          flex: 1,
          width: '100%',
          justifyContent: 'space-between',
          overflowX: 'auto',
        }}>
        <Button
          block
          onClick={onRandomAll}>
          {t('slotControls.random')}
        </Button>
        <Button
          block
          onClick={onResetSlots}>
          {t('slotControls.reset')}
        </Button>
        {!controlsDisabled ? extraActions : null}
        <Button
          block
          onClick={onPasteCmd}
          title={t('slotControls.pasteTitle')}>
          {t('slotControls.paste')}
        </Button>
        <Button
          block
          onClick={async () => {
            try {
              setCopyErr(false);
              if (typeof onCopyCmd === 'function') {
                await onCopyCmd();
              } else {
                const skip = copyDisabledSet instanceof Set ? copyDisabledSet : null;
                const cmds = [];
                for (let idx = 0; idx < 6; idx++) {
                  if (skip?.has(idx)) continue;
                  const v = slots?.[idx];
                  const id = v && typeof v.index !== 'undefined' ? v.index : null;
                  if (id == null) continue;
                  cmds.push(`setTargetDinoColor ${idx} ${id}`);
                }
                if (!cmds.length) {
                  throw new Error('No colors to copy');
                }
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
        </Button>
      </Space.Compact>
    </div>
  );
}
