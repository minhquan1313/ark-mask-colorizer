// src/components/SlotControls.jsx
import { useState } from 'react';
import SlotPicker from './SlotPicker.jsx';

export default function SlotControls({ slots, disabledSet, onPickSlot, onRandomAll, onResetSlots, extraActions, onPasteCmd, onCopyCmd, favorites = [], onToggleFavorite, onResetFavorites }) {
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState(false);
  return (
    <div className="vstack">
      {slots.map((s, i) => (
        <SlotPicker
          key={i}
          slotIndex={i}
          value={s}
          disabled={disabledSet?.has(i)} // ⬅️ disable theo noMask
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onResetFavorites={onResetFavorites}
          onChange={(v) => onPickSlot(i, v)}
        />
      ))}
      <div
        className="hstack"
        style={{ gap: 8, marginTop: 8 }}>
        <button
          className="btn"
          onClick={onRandomAll}>
          Random
        </button>
        <button
          className="btn"
          onClick={onResetSlots}>
          Reset
        </button>
        {extraActions /* ⬅️ “Fill” popover gắn từ App */}
        <button
          className="btn"
          onClick={onPasteCmd}
          title="Paste Color">
          Paste Color
        </button>
        <button
          className="btn"
          onClick={async () => {
            try {
              setCopyErr(false);
              if (typeof onCopyCmd === 'function') {
                await onCopyCmd();
              } else {
                const cmds = Array.from({ length: 6 }, (_, i) => {
                  const v = slots?.[i];
                  const id = v && typeof v.index !== 'undefined' ? v.index : 255;
                  return `setTargetDinoColor ${i} ${id}`;
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
          title="Copy Color"
          aria-live="polite">
          {copyErr ? 'Failed' : copied ? '✓ Copied' : 'Copy Color'}
        </button>
      </div>
    </div>
  );
}

