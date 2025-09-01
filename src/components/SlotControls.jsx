// src/components/SlotControls.jsx
import SlotPicker from './SlotPicker.jsx';

export default function SlotControls({ slots, disabledSet, onPickSlot, onRandomAll, onResetSlots, extraActions, onPasteCmd }) {
  return (
    <div className="vstack">
      {slots.map((s, i) => (
        <SlotPicker
          key={i}
          slotIndex={i}
          value={s}
          disabled={disabledSet?.has(i)} // ⬅️ disable theo noMask
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
          onClick={onPasteCmd}>
          Paste CMD
        </button>
      </div>
    </div>
  );
}
