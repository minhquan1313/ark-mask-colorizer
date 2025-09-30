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

  const applyDraft = (draft) => {
    const sanitized = draft.replace(/[^0-9]/g, '').slice(0, 3);
    setIdDraft(sanitized);
    if (sanitized === '' || sanitized === '255') {
      onChange(null);
      return;
    }
    const found = findByIndex(sanitized);
    if (found) {
      onChange(found);
    }
  };

  const confirmDraft = () => {
    if (disabled) return;
    if (idDraft === '' || idDraft === '255') {
      onChange(null);
      setIdDraft('');
      return;
    }
    const found = findByIndex(idDraft);
    if (!found) {
      setIdDraft(value ? String(value.index) : '');
    }
  };

  const handlePick = (entryOrNull) => {
    if (disabled) return;
    onChange(entryOrNull || null);
    setIdDraft(entryOrNull ? String(entryOrNull.index) : '');
    setOpen(false);
  };

  const idTextColor = (() => {
    if (!value?.hex) return '#fff';
    const [r, g, b] = hexToRgb(value.hex);
    return relLuminance(r, g, b) > 0.55 ? '#111' : '#fff';
  })();

  const inputStyle = {
    background: value?.hex || 'transparent',
    color: idTextColor,
  };

  const displayText = idDraft !== '' ? idDraft : value?.index ?? '';

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmDraft();
      setOpen(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIdDraft(value ? String(value.index) : '');
      setOpen(false);
    }
  };

  const handleChange = (event) => {
    if (disabled) return;
    applyDraft(event.target.value);
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
        <input
          ref={anchorRef}
          type="text"
          className="slot-picker__input-display"
          value={displayText}
          placeholder="-"
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => !disabled && notifyHover(true)}
          onBlur={() => {
            notifyHover(false);
            confirmDraft();
          }}
          title={value ? `${value.index} - ${value.name}` : disabled ? t('slotPicker.noMask') : t('slotPicker.pickColor')}
          readOnly={disabled}
          style={inputStyle}
        />
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
