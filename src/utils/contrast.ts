type RGB = [number, number, number];

export function hexToRgb(hex?: string | null): RGB | null {
  if (typeof hex !== 'string') {
    return null;
  }
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^([0-9a-fA-F]{6})$/.test(normalized)) {
    return null;
  }
  const value = parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function relLuminance(r: number, g: number, b: number): number {
  const toLin = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const rl = toLin(r);
  const gl = toLin(g);
  const bl = toLin(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function isNearBlack(hex?: string | null): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return relLuminance(rgb[0], rgb[1], rgb[2]) < 0.22;
}

export function isGrayish(hex?: string | null): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const saturation = (max - min) / 255;
  return saturation < 0.1;
}

export function isLightGrayOrWhite(hex?: string | null): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const lightEnough = r >= 0x61 && g >= 0x61 && b >= 0x61;
  return lightEnough && isGrayish(hex);
}

export function adjustTextColorForBackground(previous: string, nextBg: string | null | undefined): string {
  if (nextBg === 'transparent') {
    if (previous && isGrayish(previous)) {
      return '#171717';
    }
    return previous;
  }

  if (typeof nextBg === 'string' && nextBg.startsWith('#') && nextBg.length === 7) {
    if (isLightGrayOrWhite(nextBg)) {
      return previous === '#FFFFFF' ? '#171717' : previous;
    }

    if (isNearBlack(nextBg)) {
      if (previous === '#171717' || isNearBlack(previous)) {
        return '#FFFFFF';
      }
      return previous;
    }
  }

  return previous;
}
