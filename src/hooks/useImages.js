// src/hooks/useImages.js
import { useCallback, useRef, useState } from 'react';

export function useImages() {
  const [baseImg, setBaseImg] = useState(null);
  const [maskImg, setMaskImg] = useState(null);
  const [extraMasks, setExtraMasks] = useState([]); // [{ img, pair:[i,j], name }]
  const loadSeqRef = useRef(0); // race guard

  const loadImageFromAssets = (relPath) =>
    new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      try {
        img.src = `/assets/${encodeURI(relPath)}`;
      } catch {
        img.src = `/assets/${relPath}`;
      }
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

  // Manual file load (keeps only base + primary mask)
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
    // Clear immediately to avoid flashing stale content
    setBaseImg(null);
    setMaskImg(null);
    setExtraMasks([]);

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

    if (loadSeqRef.current !== seq) return; // newer request came; drop
    setBaseImg(b || null);
    setMaskImg(m || null);
    setExtraMasks([]);

    return chosen.name;
  }, []);

  // Load based on creatures.json entry (supports multiple masks)
  const loadFromEntry = useCallback(async (entry) => {
    if (!entry) return;
    const seq = ++loadSeqRef.current;
    setBaseImg(null);
    setMaskImg(null);
    setExtraMasks([]);

    const prefix = entry.maskPath ? `dino/${entry.maskPath}/` : '';
    const baseCandidates = [];
    if (entry.base) {
      if (prefix) baseCandidates.push(prefix + entry.base);
      baseCandidates.push(entry.base);
    }
    const tryLoad = async (cands) => {
      for (const p of cands) {
        const img = await loadImageFromAssets(p);
        if (img) return img;
      }
      return null;
    };

    // Primary mask
    const mask0Candidates = [];
    const maskFile0 = entry.masks && entry.masks[0];
    if (maskFile0) {
      if (prefix) mask0Candidates.push(prefix + maskFile0);
      mask0Candidates.push(maskFile0);
    }

    // Overlay masks in order
    const overlayList = Array.isArray(entry.masks) ? entry.masks.slice(1) : [];
    const overlayLoads = overlayList.map(async (mf) => {
      const cands = [];
      if (prefix) cands.push(prefix + mf);
      cands.push(mf);
      const img = await tryLoad(cands);
      let pair = null;
      const m = /_m_(\d{2})\.png$/i.exec(mf);
      if (m) {
        const a = parseInt(m[1][0], 10);
        const b = parseInt(m[1][1], 10);
        if (!Number.isNaN(a) && !Number.isNaN(b)) pair = [a, b];
      }
      return img ? { img, name: mf, pair } : null;
    });

    const [b, m0, overlays] = await Promise.all([
      baseCandidates.length ? tryLoad(baseCandidates) : Promise.resolve(null),
      mask0Candidates.length ? tryLoad(mask0Candidates) : Promise.resolve(null),
      overlayLoads.length ? Promise.all(overlayLoads) : Promise.resolve([]),
    ]);

    if (loadSeqRef.current !== seq) return;
    setBaseImg(b || null);
    setMaskImg(m0 || null);
    setExtraMasks((overlays || []).filter(Boolean));
  }, []);

  return { baseImg, maskImg, extraMasks, loadPairFromFiles, loadFromEntry };
}
