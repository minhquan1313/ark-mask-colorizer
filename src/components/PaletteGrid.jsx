import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/index.js';
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

  const [draggingId, setDraggingId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const canReorder = typeof onReorderFavorites === 'function' && favoriteEntries.length > 1;

  const favoriteIds = useMemo(() => favoriteEntries.map((entry) => toIdString(entry.index)), [favoriteEntries]);

  const commitReorder = (targetIndex) => {
    if (!canReorder || !draggingId) return;
    const ids = favoriteEntries.map((entry) => toIdString(entry.index));
    const fromIdx = ids.indexOf(draggingId);
    if (fromIdx === -1) return;
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    let insertIndex = targetIndex;
    if (fromIdx < targetIndex) {
      insertIndex -= 1;
    }
    insertIndex = Math.max(0, Math.min(insertIndex, next.length));
    next.splice(insertIndex, 0, moved);
    if (next.join('|') !== ids.join('|')) {
      onReorderFavorites(next);
    }
  };

  const endDrag = () => {
    setDraggingId(null);
    setDragOverIndex(null);
  };

  const handleFavoriteDragStart = (event, id) => {
    if (!canReorder) return;
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData('text/plain', id);
      } catch {
        /* ignore */
      }
    }
    setDraggingId(id);
    setDragOverIndex(favoriteIds.indexOf(id));
  };

  const handleFavoriteDragOver = (event, index) => {
    if (!canReorder || !draggingId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const position = offset > rect.width / 2 ? index + 1 : index;
    setDragOverIndex(position);
  };

  const handleFavoriteDrop = (event, index) => {
    if (!canReorder || !draggingId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const position = offset > rect.width / 2 ? index + 1 : index;
    commitReorder(position);
    endDrag();
  };

  const handleFavoriteDropTail = (event) => {
    if (!canReorder || !draggingId) return;
    event.preventDefault();
    commitReorder(favoriteEntries.length);
    endDrag();
  };

  const handleRestDragOver = (event) => {
    if (!canReorder || !draggingId) return;
    event.preventDefault();
    setDragOverIndex(favoriteEntries.length);
  };

  const handleRestDrop = (event) => {
    if (!canReorder || !draggingId) return;
    event.preventDefault();
    commitReorder(favoriteEntries.length);
    endDrag();
  };

  const renderButton = (entry, options = {}) => {
    const [r, g, b] = hexToRgb(entry.hex);
    const lum = relLuminance(r, g, b);
    const textColor = lum > 0.55 ? '#111' : '#fff';
    const idStr = toIdString(entry.index);
    const isFavorite = options.isFavorite ?? favoriteSet.has(idStr);
    const isDragging = options.isDragging ?? false;
    const dropBefore = options.dropBefore ?? false;
    const dropAfter = options.dropAfter ?? false;

    const classNames = ['palette-grid__button'];
    if (isFavorite) classNames.push('is-favorite');
    if (isDragging) classNames.push('is-dragging');
    if (dropBefore) classNames.push('drop-before');
    if (dropAfter) classNames.push('drop-after');

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
        draggable={options.draggable}
        onDragStart={options.onDragStart}
        onDragOver={options.onDragOver}
        onDrop={options.onDrop}
        onDragEnd={options.onDragEnd}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: entry.hex,
          display: 'grid',
          placeItems: 'center',
          cursor: options.draggable ? 'grab' : 'pointer',
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

  const favoriteButtons = favoriteEntries.map((entry, index) => {
    const id = toIdString(entry.index);
    const isDragging = draggingId === id;
    const dropBefore = canReorder && dragOverIndex === index;
    const dropAfter = canReorder && dragOverIndex === index + 1;
    return renderButton(entry, {
      isFavorite: true,
      draggable: canReorder,
      isDragging,
      dropBefore,
      dropAfter,
      onDragStart: (event) => handleFavoriteDragStart(event, id),
      onDragOver: (event) => handleFavoriteDragOver(event, index),
      onDrop: (event) => handleFavoriteDrop(event, index),
      onDragEnd: endDrag,
    });
  });

  const otherButtons = otherEntries.map((entry) =>
    renderButton(entry, {
      isFavorite: false,
      draggable: false,
      dropAfter: canReorder && dragOverIndex === favoriteEntries.length,
      onDragOver: canReorder ? handleRestDragOver : undefined,
      onDrop: canReorder ? handleRestDrop : undefined,
    })
  );

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
            <button
              type="button"
              className="btn"
              onClick={handleResetFavorites}>
              {t('paletteGrid.reset')}
            </button>
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
        <div
          className="palette-grid__favorites"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(6, ${size}px)`,
            gap,
            marginBottom: gap,
          }}>
          {favoriteButtons}
          {canReorder && (
            <div
              className={`palette-grid__drop-tail${dragOverIndex === favoriteEntries.length ? ' is-active' : ''}`}
              onDragOver={handleFavoriteDropTail}
              onDrop={handleFavoriteDropTail}
            />
          )}
        </div>
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
