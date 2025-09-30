import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.js';
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';
import PaletteGrid from './PaletteGrid';
import Popover from './Popover';

const findByIndex = (idx) => ARK_PALETTE.find((p) => String(p.index) === String(idx)) || null;

export default function SlotPicker({
  slotIndex,
  value,
  onChange,
  disabled = false,
  favorites = [],
  onToggleFavorite,
  onResetFavorites,
  onReorderFavorites,
  onHoverChange,
  onOpenChange,
  highlighted = false,
}) {
  const { t } = useI18n();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [idDraft, setIdDraft] = useState(value ? String(value.index) : '');

  useEffect(() => {
    setIdDraft(value ? String(value.index) : '');
  }, [value]);

  useEffect(() => {
    if (typeof onOpenChange === 'function') {
      onOpenChange(open && !disabled);
    }
  }, [open, disabled, onOpenChange]);

  const notifyHover = (state) => {
    if (typeof onHoverChange === 'function') {
      onHoverChange(state);
    }
  };

  const handlePick = (entryOrNull) => {
    if (disabled) return;
    onChange(entryOrNull || null);
    setIdDraft(entryOrNull ? String(entryOrNull.index) : '');
    setOpen(false);
  };

  const onIdChange = (e) => {
    if (disabled) return;
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setIdDraft(onlyDigits);
    if (onlyDigits === '' || onlyDigits === '255') {
      onChange(null);
      return;
    }
    const found = findByIndex(onlyDigits);
    if (found) onChange(found);
  };
  const onIdBlur = () => {
    if (disabled) return;
    if (idDraft === '' || idDraft === '255') return;
    const found = findByIndex(idDraft);
    if (!found) setIdDraft(value ? String(value.index) : '');
  };

  const idTextColor = (() => {
    if (!value?.hex) return '#fff';
    const [r, g, b] = hexToRgb(value.hex);
    return relLuminance(r, g, b) > 0.55 ? '#111' : '#fff';
  })();

  const buttonStyle = {
    background: value?.hex || 'transparent',
    color: idTextColor,
  };

  const containerClass = ['slot-picker'];
  if (disabled) containerClass.push('is-disabled');
  if (highlighted) containerClass.push('is-highlighted');

  return (
    <div
      className={containerClass.join(' ')}
      onMouseEnter={() => !disabled && notifyHover(true)}
      onMouseLeave={() => notifyHover(false)}>
      <div className="slot-picker__index">{slotIndex}</div>
      <div className="slot-picker__swatch">
        <button
          ref={anchorRef}
          type="button"
          className="slot-picker__button"
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onFocus={() => !disabled && notifyHover(true)}
          onBlur={() => notifyHover(false)}
          title={value ? `${value.index} - ${value.name}` : disabled ? t('slotPicker.noMask') : t('slotPicker.pickColor')}
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          style={buttonStyle}>
          {value?.index ?? '-'}
        </button>
        <button
          type="button"
          className="slot-picker__clear"
          onClick={() => {
            if (!disabled) {
              onChange(null);
              setIdDraft('');
            }
          }}
          aria-label={t('slotPicker.clearLabel')}
          title={disabled ? t('slotPicker.noMask') : t('slotPicker.clear')}
          disabled={disabled}>
          <span aria-hidden>X</span>
        </button>
      </div>

      <input
        className="slot-picker__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={t('slotPicker.idPlaceholder')}
        value={idDraft}
        onChange={onIdChange}
        onBlur={onIdBlur}
        autoComplete="off"
        disabled={disabled}
      />

      {open && !disabled && (
        <Popover
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}>
          <div style={{ padding: 10 }}>
            <PaletteGrid
              big
              showIndex
              favorites={favorites}
              onPick={handlePick}
              onToggleFavorite={onToggleFavorite}
              onResetFavorites={onResetFavorites}
              onReorderFavorites={onReorderFavorites}
            />
          </div>
        </Popover>
      )}
    </div>
  );
}
