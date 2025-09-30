import CanvasView from '../CanvasView.jsx';
import CreaturePicker from '../CreaturePicker.jsx';
import PaletteGrid from '../PaletteGrid.jsx';
import Popover from '../Popover.jsx';
import SlotControls from '../SlotControls.jsx';
import Toolbar from '../Toolbar.jsx';

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
}) {
  const { baseImg, maskImg, busy, outCanvasRef, baseCanvasRef, maskCanvasRef } = canvas;
  const { isOpen: fillOpen, anchorRef: fillBtnRef, open: openFill, close: closeFill, onPick: onFillPick } = fillControls;
  const { list, currentName, customMode, onSelect: onCreatureSelect } = creaturePicker;
  const { onReset, onDownloadImage, onDownloadWithPalette, downloadingType, onCustomFiles } = toolbarActions;

  return (
    <div className="container page-mask">
      <section className="panel">
        <div className="title" style={{ textAlign: 'center', fontWeight: 800 }}>
          ARK Mask Colorizer
        </div>
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8, color: 'var(--muted)' }}>{creatureName}</div>

        <CanvasView
          outCanvasRef={outCanvasRef}
          loading={!baseImg || !maskImg}
          busy={busy}
          slots={slots}
          exportBg={exportBg}
          exportText={exportText}
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
            extraActions={
              <>
                <button ref={fillBtnRef} className="btn" onClick={openFill}>
                  {t('app.fill')}
                </button>
                {fillOpen && (
                  <Popover anchorRef={fillBtnRef} onClose={closeFill}>
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
        <div className="toolbar-standalone">
          <Toolbar
            onReset={onReset}
            onDownloadImage={onDownloadImage}
            onDownloadWithPalette={onDownloadWithPalette}
            downloadingType={downloadingType}
            onCustomFiles={onCustomFiles}
          />
        </div>

        <canvas ref={baseCanvasRef} style={{ display: 'none' }} />
        <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
      </section>
    </div>
  );
}
