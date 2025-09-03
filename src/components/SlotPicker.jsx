// src/components/SlotPicker.jsx
import { useEffect, useRef, useState } from 'react';
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';
import PaletteGrid from './PaletteGrid';
import Popover from './Popover';

const findByIndex = (idx) => ARK_PALETTE.find((p) => String(p.index) === String(idx)) || null;

export default function SlotPicker({ slotIndex, value, onChange, disabled = false }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [idDraft, setIdDraft] = useState(value ? String(value.index) : '');

  useEffect(() => {
    setIdDraft(value ? String(value.index) : '');
  }, [value]);

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

  const btnStyle = {
    display: 'inline-grid',
    placeItems: 'center',
    padding: 0,
    width: 56,
    height: 36,
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: value?.hex || 'transparent',
    color: idTextColor,
    fontWeight: 700,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div
      className="hstack"
      style={{ gap: 10, alignItems: 'center', flexWrap: 'nowrap' }}>
      <div style={{ width: 24, textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{slotIndex}</div>

      <button
        ref={anchorRef}
        className="btn"
        onClick={() => !disabled && setOpen(true)}
        title={value ? `${value.index} - ${value.name}` : disabled ? 'Slot không có mask' : 'Chọn màu…'}
        tabIndex={-1}
        aria-disabled={disabled}
        style={btnStyle}>
        {value?.index ?? '—'}
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="id"
        value={idDraft}
        onChange={onIdChange}
        onBlur={onIdBlur}
        autoComplete="off"
        disabled={disabled}
        style={{
          width: 80,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          textAlign: 'center',
          marginLeft: 8,
          marginRight: 8,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />

      <button
        className="btn"
        onClick={() => {
          if (!disabled) {
            onChange(null);
            setIdDraft('');
          }
        }}
        aria-label="Bỏ màu"
        title={disabled ? 'Slot không có mask' : 'Bỏ màu'}
        tabIndex={-1}
        aria-disabled={disabled}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: '#ef4444',
          fontWeight: 700,
          display: 'grid',
          placeItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}>
        X
      </button>

      {open && !disabled && (
        <Popover
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}>
          <div style={{ padding: 10 }}>
            <PaletteGrid
              big
              showIndex
              onPick={handlePick}
            />
          </div>
        </Popover>
      )}
    </div>
  );
}
