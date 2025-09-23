// src/components/PaletteGrid.jsx
import { useMemo } from 'react';
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';

const toIdString = (value) => String(value);

export default function PaletteGrid({ onPick, onToggleFavorite, onResetFavorites, favorites = [], big = false, showIndex = false }) {
  const size = big ? 44 : 30;
  const gap = big ? 10 : 6;

  const { orderedList, favoriteSet } = useMemo(() => {
    const ids = Array.isArray(favorites) ? favorites.map((id) => toIdString(id)) : [];
    const favSet = new Set(ids);
    const seen = new Set();
    const favEntries = [];

    for (const id of ids) {
      if (seen.has(id)) continue;
      const entry = ARK_PALETTE.find((p) => toIdString(p.index) === id);
      if (entry) {
        favEntries.push(entry);
        seen.add(toIdString(entry.index));
      }
    }

    const rest = ARK_PALETTE.filter((entry) => !seen.has(toIdString(entry.index)));
    return { orderedList: favEntries.concat(rest), favoriteSet: favSet };
  }, [favorites]);

  const handleResetFavorites = () => {
    if (typeof onResetFavorites === 'function') {
      onResetFavorites();
    }
  };

  return (
    <div style={{ padding: 6 }}>
      {typeof onResetFavorites === 'function' && (
        <>
          <div
            className="hstack"
            style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={handleResetFavorites}>
              Reset
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(6, ${size}px)`,
          gap,
        }}>
        {orderedList.map((c) => {
          const [r, g, b] = hexToRgb(c.hex);
          const lum = relLuminance(r, g, b); // 0..1
          const textColor = lum > 0.55 ? '#111' : '#fff';
          const isFavorite = favoriteSet.has(toIdString(c.index));

          const handleContextMenu = (event) => {
            if (!onToggleFavorite) return;
            event.preventDefault();
            onToggleFavorite(c);
          };

          return (
            <button
              type="button"
              key={c.index}
              onClick={() => onPick?.(c)}
              onContextMenu={handleContextMenu}
              title={`${c.index} - ${c.name}`}
              style={{
                position: 'relative',
                width: size,
                height: size,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: c.hex,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
              }}>
              {isFavorite && (
                <span
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
                      strokeWidth="1" />
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
                  {c.index}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

