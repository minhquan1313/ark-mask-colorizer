// src/hooks/useImages.js
import { useCallback, useRef, useState } from 'react';

export function useImages() {
  const [baseImg, setBaseImg] = useState(null);
  const [maskImg, setMaskImg] = useState(null);
  const loadSeqRef = useRef(0); // chá»‘ng Ä‘ua

  const loadImageFromAssets = (relPath) =>
    new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = `/assets/${relPath}`;
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

  // KHÃ”NG auto loadDefault ná»¯a (Ä‘Ã£ bá» trong App)

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
    // clear áº£nh cÅ© ngay láº­p tá»©c Ä‘á»ƒ trÃ¡nh â€œnhÃ¡y saiâ€
    setBaseImg(null);
    setMaskImg(null);

    const guessFolder = (name) => {
      const idx = name.indexOf('_');
      return idx > 0 ? name.slice(0, idx) : name;
    };
    const folder = guessFolder(chosen.name);
    const tryLoad = async (cands) => {
      for (const p of cands) {
        const img = await loadImageFromAssets(p);
        if (img) return img;
      }
      return null;
    };
    const [b, m] = await Promise.all([
      chosen.base
        ? loadImageFromFile(chosen.base)
        : tryLoad([`dino/${folder}/${chosen.name}.png`, `${chosen.name}.png`]),
      chosen.mask
        ? loadImageFromFile(chosen.mask)
        : tryLoad([`dino/${folder}/${chosen.name}_m.png`, `${chosen.name}_m.png`]),
    ]);

    if (loadSeqRef.current !== seq) return; // cÃ³ request má»›i rá»“i, bá» cÅ©
    setBaseImg(b || null);
    setMaskImg(m || null);

    return chosen.name;
  }, []);

  // âœ… náº¡p theo entry tá»« creatures.json, cÃ³ clear + race guard
  const loadFromEntry = useCallback(async (entry) => {
    if (!entry) return;
    const seq = ++loadSeqRef.current;
    setBaseImg(null);
    setMaskImg(null); // clear cÅ©

    const prefix = entry.maskPath ? `dino/${entry.maskPath}/` : "";
    const baseCandidates = [];
    const maskCandidates = [];
    if (entry.base) { if (prefix) baseCandidates.push(prefix + entry.base); baseCandidates.push(entry.base); }
    const maskFile = entry.masks && entry.masks[0];
    if (maskFile) { if (prefix) maskCandidates.push(prefix + maskFile); maskCandidates.push(maskFile); }
    const tryLoad = async (cands) => { for (const p of cands) { const img = await loadImageFromAssets(p); if (img) return img; } return null; };
    const [b, m] = await Promise.all([ baseCandidates.length ? tryLoad(baseCandidates) : Promise.resolve(null), maskCandidates.length ? tryLoad(maskCandidates) : Promise.resolve(null) ]);

    if (loadSeqRef.current !== seq) return;
    setBaseImg(b || null);
    setMaskImg(m || null);
  }, []);

  return { baseImg, maskImg, loadPairFromFiles, loadFromEntry };
}

