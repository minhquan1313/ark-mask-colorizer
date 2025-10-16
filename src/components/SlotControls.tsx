import { Button, Space } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { idToEntry } from '../utils/slotUtils';
import type { SlotValue } from '../utils/slotUtils';
import type { ArkPaletteEntry } from '../utils/arkPalette';
import { useI18n } from '../i18n';
import type { SlotLinkMap } from '../types/mask';
import SlotPicker from './SlotPicker';

interface SlotControlsProps {
  slots: SlotValue[];
  disabledSet: Set<number>;
  slotLinks?: SlotLinkMap;
  onPickSlot: (index: number, value: ArkPaletteEntry | null) => void;
  onRandomAll: () => void;
  onResetSlots: () => void;
  extraActions?: ReactNode;
  onPasteCmd: () => void;
  onCopyCmd?: () => Promise<void>;
  favorites?: string[];
  onToggleFavorite?: (entry: ArkPaletteEntry) => void;
  onResetFavorites?: () => void;
  onReorderFavorites?: (ids: string[]) => void;
  onHighlightSlotsChange?: (indices: number[]) => void;
  controlsDisabled?: boolean;
  copyDisabledSet?: Set<number> | null;
}

type ResolvedSlotLinkMap = SlotLinkMap & Record<string, number[]>;

const toEntryOrNull = (value: SlotValue): ArkPaletteEntry | null => {
  if (value == null) return null;
  if (typeof value === 'object') {
    if ('name' in value && 'hex' in value && 'index' in value) {
      return value as ArkPaletteEntry;
    }
    const candidate =
      ('index' in value && value.index != null
        ? value.index
        : 'id' in value && value.id != null
          ? value.id
          : 'value' in value
            ? value.value
            : null) ?? null;
    if (candidate != null) {
      return idToEntry(candidate);
    }
    return null;
  }
  return idToEntry(value);
};

export default function SlotControls({
  slots,
  disabledSet,
  slotLinks = {} as SlotLinkMap,
  onPickSlot,
  onRandomAll,
  onResetSlots,
  extraActions,
  onPasteCmd,
  onCopyCmd,
  favorites,
  onToggleFavorite,
  onResetFavorites,
  onReorderFavorites,
  onHighlightSlotsChange,
  controlsDisabled = false,
  copyDisabledSet = null,
}: SlotControlsProps) {
  const { t } = useI18n();
  const favoriteList = favorites ?? [];
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const highlightSigRef = useRef('');
  const [openSlot, setOpenSlot] = useState<number | null>(null);

  const highlightSet = useMemo<Set<number>>(() => {
    if (openSlot !== null) {
      return new Set();
    }
    const indices = new Set<number>();
    const resolvedLinks = slotLinks as ResolvedSlotLinkMap;
    const resolveLinks = (idx: number | null | undefined): number[] => {
      if (idx == null) return [];
      const direct = slotLinks[idx];
      if (Array.isArray(direct)) return direct;
      const fallback = resolvedLinks[String(idx)];
      return Array.isArray(fallback) ? fallback : [];
    };
    const append = (idx: number | null) => {
      if (idx == null) return;
      const numeric = Number(idx);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 5) return;
      if (indices.has(numeric)) return;
      indices.add(numeric);
      for (const linked of resolveLinks(numeric)) {
        if (Number.isInteger(linked) && linked >= 0 && linked <= 5) {
          indices.add(linked);
        }
      }
    };
    append(hoveredSlot);
    return indices;
  }, [hoveredSlot, openSlot, slotLinks]);

  useEffect(() => {
    if (typeof onHighlightSlotsChange !== 'function') return;
    const arr = hoveredSlot != null && Number.isInteger(hoveredSlot) && hoveredSlot >= 0 && hoveredSlot <= 5 ? [Number(hoveredSlot)] : [];
    const sig = arr.join(',');
    if (sig === highlightSigRef.current) return;
    highlightSigRef.current = sig;
    onHighlightSlotsChange(arr);
  }, [hoveredSlot, onHighlightSlotsChange]);

  const handleCopy = useCallback(async () => {
    try {
      setCopyErr(false);
      if (typeof onCopyCmd === 'function') {
        await onCopyCmd();
      } else {
        const skip = copyDisabledSet instanceof Set ? copyDisabledSet : null;
        const commands: string[] = [];
        for (let idx = 0; idx < 6; idx++) {
          if (skip?.has(idx)) continue;
          const entry = toEntryOrNull(slots[idx]);
          const id = entry?.index;
          if (id == null) continue;
          commands.push(`setTargetDinoColor ${idx} ${id}`);
        }
        if (!commands.length) {
          throw new Error('No colors to copy');
        }
        await navigator.clipboard.writeText(commands.join(' | '));
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error('Copy Color failed', error);
      setCopyErr(true);
      window.setTimeout(() => setCopyErr(false), 1500);
    }
  }, [copyDisabledSet, onCopyCmd, slots]);

  return (
    <div className="slot-controls">
      <div className="slot-controls__grid">
        {slots.map((slotValue, index) => (
          <SlotPicker
            key={index}
            slotIndex={index}
            value={toEntryOrNull(slotValue)}
            disabled={controlsDisabled || disabledSet.has(index)}
            favorites={favoriteList}
            onToggleFavorite={onToggleFavorite}
            onResetFavorites={onResetFavorites}
            onReorderFavorites={onReorderFavorites}
            onChange={(entry) => onPickSlot(index, entry)}
            highlighted={highlightSet.has(index)}
            onHoverChange={(isHovering) => setHoveredSlot((prev) => (isHovering ? index : prev === index ? null : prev))}
            onOpenChange={(isOpen) => {
              setOpenSlot((prev) => {
                if (isOpen) return index;
                return prev === index ? null : prev;
              });
            }}
          />
        ))}
      </div>

      <Space.Compact
        block
        className="slot-controls__actions"
        style={{
          flex: 1,
          width: '100%',
          justifyContent: 'space-between',
          overflowX: 'auto',
        }}>
        <Button
          block
          onClick={onRandomAll}>
          {t('slotControls.random')}
        </Button>
        <Button
          block
          onClick={onResetSlots}>
          {t('slotControls.reset')}
        </Button>
        {!controlsDisabled ? extraActions : null}
        <Button
          block
          onClick={onPasteCmd}
          title={t('slotControls.pasteTitle')}>
          {t('slotControls.paste')}
        </Button>
        <Button
          block
          onClick={handleCopy}
          title={t('slotControls.copyTitle')}
          aria-live="polite">
          {copyErr ? t('slotControls.copyFailed') : copied ? t('slotControls.copySuccess') : t('slotControls.copy')}
        </Button>
      </Space.Compact>
    </div>
  );
}
