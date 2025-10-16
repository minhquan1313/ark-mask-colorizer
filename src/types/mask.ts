import type { MutableRefObject } from 'react';
import type { ExtraMask } from '../hooks/useImages';
import type { useI18n } from '../i18n';
import type { ArkPaletteEntry } from '../utils/arkPalette';
import type { SlotValue } from '../utils/slotUtils';
import type { CreatureEntry } from './creatures';

export type TranslateFn = ReturnType<typeof useI18n>['t'];

export type SlotLinkMap = Record<number, number[]>;

export interface CanvasState {
  baseImg: HTMLImageElement | null;
  maskImg: HTMLImageElement | null;
  extraMasks: ExtraMask[];
  busy: boolean;
  outCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  baseCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  maskCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
}

export interface FillControls {
  isOpen: boolean;
  anchorRef: MutableRefObject<HTMLButtonElement | null>;
  open: () => void;
  close: () => void;
  onPick: (entry: ArkPaletteEntry | null) => void;
}

export interface CreaturePickerControls {
  list: CreatureEntry[];
  currentName: string;
  customMode: boolean;
  onSelect: (name: string) => void;
}

export interface ToolbarActions {
  onReset: () => void;
  onDownloadImage: () => void;
  onDownloadWithPalette: () => void;
  downloadingType: 'image' | 'palette' | null;
  onCustomFiles: (files: FileList | File[] | null | undefined) => Promise<void>;
}

export interface MaskPageProps {
  t: TranslateFn;
  creatureName: string;
  canvas: CanvasState;
  slots: SlotValue[];
  exportBg: string;
  exportText: string;
  disabledSet: Set<number>;
  slotLinks: SlotLinkMap;
  onPickSlot: (slotIndex: number, value: SlotValue | null) => void;
  onRandomAll: () => void;
  onResetSlots: () => void;
  favoriteColors: string[];
  onToggleFavorite: (entry: ArkPaletteEntry | null | undefined) => void;
  onResetFavorites: () => void;
  onReorderFavorites: (nextOrder: Array<string | number | null | undefined>) => void;
  onPasteCmd: () => Promise<void>;
  fillControls: FillControls;
  creaturePicker: CreaturePickerControls;
  toolbarActions: ToolbarActions;
  slotControlsDisabled?: boolean;
  copyDisabledSet?: Set<number> | null;
}

export interface RecolorDrawArgs {
  baseImg: HTMLImageElement | null;
  maskImg: HTMLImageElement | null;
  extraMasks?: ExtraMask[] | null;
  baseCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  maskCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  outCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  slots: SlotValue[];
  renderNonce?: number;
}
