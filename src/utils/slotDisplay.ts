import { idToEntry, toVariantColorId, type SlotValue } from './slotUtils';
import type { ArkPaletteEntry } from './arkPalette';

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

export const normalizeHex = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

export const slotIndexString = (slot: SlotValue): string | null => {
  if (slot == null) return null;
  if (typeof slot === 'object') {
    if ('index' in slot && slot.index != null) {
      return String(slot.index);
    }
    if ('id' in slot && slot.id != null) {
      return String(slot.id);
    }
    if ('value' in slot && slot.value != null) {
      return String(slot.value);
    }
  }
  const colorId = toVariantColorId(slot);
  return colorId == null ? null : String(colorId);
};

export const slotHex = (slot: SlotValue, fallbackPalette = true): string | null => {
  if (slot == null) return null;
  if (typeof slot === 'string') {
    const hex = normalizeHex(slot);
    if (hex) return hex;
  }
  if (typeof slot === 'number') {
    const entry = idToEntry(slot);
    return entry ? normalizeHex(entry.hex) : null;
  }
  if (typeof slot === 'object') {
    if ('hex' in slot) {
      const hex = normalizeHex(slot.hex as string | null | undefined);
      if (hex) return hex;
    }
    if (fallbackPalette) {
      const idCandidate =
        'index' in slot && slot.index != null ? slot.index : 'id' in slot && slot.id != null ? slot.id : 'value' in slot ? slot.value : null;
      if (idCandidate != null) {
        const entry = idToEntry(idCandidate);
        if (entry) {
          const hex = normalizeHex(entry.hex);
          if (hex) return hex;
        }
      }
    }
  }
  if (!fallbackPalette) {
    return null;
  }
  const colorId = toVariantColorId(slot);
  if (colorId == null) return null;
  const entry = idToEntry(colorId);
  return entry ? normalizeHex(entry.hex) : null;
};

export const cloneSlotValue = (value: SlotValue | null | undefined): SlotValue | null => {
  if (value == null) return null;
  if (typeof value === 'object') {
    return { ...(value as ArkPaletteEntry | Record<string, unknown>) };
  }
  return value;
};
