// src/components/PaletteGrid.jsx
import { ARK_PALETTE } from '../utils/arkPalette';
import { hexToRgb, relLuminance } from '../utils/color';

// Priority ordering requested
const PRIORITY = ['1', '2', '3', '4', '5', '6', '36', '68', '79', '83', '187', '203'];
const seen = new Set();
const prioritized = [];
for (const id of PRIORITY) {
  const found = ARK_PALETTE.find((p) => String(p.index) === String(id));
  if (found && !seen.has(String(found.index))) {
    prioritized.push(found);
    seen.add(String(found.index));
  }
}
const rest = ARK_PALETTE.filter((p) => !seen.has(String(p.index)));
const LIST = prioritized.concat(rest);

export default function PaletteGrid({ onPick, big = false, showIndex = false }) {
  const size = big ? 44 : 30;
  const gap = big ? 10 : 6;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(6, ${size}px)`,
        gap,
        padding: 6,
      }}>
      {LIST.map((c) => {
        const [r, g, b] = hexToRgb(c.hex);
        const lum = relLuminance(r, g, b); // 0..1
        const textColor = lum > 0.55 ? '#111' : '#fff';
        return (
          <button
            key={c.index}
            onClick={() => onPick?.(c)}
            title={`${c.index} - ${c.name}`}
            style={{
              width: size,
              height: size,
              borderRadius: 10,
              border: '1px solid var(--border)',
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
  );
}
