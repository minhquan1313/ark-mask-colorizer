// src/hooks/useImages.js
import { useCallback, useRef, useState } from 'react';

const COLOR_ID_NONE = 255;
const DEFAULT_VARIANT_MODE = 'colorIdCycle';

function toColorId(slotValue) {
  if (slotValue == null) {
    return null;
  }
  if (typeof slotValue === 'number' || typeof slotValue === 'string') {
    const parsed = Number(slotValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof slotValue === 'object') {
    if (slotValue.index != null) {
      const parsed = Number(slotValue.index);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (slotValue.id != null) {
      const parsed = Number(slotValue.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (slotValue.value != null) {
      const parsed = Number(slotValue.value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function clampIndex(idx, length) {
  if (!Number.isInteger(length) || length <= 0) {
    return 0;
  }
  const normalized = Number(idx);
  if (!Number.isInteger(normalized)) {
    return 0;
  }
  const mod = normalized % length;
  return mod >= 0 ? mod : mod + length;
}

function buildSignature(maskPath, base, masks, extraParts = []) {
  const safeMasks = Array.isArray(masks) ? masks.join(',') : '';
  return [
    `maskPath:${maskPath || ''}`,
    `base:${base || ''}`,
    `masks:${safeMasks}`,
    ...extraParts,
  ].join('|');
}

function normalizeMasks(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function selectVariantIndex(config, slotValue) {
  const sequenceLength = Array.isArray(config?.sequence) ? config.sequence.length : 0;
  if (sequenceLength <= 0) {
    return 0;
  }

  const mode = config?.mode || DEFAULT_VARIANT_MODE;
  const colorId = toColorId(slotValue);

  if (config && typeof config.map === 'object' && config.map !== null && colorId != null) {
    const mapped = config.map[colorId];
    if (mapped != null) {
      return clampIndex(mapped, sequenceLength);
    }
  }

  if (mode === 'fixed') {
    return clampIndex(config?.defaultIndex ?? 0, sequenceLength);
  }

  if (mode === 'colorIdIndex') {
    if (colorId == null || Number.isNaN(colorId)) {
      return clampIndex(config?.defaultIndex ?? 0, sequenceLength);
    }
    const offset = Number(config?.offset) || 0;
    return clampIndex(colorId + offset, sequenceLength);
  }

  // Default: treat color ids as 1-based cycle, ignoring 255 (no color) and non-positive numbers.
  if (colorId == null || Number.isNaN(colorId) || colorId === COLOR_ID_NONE || colorId <= 0) {
    return clampIndex(config?.defaultIndex ?? 0, sequenceLength);
  }

  const offset = Number(config?.offset) || 0;
  return clampIndex(colorId - 1 + offset, sequenceLength);
}

function resolveVariantSources(entry, slots) {
  const resolved = {
    base: entry?.base || null,
    masks: normalizeMasks(entry?.masks),
    signature: buildSignature(entry?.maskPath, entry?.base || null, normalizeMasks(entry?.masks)),
  };

  if (!entry || !entry.variantSlots) {
    return resolved;
  }

  const variantParts = [];
  const pairs = Object.entries(entry.variantSlots)
    .map(([slot, cfg]) => [Number(slot), cfg])
    .filter(([slot, cfg]) => Number.isInteger(slot) && cfg && Array.isArray(cfg.sequence) && cfg.sequence.length > 0)
    .sort((a, b) => a[0] - b[0]);

  if (pairs.length === 0) {
    return resolved;
  }

  let base = resolved.base;
  let masks = resolved.masks;

  for (const [slotIndex, cfg] of pairs) {
    const variantIdx = selectVariantIndex(cfg, slots?.[slotIndex]);
    const chosen = cfg.sequence[clampIndex(variantIdx, cfg.sequence.length)] || cfg.sequence[0];
    variantParts.push(`slot${slotIndex}:${variantIdx}`);

    if (chosen?.base) {
      base = chosen.base;
    }
    if (Array.isArray(chosen?.masks) && chosen.masks.length > 0) {
      masks = normalizeMasks(chosen.masks);
    }
    if (Array.isArray(chosen?.mergeMasks) && chosen.mergeMasks.length > 0) {
      const merged = new Set(masks);
      for (const extra of chosen.mergeMasks) {
        if (typeof extra === 'string' && extra.trim()) {
          merged.add(extra.trim());
        }
      }
      masks = Array.from(merged);
    }
  }

  resolved.base = base;
  resolved.masks = masks;
  resolved.signature = buildSignature(entry.maskPath, base, masks, variantParts);
  return resolved;
}

function loadImageFromAssets(relPath) {
  return new Promise((res) => {
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
}

function loadImageFromFile(file) {
  return new Promise((res) => {
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
}

export function useImages() {
  const [baseImg, setBaseImg] = useState(null);
  const [maskImg, setMaskImg] = useState(null);
  const [extraMasks, setExtraMasks] = useState([]); // [{ img, pair:[i,j], name }]
  const loadSeqRef = useRef(0); // race guard
  const lastSignatureRef = useRef(null);

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
    lastSignatureRef.current = null;

    return chosen.name;
  }, []);

  const loadFromEntry = useCallback(async (entry, slots = []) => {
    if (!entry) return;
    const seq = ++loadSeqRef.current;

    const { base: resolvedBase, masks: resolvedMasks, signature } = resolveVariantSources(entry, slots);
    if (signature && signature === lastSignatureRef.current) {
      return;
    }

    const prefix = entry.maskPath ? `dino/${entry.maskPath}/` : '';
    const baseCandidates = [];
    if (resolvedBase) {
      if (prefix) baseCandidates.push(prefix + resolvedBase);
      baseCandidates.push(resolvedBase);
    }

    const maskFiles = normalizeMasks(resolvedMasks);

    let primaryMaskIndex = maskFiles.findIndex((mf) => mf.toLowerCase().endsWith('_m.png'));
    if (primaryMaskIndex === -1 && maskFiles.length) primaryMaskIndex = 0;
    const primaryMaskFile = primaryMaskIndex >= 0 ? maskFiles[primaryMaskIndex] : null;

    const mask0Candidates = [];
    if (primaryMaskFile) {
      if (prefix) mask0Candidates.push(prefix + primaryMaskFile);
      mask0Candidates.push(primaryMaskFile);
    }

    const overlayList = primaryMaskIndex >= 0 ? maskFiles.filter((_, idx) => idx !== primaryMaskIndex) : maskFiles;

    const tryLoad = async (cands) => {
      for (const p of cands) {
        const img = await loadImageFromAssets(p);
        if (img) return img;
      }
      return null;
    };

    const overlayLoads = overlayList.map(async (mf) => {
      const cands = [];
      if (prefix) cands.push(prefix + mf);
      cands.push(mf);
      const img = await tryLoad(cands);
      let pair = null;
      const m = /_m_(\d{2})\.png$/i.exec(mf);
      if (m) {
        const a = Number.parseInt(m[1][0], 10);
        const b = Number.parseInt(m[1][1], 10);
        if (!Number.isNaN(a) && !Number.isNaN(b)) pair = [a, b];
      }
      return img ? { img, name: mf, pair } : null;
    });

    setBaseImg(null);
    setMaskImg(null);
    setExtraMasks([]);

    const [b, m0, overlays] = await Promise.all([
      baseCandidates.length ? tryLoad(baseCandidates) : Promise.resolve(null),
      mask0Candidates.length ? tryLoad(mask0Candidates) : Promise.resolve(null),
      overlayLoads.length ? Promise.all(overlayLoads) : Promise.resolve([]),
    ]);

    if (loadSeqRef.current !== seq) return;
    lastSignatureRef.current = signature || null;
    setBaseImg(b || null);
    setMaskImg(m0 || null);
    setExtraMasks((overlays || []).filter(Boolean));
  }, []);

  return { baseImg, maskImg, extraMasks, loadPairFromFiles, loadFromEntry };
}
