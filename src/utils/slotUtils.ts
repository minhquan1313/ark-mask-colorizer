import { ARK_PALETTE, type ArkPaletteEntry } from './arkPalette';

type SlotObject = {
  index?: number | string | null;
  id?: number | string | null;
  value?: number | string | null;
  hex?: string | null;
};

export type SlotValue = number | string | SlotObject | null | undefined;

export const idToEntry = (id: number | string | null | undefined): ArkPaletteEntry | null =>
  ARK_PALETTE.find((p) => String(p.index) === String(id)) ?? null;

export function toVariantColorId(slotValue: SlotValue): number | null {
  if (slotValue == null) {
    return null;
  }
  if (typeof slotValue === 'number' || typeof slotValue === 'string') {
    const parsed = Number(slotValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof slotValue === 'object') {
    if (slotValue.index != null) {
      const parsed = Number(slotValue.index);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (slotValue.id != null) {
      const parsed = Number(slotValue.id);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (slotValue.value != null) {
      const parsed = Number(slotValue.value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

type VariantEntry = {
  variantSlots?: Record<string, unknown>;
};

export function buildVariantKey(entry: VariantEntry | null | undefined, slots?: SlotValue[]): string {
  if (!entry?.variantSlots) {
    return '';
  }
  return Object.keys(entry.variantSlots)
    .map((slot) => {
      const idx = Number(slot);
      const colorId = toVariantColorId(slots?.[idx]);
      return `${slot}:${colorId == null ? 'x' : colorId}`;
    })
    .sort((a, b) => Number(a.split(':')[0]) - Number(b.split(':')[0]))
    .join('|');
}

export function buildSlotsColorSignature(slots?: SlotValue[]): string {
  if (!Array.isArray(slots)) {
    return '';
  }
  return slots
    .map((slot) => {
      if (!slot) return 'x';
      if (typeof slot === 'string') return slot;
      if (typeof slot === 'object' && slot.hex) return slot.hex;
      const id = toVariantColorId(slot);
      return id == null ? 'x' : `id:${id}`;
    })
    .join('|');
}

export function normalizeFavoriteIds(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    if (value == null) continue;
    const id = String(value);
    if (seen.has(id)) continue;
    const entry = ARK_PALETTE.find((p) => String(p.index) === id);
    if (!entry) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}
