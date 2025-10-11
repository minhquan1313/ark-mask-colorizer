export interface CreatureVariantSequenceItem {
  base?: string;
  masks?: string[];
  label?: string;
  mergeMasks?: string[];
  [key: string]: unknown;
}

export interface CreatureVariantSlot {
  mode?: string;
  sequence?: CreatureVariantSequenceItem[];
  map?: Record<number, number>;
  defaultIndex?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface CreatureEntry {
  name: string;
  maskPath?: string;
  base?: string;
  masks?: string[];
  noMask?: number[];
  variantSlots?: Record<string, CreatureVariantSlot>;
  [key: string]: unknown;
}
