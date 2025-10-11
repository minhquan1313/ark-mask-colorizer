import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { useI18n } from '../i18n/index.js';
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';
import PaletteGrid from './PaletteGrid';
import Popover from './Popover';

const findByIndex = (idx) => ARK_PALETTE.find((p) => String(p.index) === String(idx)) || null;

export default function SlotPicker({ slotIndex, value, onChange, disabled = false, favorites = [], onToggleFavorite, onResetFavorites, onReorderFavorites, onHoverChange, onOpenChange, highlighted = false }) {
  const { t } = useI18n();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [idDraft, setIdDraft] = useState(value ? String(value.index) : '');
  const [hasTyped, setHasTyped] = useState(false);

  const prevValueRef = useRef(value ? String(value.index) : '');

  useEffect(() => {
    const currentValueId = value ? String(value.index) : '';
    const prevValueId = prevValueRef.current;
    if (!hasTyped && currentValueId !== prevValueId) {
      setIdDraft(currentValueId);
    }
    prevValueRef.current = currentValueId;
  }, [value, hasTyped]);

  useEffect(() => {
    if (typeof onOpenChange === 'function') {
      onOpenChange(open && !disabled);
    }
  }, [open, disabled, onOpenChange]);

  useEffect(() => {
    if (!open) setHasTyped(false);
  }, [open]);

  const notifyHover = (state) => {
    if (typeof onHoverChange === 'function') {
      onHoverChange(state);
    }
  };

  const applyDraft = (draft) => {
    const sanitized = draft.replace(/[^0-9]/g, '').slice(0, 3);
    setIdDraft(sanitized);
    if (sanitized === '') {
      onChange(null);
      return;
    }
    const numeric = Number(sanitized);
    if (!Number.isNaN(numeric) && (numeric === 0 || sanitized === '255')) {
      onChange(null);
      return;
    }
    const lookup = sanitized.replace(/^0+/, '') || sanitized;
    const found = findByIndex(lookup);
    if (found) {
      onChange(found);
    }
  };

  const confirmDraft = () => {
    if (disabled) return;
    if (idDraft === '') {
      onChange(null);
      setIdDraft('');
      setHasTyped(false);
      prevValueRef.current = '';
      return;
    }
    const numeric = Number(idDraft);
    if (!Number.isNaN(numeric) && (numeric === 0 || idDraft === '255')) {
      onChange(null);
      setIdDraft('');
      setHasTyped(false);
      prevValueRef.current = '';
      return;
    }
    const lookup = idDraft.replace(/^0+/, '') || idDraft;
    const found = findByIndex(lookup);
    if (!found) {
      const fallback = value ? String(value.index) : '';
      setIdDraft(fallback);
      setHasTyped(false);
      prevValueRef.current = fallback;
    }
  };

  const handlePick = (entryOrNull) => {
    if (disabled) return;
    onChange(entryOrNull || null);
    const nextId = entryOrNull ? String(entryOrNull.index) : '';
    setIdDraft(nextId);
    prevValueRef.current = nextId;
    setHasTyped(false);
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
    setHasTyped(true);
  };

  const rawFilter = hasTyped ? idDraft : '';
  const normalizedFilter = rawFilter === '255' ? '' : rawFilter.replace(/^0+/, '');

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
          onBlur={() => {
            notifyHover(false);
            confirmDraft();
          }}
          title={value ? `${value.index} - ${value.name}` : disabled ? t('slotPicker.noMask') : t('slotPicker.pickColor')}
          readOnly={disabled || window.innerWidth < 900}
          style={inputStyle}
        />
        <Button
          type="text"
          shape="circle"
          size="small"
          className="slot-picker__clear"
          onClick={() => {
            if (!disabled) {
              onChange(null);
              setIdDraft('');
              setHasTyped(false);
              prevValueRef.current = '';
            }
          }}
          tabIndex={-1}
          aria-label={t('slotPicker.clearLabel')}
          title={disabled ? t('slotPicker.noMask') : t('slotPicker.clear')}
          disabled={disabled}>
          <span aria-hidden>X</span>
        </Button>
      </div>

      {open && !disabled && (
        <Popover
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}
          className="slot-picker__popover">
          <div style={{ padding: 10 }}>
            <PaletteGrid
              big
              showIndex
              favorites={favorites}
              onPick={handlePick}
              onToggleFavorite={onToggleFavorite}
              onResetFavorites={onResetFavorites}
              onReorderFavorites={onReorderFavorites}
              filter={normalizedFilter}
            />
          </div>
        </Popover>
      )}
    </div>
  );
}
