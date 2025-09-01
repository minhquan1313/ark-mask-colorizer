// src/hooks/useImages.js
import { useCallback, useRef, useState } from 'react';

export function useImages() {
  const [baseImg, setBaseImg] = useState(null);
  const [maskImg, setMaskImg] = useState(null);
  const loadSeqRef = useRef(0); // chống đua

  const loadImageFromAssets = (filename) =>
    new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = `/assets/${filename}`;
    });
  const loadImageFromFile = (file) =>
    new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        res(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        res(null);
      };
      img.src = url;
    });

  // KHÔNG auto loadDefault nữa (đã bỏ trong App)

  const loadPairFromFiles = useCallback(async (fileList) => {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList).filter((f) => f.name?.toLowerCase().endsWith('.png'));
    const map = {};
    for (const f of files) {
      const n = f.name;
      const low = n.toLowerCase();
      const baseName = low.endsWith('_m.png') ? n.slice(0, -6) : n.slice(0, -4);
      map[baseName] ??= { base: null, mask: null, name: baseName };
      if (low.endsWith('_m.png')) map[baseName].mask = f;
      else map[baseName].base = f;
    }
    let chosen = Object.values(map).find((x) => x.base && x.mask) || Object.values(map)[0];
    if (!chosen) return;

    const seq = ++loadSeqRef.current;
    // clear ảnh cũ ngay lập tức để tránh “nháy sai”
    setBaseImg(null);
    setMaskImg(null);

    const [b, m] = await Promise.all([
      chosen.base ? loadImageFromFile(chosen.base) : loadImageFromAssets(chosen.name + '.png'),
      chosen.mask ? loadImageFromFile(chosen.mask) : loadImageFromAssets(chosen.name + '_m.png'),
    ]);

    if (loadSeqRef.current !== seq) return; // có request mới rồi, bỏ cũ
    setBaseImg(b || null);
    setMaskImg(m || null);

    return chosen.name;
  }, []);

  // ✅ nạp theo entry từ creatures.json, có clear + race guard
  const loadFromEntry = useCallback(async (entry) => {
    if (!entry) return;
    const seq = ++loadSeqRef.current;
    setBaseImg(null);
    setMaskImg(null); // clear cũ

    const [b, m] = await Promise.all([
      entry.base ? loadImageFromAssets(entry.base) : Promise.resolve(null),
      entry.masks && entry.masks[0] ? loadImageFromAssets(entry.masks[0]) : Promise.resolve(null),
    ]);

    if (loadSeqRef.current !== seq) return;
    setBaseImg(b || null);
    setMaskImg(m || null);
  }, []);

  return { baseImg, maskImg, loadPairFromFiles, loadFromEntry };
}
