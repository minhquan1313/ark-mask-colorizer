import { useState } from 'react';
import { useI18n } from '../i18n/index.js';
import SlotPicker from './SlotPicker.jsx';

export default function SlotControls({ slots, disabledSet, onPickSlot, onRandomAll, onResetSlots, extraActions, onPasteCmd, onCopyCmd, favorites = [], onToggleFavorite, onResetFavorites }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState(false);

  return (
    <div className="vstack">
      {slots.map((s, i) => (
        <SlotPicker
          key={i}
          slotIndex={i}
          value={s}
          disabled={disabledSet?.has(i)}
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
          title={t('slotControls.copyTitle')}
          aria-live="polite">
          {copyErr ? t('slotControls.copyFailed') : copied ? t('slotControls.copySuccess') : t('slotControls.copy')}
        </button>
      </div>
    </div>
  );
}
