// src/components/PaletteGrid.jsx
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';

export default function PaletteGrid({ onPick, big = false, showIndex = false }) {
  const size = big ? 44 : 30;
  const gap = big ? 10 : 6;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))`,
        gap,
        padding: 6,
      }}>
      {ARK_PALETTE.map((c) => {
        const [r, g, b] = hexToRgb(c.hex);
        const lum = relLuminance(r, g, b); // 0..1
        const textColor = lum > 0.55 ? '#111' : '#fff'; // auto tương phản
        return (
          <button
            key={c.index}
            onClick={() => onPick?.(c)}
            title={`${c.index} - ${c.name}`}
            style={{
              width: size,
              height: size,
              borderRadius: 10,
              border: '1px solid var(--border)', // ⬅️
              background: c.hex,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}>
            {showIndex && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: textColor, // đen/trắng theo luminance đã có
                  textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                }}>
                {c.index}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
