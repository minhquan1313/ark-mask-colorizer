// @ts-nocheck
import { Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import CanvasView from '../CanvasView';
import CreaturePicker from '../CreaturePicker';
import PaletteGrid from '../PaletteGrid';
import Popover from '../Popover';
import SlotControls from '../SlotControls';
import Toolbar from '../Toolbar';

export default function MaskPage({
  t,
  creatureName,
  canvas,
  slots,
  exportBg,
  exportText,
  disabledSet,
  slotLinks,
  onPickSlot,
  onRandomAll,
  onResetSlots,
  favoriteColors,
  onToggleFavorite,
  onResetFavorites,
  onReorderFavorites,
  onPasteCmd,
  fillControls,
  creaturePicker,
  toolbarActions,
  slotControlsDisabled = false,
}) {
  const { baseImg, maskImg, busy, outCanvasRef, baseCanvasRef, maskCanvasRef } = canvas;
  const { isOpen: fillOpen, anchorRef: fillBtnRef, open: openFill, close: closeFill, onPick: onFillPick } = fillControls;
  const { list, currentName, customMode, onSelect: onCreatureSelect } = creaturePicker;
  const { onReset, onDownloadImage, onDownloadWithPalette, downloadingType, onCustomFiles } = toolbarActions;
  const [highlightSlots, setHighlightSlots] = useState([]);

  useEffect(() => {
    if (slotControlsDisabled) {
      setHighlightSlots([]);
      return;
    }
    if (!disabledSet || typeof disabledSet.has !== 'function') return;
    setHighlightSlots((prev) => {
      const filtered = prev.filter((idx) => !disabledSet.has(idx));
      if (filtered.length === prev.length) return prev;
      return filtered;
    });
  }, [disabledSet, slotControlsDisabled]);

  const handleHighlightSlotsChange = useCallback(
    (indices) => {
      if (slotControlsDisabled || !Array.isArray(indices) || indices.length === 0) {
        setHighlightSlots((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      const next = Array.from(
        new Set(
          indices
            .map((value) => Number(value))
            .filter(
              (idx) =>
                Number.isInteger(idx) && idx >= 0 && idx <= 5 && !(disabledSet && typeof disabledSet.has === 'function' && disabledSet.has(idx)),
            ),
        ),
      ).sort((a, b) => a - b);
      setHighlightSlots((prev) => {
        if (prev.length === next.length && prev.every((value, index) => value === next[index])) {
          return prev;
        }
        return next;
      });
    },
    [disabledSet, slotControlsDisabled],
  );

  return (
    <div className="container page-mask">
      <section className="panel">
        <div
          className="title"
          style={{ textAlign: 'center', fontWeight: 800 }}>
          {t('app.title', { defaultValue: 'ARK Mask Colorizer' })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8, color: 'var(--muted)' }}>{creatureName}</div>

        <CanvasView
          outCanvasRef={outCanvasRef}
          loading={!baseImg}
          busy={busy}
          slots={slots}
          exportBg={exportBg}
          exportText={exportText}
          maskCanvasRef={maskCanvasRef}
          maskImg={maskImg}
          baseCanvasRef={baseCanvasRef}
          baseImg={baseImg}
          highlightSlots={highlightSlots}
        />

        <div className="slot-strip">
          <SlotControls
            slots={slots}
            disabledSet={disabledSet}
            slotLinks={slotLinks}
            onPickSlot={onPickSlot}
            onRandomAll={onRandomAll}
            onResetSlots={onResetSlots}
            favorites={favoriteColors}
            onToggleFavorite={onToggleFavorite}
            onResetFavorites={onResetFavorites}
            onReorderFavorites={onReorderFavorites}
            onPasteCmd={onPasteCmd}
            onHighlightSlotsChange={handleHighlightSlotsChange}
            controlsDisabled={slotControlsDisabled}
            extraActions={
              !slotControlsDisabled ? (
                <>
                  <Button
                    block
                    ref={fillBtnRef}
                    onClick={openFill}>
                    {t('app.fill')}
                  </Button>
                  {fillOpen && (
                    <Popover
                      anchorRef={fillBtnRef}
                      onClose={closeFill}>
                      <div style={{ padding: 10 }}>
                        <PaletteGrid
                          big
                          showIndex
                          favorites={favoriteColors}
                          onPick={onFillPick}
                          onToggleFavorite={onToggleFavorite}
                          onResetFavorites={onResetFavorites}
                          onReorderFavorites={onReorderFavorites}
                        />
                      </div>
                    </Popover>
                  )}
                </>
              ) : null
            }
          />
        </div>
      </section>

      <section className="panel">
        <CreaturePicker
          key={customMode ? 'custom' : currentName || 'none'}
          list={list}
          currentName={currentName}
          customMode={customMode}
          onPick={onCreatureSelect}
        />
        <div style={{ marginTop: 0 }}>
          <Toolbar
            onReset={onReset}
            onDownloadImage={onDownloadImage}
            onDownloadWithPalette={onDownloadWithPalette}
            downloadingType={downloadingType}
            onCustomFiles={onCustomFiles}
          />
        </div>

        <canvas
          ref={baseCanvasRef}
          style={{ display: 'none' }}
        />
        <canvas
          ref={maskCanvasRef}
          style={{ display: 'none' }}
        />
      </section>
    </div>
  );
}
