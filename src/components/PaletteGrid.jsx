import { useCallback, useMemo } from 'react';
import { Button } from 'antd';
import { useI18n } from '../i18n/index.js';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';

const toIdString = (value) => String(value);

export default function PaletteGrid({ onPick, onToggleFavorite, onResetFavorites, onReorderFavorites, favorites = [], big = false, showIndex = false, filter = '' }) {
  const { t } = useI18n();
  const size = big ? 44 : 30;
  const gap = big ? 10 : 6;

  const { favoriteEntries, otherEntries, favoriteSet } = useMemo(() => {
    const ids = Array.isArray(favorites) ? favorites.map((id) => toIdString(id)) : [];
    const favSet = new Set(ids);
    const seen = new Set();
    const favEntries = [];
    const filterText = typeof filter === 'string' ? filter.trim() : toIdString(filter ?? '').trim();
    const filterDigits = filterText.replace(/[^0-9]/g, '');
    const matchesFilter = filterDigits.length > 0 ? (entry) => toIdString(entry.index).includes(filterDigits) : () => true;

    for (const id of ids) {
      if (seen.has(id)) continue;
      const entry = ARK_PALETTE.find((p) => toIdString(p.index) === id);
      if (entry) {
        seen.add(toIdString(entry.index));
        if (matchesFilter(entry)) {
          favEntries.push(entry);
        }
      }
    }

    const rest = ARK_PALETTE.filter((entry) => !seen.has(toIdString(entry.index)) && matchesFilter(entry));
    return { favoriteEntries: favEntries, otherEntries: rest, favoriteSet: favSet };
  }, [favorites, filter]);

  const canReorder = typeof onReorderFavorites === 'function' && favoriteEntries.length > 1;
  const favoriteIds = useMemo(() => favoriteEntries.map((entry) => toIdString(entry.index)), [favoriteEntries]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleFavoriteDragEnd = useCallback(
    (event) => {
      if (!canReorder) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = favoriteIds.indexOf(active.id);
      const newIndex = favoriteIds.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(favoriteIds, oldIndex, newIndex);
      if (next.some((value, index) => value !== favoriteIds[index])) {
        onReorderFavorites(next);
      }
    },
    [canReorder, favoriteIds, onReorderFavorites],
  );

  const renderButton = (entry, options = {}) => {
    const [r, g, b] = hexToRgb(entry.hex);
    const lum = relLuminance(r, g, b);
    const textColor = lum > 0.55 ? '#111' : '#fff';
    const idStr = toIdString(entry.index);
    const isFavorite = options.isFavorite ?? favoriteSet.has(idStr);

    const classNames = ['palette-grid__button'];
    if (isFavorite) classNames.push('is-favorite');

    const handleContextMenu = (event) => {
      if (!onToggleFavorite) return;
      event.preventDefault();
      onToggleFavorite(entry);
    };

    return (
      <button
        type="button"
        key={entry.index}
        className={classNames.join(' ')}
        onClick={() => onPick?.(entry)}
        onContextMenu={handleContextMenu}
        title={`${entry.index} - ${entry.name}`}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: entry.hex,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
        }}>
        {isFavorite && (
          <span
            className="palette-grid__favorite-icon"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: big ? 16 : 14,
              height: big ? 16 : 14,
              pointerEvents: 'none',
            }}>
            <svg
              viewBox="0 0 24 24"
              width="100%"
              height="100%"
              aria-hidden="true"
              focusable="false">
              <path
                d="M12 2.75l2.4 4.87 5.37.78-3.88 3.78.92 5.35L12 14.97l-4.81 2.56.92-5.35-3.88-3.78 5.37-.78z"
                fill="#facc15"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
              />
            </svg>
          </span>
        )}
        {showIndex && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}>
            {entry.index}
          </span>
        )}
      </button>
    );
  };

  const favoriteButtons = favoriteEntries.map((entry) => renderButton(entry, { isFavorite: true }));
  const otherButtons = otherEntries.map((entry) => renderButton(entry, { isFavorite: false }));

  const handleResetFavorites = () => {
    if (typeof onResetFavorites === 'function') {
      onResetFavorites();
    }
  };

  return (
    <div className="palette-grid">
      {typeof onResetFavorites === 'function' && (
        <>
          <div
            className="hstack"
            style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button size="small" onClick={handleResetFavorites}>
              {t('paletteGrid.reset')}
            </Button>
          </div>
          <div
            style={{
              height: 1,
              background: 'var(--border)',
              marginBottom: 8,
            }}
          />
        </>
      )}

      {favoriteEntries.length > 0 && (
        canReorder ? (
          <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleFavoriteDragEnd}>
            <SortableContext items={favoriteIds} strategy={rectSortingStrategy}>
              <div
                className="palette-grid__favorites"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(6, ${size}px)`,
                  gap,
                  marginBottom: gap,
                }}>
                {favoriteEntries.map((entry) => {
                  const id = toIdString(entry.index);
                  return (
                    <SortableFavorite key={id} id={id}>
                      {renderButton(entry, { isFavorite: true })}
                    </SortableFavorite>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div
            className="palette-grid__favorites"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(6, ${size}px)`,
              gap,
              marginBottom: gap,
            }}>
            {favoriteButtons}
          </div>
        )
      )}

      <div
        className="palette-grid__body"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(6, ${size}px)`,
          gap,
        }}>
        {favoriteEntries.length === 0 ? favoriteButtons : null}
        {otherButtons}
      </div>
    </div>
  );
}

function SortableFavorite({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
