// src/App.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CanvasView from './components/CanvasView.jsx';
import CreaturePicker from './components/CreaturePicker.jsx';
import PaletteGrid from './components/PaletteGrid.jsx';
import Popover from './components/Popover.jsx';
import SlotControls from './components/SlotControls.jsx';
import Toolbar from './components/Toolbar.jsx';
import { useI18n, useLanguageOptions } from './i18n/index.js';
import { DEFAULTS } from './config/defaults.js';
import { useCreatures } from './hooks/useCreatures.js';
import { useImages } from './hooks/useImages.js';
import { useRecolorWorker } from './hooks/useRecolorWorker.js';
import { extractQuoted, extractSpeciesFromBlueprint, normalizeName, parseNumList, sanitizeName } from './utils/arkCmd.js';
import { ARK_PALETTE } from './utils/arkPalette.js';
import { STORAGE_KEYS, loadJSON, saveJSON } from './utils/storage.js';

const initialBg = loadJSON(STORAGE_KEYS.exportBg, DEFAULTS.exportBg);
const initialText = loadJSON(STORAGE_KEYS.exportTx, DEFAULTS.exportText);
// Load persisted slider states (fallback to defaults)
const initialThreshold = loadJSON(STORAGE_KEYS.threshold, DEFAULTS.threshold);
const initialStrength = loadJSON(STORAGE_KEYS.strength, DEFAULTS.strength);
const initialNeutralStrength = loadJSON(STORAGE_KEYS.neutralStrength, DEFAULTS.neutralStrength);
const initialFeather = loadJSON(STORAGE_KEYS.feather, DEFAULTS.feather);
const initialGamma = loadJSON(STORAGE_KEYS.gamma, DEFAULTS.gamma);
const initialKeepLight = loadJSON(STORAGE_KEYS.keepLight, DEFAULTS.keepLight);
const initialChromaBoost = loadJSON(STORAGE_KEYS.chromaBoost, DEFAULTS.chromaBoost);
const initialChromaCurve = loadJSON(STORAGE_KEYS.chromaCurve, DEFAULTS.chromaCurve);
const initialSpeckleClean = loadJSON(STORAGE_KEYS.speckleClean, DEFAULTS.speckleClean);
const initialEdgeSmooth = loadJSON(STORAGE_KEYS.edgeSmooth, DEFAULTS.edgeSmooth);
const initialBoundaryBlend = loadJSON(STORAGE_KEYS.boundaryBlend, DEFAULTS.boundaryBlend);
const initialOverlayTint = loadJSON(STORAGE_KEYS.overlayTint, DEFAULTS.overlayTint);
const initialOverlayStrength = loadJSON(STORAGE_KEYS.overlayStrength, DEFAULTS.overlayStrength);
const initialColorMixBoost = loadJSON(STORAGE_KEYS.colorMixBoost, DEFAULTS.colorMixBoost);
const initialOverlayColorStrength = loadJSON(STORAGE_KEYS.overlayColorStrength, DEFAULTS.overlayColorStrength);
const initialOverlayColorMixBoost = loadJSON(STORAGE_KEYS.overlayColorMixBoost, DEFAULTS.overlayColorMixBoost);

const idToEntry = (id) => ARK_PALETTE.find((p) => String(p.index) === String(id)) || null;
const QIDX_BP = 0; // Blueprint'...'
const QIDX_BASE = 2; // "103,53,0,0,100,105,0,0"
const QIDX_INC = 3; // "0,0,0,0,0,0,0,0"
const QIDX_NAME = 4; // "T�n dino do user d?t"
const QIDX_COLORS = 8; // "76,83,83,0,83,70"
function toVariantColorId(slotValue) {
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
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (slotValue.id != null) {
      const parsed = Number(slotValue.id);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (slotValue.value != null) {
      const parsed = Number(slotValue.value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

function buildVariantKey(entry, slots) {
  if (!entry?.variantSlots) {
    return '';
  }
  return Object.keys(entry.variantSlots)
    .map((slot) => {
      const idx = Number(slot);
      const colorId = toVariantColorId(slots?.[idx]);
      return `${slot}:${colorId == null ? 'x' : colorId}`;
    })
    .sort((a, b) => Number(a.split(':')[0]) - Number(b.split(':')[0]))
    .join('|');
}

function buildSlotsColorSignature(slots) {
  if (!Array.isArray(slots)) {
    return '';
  }
  return slots
    .map((slot) => {
      if (!slot) return 'x';
      if (typeof slot === 'string') return slot;
      if (slot.hex) return slot.hex;
      const id = toVariantColorId(slot);
      return id == null ? 'x' : `id:${id}`;
    })
    .join('|');
}

function normalizeFavoriteIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const value of values) {
    if (value == null) continue;
    const id = String(value);
    if (seen.has(id)) continue;
    const entry = ARK_PALETTE.find((p) => String(p.index) === id);
    if (!entry) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}

export default function App() {
  const { t, setLang, lang } = useI18n();
  const languageOptions = useLanguageOptions();
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);

  // ? KH?I T?O t? localStorage ngay l?p t?c (tr�nh overwrite)
  const initialSlots = useMemo(() => loadJSON(STORAGE_KEYS.slots, DEFAULTS.slots), []);
  const preferredCreature = useMemo(() => loadJSON(STORAGE_KEYS.creature, DEFAULTS.defaultCreatureName), []);
  const initialPaletteFavorites = useMemo(() => normalizeFavoriteIds(loadJSON(STORAGE_KEYS.paletteFavorites, DEFAULTS.paletteFavorites)), []);

  const [slots, setSlots] = useState(Array.isArray(initialSlots) && initialSlots.length === 6 ? initialSlots : DEFAULTS.slots);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [strength, setStrength] = useState(initialStrength);
  const [neutralStrength, setNeutralStrength] = useState(initialNeutralStrength);
  const [feather, setFeather] = useState(initialFeather);
  const [gamma, setGamma] = useState(initialGamma);
  const [speckleClean, setSpeckleClean] = useState(initialSpeckleClean);
  const [edgeSmooth, setEdgeSmooth] = useState(initialEdgeSmooth);
  const [boundaryBlend, setBoundaryBlend] = useState(initialBoundaryBlend);
  const [overlayTint, setOverlayTint] = useState(initialOverlayTint);
  const [overlayStrength, setOverlayStrength] = useState(initialOverlayStrength);
  const [overlayColorStrength, setOverlayColorStrength] = useState(initialOverlayColorStrength);
  const [overlayColorMixBoost, setOverlayColorMixBoost] = useState(initialOverlayColorMixBoost);
  const [colorMixBoost, setColorMixBoost] = useState(initialColorMixBoost);
  // Advanced OKLab tuning
  const [keepLight, setKeepLight] = useState(initialKeepLight);
  const [chromaBoost, setChromaBoost] = useState(initialChromaBoost);
  const [chromaCurve, setChromaCurve] = useState(initialChromaCurve);
  const [exportBg, setExportBg] = useState(initialBg);
  const [exportText, setExportText] = useState(initialText);
  const [favoriteColors, setFavoriteColors] = useState(initialPaletteFavorites);
  const [fillOpen, setFillOpen] = useState(false);
  const fillBtnRef = useRef(null);

  const { list, current, selectByName, setCurrent } = useCreatures(preferredCreature);
  const [tempCreatureName, setTempCreatureName] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const creatureName = tempCreatureName ?? (current?.name || '?');
  const disabledSet = customMode ? new Set() : new Set(current?.noMask || []);

  const { baseImg, maskImg, extraMasks, loadPairFromFiles, loadFromEntry } = useImages();
  const variantKey = useMemo(() => buildVariantKey(current, slots), [current, slots]);
  const slotsColorSignature = useMemo(() => buildSlotsColorSignature(slots), [slots]);
  const { draw, busy } = useRecolorWorker({ threshold, strength, neutralStrength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayStrength, overlayColorStrength, overlayColorMixBoost, colorMixBoost, overlayTint });
  const rafRef = useRef(0);
  const pendingArgsRef = useRef(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const toggleFavoriteColor = useCallback((entry) => {
    if (!entry || entry.index == null) return;
    const id = String(entry.index);
    setFavoriteColors((prevRaw) => {
      const prev = Array.isArray(prevRaw) ? prevRaw : [];
      const hasId = prev.includes(id);
      const next = hasId ? prev.filter((value) => value !== id) : [id, ...prev];
      saveJSON(STORAGE_KEYS.paletteFavorites, next);
      return next;
    });
  }, []);
  const resetFavoriteColors = useCallback(() => {
    const next = normalizeFavoriteIds(DEFAULTS.paletteFavorites);
    setFavoriteColors(next);
    saveJSON(STORAGE_KEYS.paletteFavorites, next);
  }, []);

  // Khi current thay d?i ? load ?nh d�ng con, KH�NG d�ng base.png m?c d?nh
  useEffect(() => {
    if (!current) return;
    loadFromEntry(current, slotsRef.current);
  }, [current, variantKey, loadFromEntry]);

  // Khi d?i creature ? set null cho c�c slot b? disable
  useEffect(() => {
    if (!current || customMode) return;
    const disabled = new Set(current.noMask || []);
    setSlots((prev) => prev.map((v, i) => (disabled.has(i) ? null : v)));
  }, [current, customMode]);

  // Khi b?t customMode, clear current d? l?n ch?n creature k? ti?p lu?n t?i d?ng ?nh
  useEffect(() => {
    if (customMode) {
      try {
        // setCurrent c? trong hook useCreatures

        setCurrent && setCurrent(null);
      } catch {
        /* empty */
      }
    }
  }, [customMode, setCurrent]);

  // V? khi d� c� ?nh
  useEffect(() => {
    if (!baseImg || !maskImg) return;
    const args = { baseImg, maskImg, extraMasks, baseCanvasRef, maskCanvasRef, outCanvasRef, slots: slotsRef.current };
    pendingArgsRef.current = args;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      draw(pendingArgsRef.current);
      rafRef.current = 0;
    });
  }, [baseImg, maskImg, extraMasks, slotsColorSignature, threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayStrength, overlayColorStrength, overlayColorMixBoost, colorMixBoost, overlayTint, draw]);

  // ? Luu slots m?i khi d?i (d� an to�n v� init t? storage)
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.slots, slots);
  }, [slots]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.threshold, threshold);
  }, [threshold]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.strength, strength);
  }, [strength]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.neutralStrength, neutralStrength);
  }, [neutralStrength]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.feather, feather);
  }, [feather]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.gamma, gamma);
  }, [gamma]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.keepLight, keepLight);
  }, [keepLight]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.chromaBoost, chromaBoost);
  }, [chromaBoost]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.chromaCurve, chromaCurve);
  }, [chromaCurve]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.speckleClean, speckleClean);
  }, [speckleClean]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.edgeSmooth, edgeSmooth);
  }, [edgeSmooth]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.boundaryBlend, boundaryBlend);
  }, [boundaryBlend]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.overlayTint, overlayTint);
  }, [overlayTint]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.overlayStrength, overlayStrength);
  }, [overlayStrength]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.overlayColorStrength, overlayColorStrength);
  }, [overlayColorStrength]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.overlayColorMixBoost, overlayColorMixBoost);
  }, [overlayColorMixBoost]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.colorMixBoost, colorMixBoost);
  }, [colorMixBoost]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportBg, exportBg);
  }, [exportBg]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportTx, exportText);
  }, [exportText]);

  // ? Luu creature khi d?i
  useEffect(() => {
    if (current?.name) saveJSON(STORAGE_KEYS.creature, current.name);
  }, [current, customMode]);
  async function handlePasteCmd() {
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt) return;
      const quoted = extractQuoted(txt);

      // --- 1) Species t? Blueprint -> auto select creature
      const bpStr = quoted[QIDX_BP] ?? '';
      const speciesRaw = extractSpeciesFromBlueprint(bpStr); // "Basilisk"
      const speciesNorm = normalizeName(speciesRaw);
      if (speciesNorm) {
        // t�m trong creatures.json (so kh�ng ph�n bi?t hoa thu?ng, b? _-)
        const found = list.find((c) => normalizeName(c.name) === speciesNorm);
        if (found) {
          selectByName(found.name); // load d�ng base/mask c?a lo�i
          saveJSON(STORAGE_KEYS.creature, found.name);
          // n?u b?n dang c� tempCreatureName d? hi?n th? t�n t? do, n�n clear:
          setTempCreatureName(null);
        }
      }

      // --- 2) T�n ngu?i d�ng d?t (d? hi?n th? ph?): kh�ng ch?a k� t? d?c bi?t
      const rawName = quoted[QIDX_NAME] ?? '';
      const dinoName = sanitizeName(rawName);
      if (dinoName) saveJSON(STORAGE_KEYS.cmdName, dinoName);

      // --- 3) Base/Inc stats (8 s? m?i b�n) -> luu l?i cho tuong lai
      const baseStats = parseNumList(quoted[QIDX_BASE], 8, 8);
      const incStats = parseNumList(quoted[QIDX_INC], 8, 8);
      if (baseStats) saveJSON(STORAGE_KEYS.cmdBaseStats, baseStats);
      if (incStats) saveJSON(STORAGE_KEYS.cmdIncStats, incStats);

      // --- 4) M�u 6 slot -> apply (b? qua slot b? noMask)
      const colorIds = parseNumList(quoted[QIDX_COLORS], 6, 6);
      if (colorIds) {
        const disabled = new Set(current?.noMask || []);
        setSlots(
          Array.from({ length: 6 }, (_, i) => {
            if (disabled.has(i)) return null;
            const id = colorIds[i];
            return id === 255 || id == null ? null : idToEntry(id);
          })
        );
      }

      // (tu? ch?n) hi?n th? toast: ��� d�n CMD, auto ch?n Basilisk v� �p m�u�
    } catch (e) {
      console.error('Paste CMD failed', e);
    }
  }

  const [downloadingType, setDownloadingType] = useState(null); // 'image' | 'palette' | null

  function handleDownloadImage() {
    const src = outCanvasRef.current;
    if (!src) return;
    const W = src.width,
      H = src.height;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d');
    if (exportBg && exportBg !== 'transparent') {
      ctx.fillStyle = exportBg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    ctx.drawImage(src, 0, 0, W, H);
    setDownloadingType('image');
    off.toBlob((blob) => {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'recolor.png';
        a.click();
        URL.revokeObjectURL(a.href);
      } finally {
        setDownloadingType(null);
      }
    }, 'image/png');
  }

  function handleDownloadWithPalette() {
    const src = outCanvasRef.current;
    if (!src) return;
    const W = src.width,
      H = src.height;
    // layout similar to CanvasView.exportWithPaletteBlob
    const padTop = 10,
      padBottom = 18,
      padX = 16;
    const gap = 12,
      sw = 44,
      sh = 44,
      labelY = 14,
      items = 6;
    const contentW = items * sw + (items - 1) * gap;
    const stripW = Math.min(W - padX * 2, contentW);
    const startX = Math.round((W - stripW) / 2);
    const startY = H + padTop;
    const totalH = H + padTop + sh + labelY + padBottom;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = totalH;
    const ctx = off.getContext('2d');
    if (exportBg && exportBg !== 'transparent') {
      ctx.fillStyle = exportBg;
      ctx.fillRect(0, 0, W, totalH);
    } else {
      ctx.clearRect(0, 0, W, totalH);
    }
    ctx.drawImage(src, 0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `12px system-ui, -apple-system, Segoe UI, Roboto`;
    let x = startX,
      y = startY;
    for (let i = 0; i < 6; i++) {
      const entry = slots[i];
      // swatch box
      if (entry?.hex) {
        ctx.fillStyle = entry.hex;
        roundRect(ctx, x, y, sw, sh, 8);
        ctx.fill();
        // index
        const rgb = hexToRgb(entry.hex);
        if (rgb) {
          const lum = relLuminance(rgb[0], rgb[1], rgb[2]);
          ctx.fillStyle = lum > 0.55 ? '#111' : '#fff';
          ctx.fillText(String(entry.index), x + sw / 2, y + sh / 2);
        }
      } else {
        drawChecker(ctx, x, y, sw, sh, 8);
        ctx.strokeStyle = '#ccc';
        roundRect(ctx, x, y, sw, sh, 8);
        ctx.stroke();
      }
      // label
      ctx.fillStyle = exportText || '#fff';
      const labelText = t('canvas.slotLabel', { index: i });
      ctx.fillText(labelText, x + sw / 2, y + sh + labelY - 4);
      x += sw + gap;
    }
    setDownloadingType('palette');
    off.toBlob((blob) => {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'recolor_palette.png';
        a.click();
        URL.revokeObjectURL(a.href);
      } finally {
        setDownloadingType(null);
      }
    }, 'image/png');
  }

  function hexToRgb(hex) {
    const h = hex?.[0] === '#' ? hex.slice(1) : hex;
    if (!h || h.length !== 6) return null;
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function relLuminance(r, g, b) {
    const toLin = (v) => (v <= 10.314 ? v / 3294 : Math.pow((v + 14.025) / 269.025, 2.4));
    const rl = toLin(r),
      gl = toLin(g),
      bl = toLin(b);
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  }
  const isNearBlack = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    return relLuminance(rgb[0], rgb[1], rgb[2]) < 0.22;
  };
  const isGrayish = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const max = Math.max(...rgb),
      min = Math.min(...rgb);
    const sat = (max - min) / 255;
    return sat < 0.1; // low chroma
  };
  // Light gray/white range: #FFFFFF down to #616161 (inclusive), and grayish (low chroma)
  const isLightGrayOrWhite = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const [r, g, b] = rgb;
    const grayish = isGrayish(hex);
    const lightEnough = r >= 0x61 && g >= 0x61 && b >= 0x61; // >= #616161
    return grayish && lightEnough;
  };

  // Smart setter for export BG to keep text readable automatically
  function handleSetExportBg(next) {
    setExportBg(next);
    try {
      if (next === 'transparent') {
        if (exportText && isGrayish(exportText)) {
          setExportText('#171717'); // ARK 79 ActualBlack
        }
        return;
      }
      if (typeof next === 'string' && next.startsWith('#') && next.length === 7) {
        // PRIORITY: Light gray/white first to avoid flicker in gray range
        if (isLightGrayOrWhite(next)) {
          // BG white..gray: if text is white -> swap to black
          if (exportText === '#FFFFFF') setExportText('#171717');
          return;
        }

        // Else consider near-black backgrounds
        if (isNearBlack(next)) {
          if (exportText === '#171717' || isNearBlack(exportText)) {
            setExportText('#FFFFFF'); // ARK 36
          }
          return;
        }
        // Other mid colors: do nothing to avoid jitter while dragging
      }
    } catch {
      /* empty */
    }
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function drawChecker(c, x, y, w, h, size) {
    c.save();
    c.fillStyle = '#cfcfcf';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#e9e9e9';
    for (let yy = 0; yy < h; yy += size) {
      for (let xx = Math.floor(yy / size) % 2 === 0 ? 0 : size; xx < w; xx += size * 2) {
        c.fillRect(x + xx, y + yy, size, size);
      }
    }
    c.restore();
  }

  const doFillWith = (entry) => {
    setSlots(Array.from({ length: 6 }, (_, i) => (disabledSet.has(i) ? null : entry ? { ...entry } : null)));
    setFillOpen(false);
  };

  const reset = () => {
    setThreshold(DEFAULTS.threshold);
    setStrength(DEFAULTS.strength);
    setNeutralStrength(DEFAULTS.neutralStrength);
    setFeather(DEFAULTS.feather);
    setGamma(DEFAULTS.gamma);
    setKeepLight(DEFAULTS.keepLight);
    setChromaBoost(DEFAULTS.chromaBoost);
    setChromaCurve(DEFAULTS.chromaCurve);
    setSpeckleClean(DEFAULTS.speckleClean);
    setEdgeSmooth(DEFAULTS.edgeSmooth);
    setBoundaryBlend(DEFAULTS.boundaryBlend);
    setOverlayStrength(DEFAULTS.overlayStrength);
    setOverlayColorStrength(DEFAULTS.overlayColorStrength);
    setOverlayColorMixBoost(DEFAULTS.overlayColorMixBoost);
    setColorMixBoost(DEFAULTS.colorMixBoost);
    setOverlayTint(DEFAULTS.overlayTint);
    // slots s? du?c luu l?i qua effect ? tr�n
  };
  const onPickSlot = (i, entryOrNull) => {
    setSlots((prev) => {
      const next = prev.slice();
      next[i] = entryOrNull ? { ...entryOrNull } : null;
      return next;
    });
  };
  const randomAll = () => {
    const pool = ARK_PALETTE.filter((p) => String(p.index) !== '255');
    setSlots(Array.from({ length: 6 }, (_, i) => (disabledSet.has(i) ? null : pool[Math.floor(Math.random() * pool.length)])));
  };

  async function handleCustomFiles(fileList) {
    const baseName = await loadPairFromFiles(fileList);
    if (!baseName) return;
    setCustomMode(true);
    setTempCreatureName(baseName);
    try {
      setCurrent && setCurrent(null);
    } catch {
      /* empty */
    }
    saveJSON(STORAGE_KEYS.creature, baseName);
  }
  const resetSlotsOnly = () => {
    setSlots(Array.from({ length: 6 }, () => null));
  };

  return (
    <div className="container">
      <section className="panel">
        <div
          className="title"
          style={{ textAlign: 'center', fontWeight: 800 }}>
          ARK Mask Colorizer
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <label
            className="small subtle"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{t('language.selectorLabel')}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}>
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8, color: 'var(--muted)' }}>{creatureName}</div>

        {/* ?? truy?n exportBg/exportText xu?ng d? CanvasView copy d�ng */}
        <CanvasView
          outCanvasRef={outCanvasRef}
          loading={!baseImg || !maskImg}
          busy={busy}
          slots={slots}
          exportBg={exportBg}
          exportText={exportText}
        />

        <Toolbar
          threshold={threshold}
          setThreshold={setThreshold}
          strength={strength}
          setStrength={setStrength}
          neutralStrength={neutralStrength}
          setNeutralStrength={setNeutralStrength}
          feather={feather}
          setFeather={setFeather}
          gamma={gamma}
          setGamma={setGamma}
          keepLight={keepLight}
          setKeepLight={setKeepLight}
          chromaBoost={chromaBoost}
          setChromaBoost={setChromaBoost}
          chromaCurve={chromaCurve}
          setChromaCurve={setChromaCurve}
          speckleClean={speckleClean}
          setSpeckleClean={setSpeckleClean}
          edgeSmooth={edgeSmooth}
          setEdgeSmooth={setEdgeSmooth}
          boundaryBlend={boundaryBlend}
          setBoundaryBlend={setBoundaryBlend}
          overlayStrength={overlayStrength}
          setOverlayStrength={setOverlayStrength}
          overlayColorStrength={overlayColorStrength}
          setOverlayColorStrength={setOverlayColorStrength}
          overlayColorMixBoost={overlayColorMixBoost}
          setOverlayColorMixBoost={setOverlayColorMixBoost}
          colorMixBoost={colorMixBoost}
          setColorMixBoost={setColorMixBoost}
          overlayTint={overlayTint}
          setOverlayTint={setOverlayTint}
          exportBg={exportBg}
          setExportBg={handleSetExportBg}
          exportText={exportText}
          setExportText={setExportText}
          onReset={reset}
          onDownloadImage={handleDownloadImage}
          onDownloadWithPalette={handleDownloadWithPalette}
          downloadingType={downloadingType}
          onCustomFiles={handleCustomFiles}
        />
      </section>

      <section className="panel">
        <CreaturePicker
          key={customMode ? 'custom' : current?.name || 'none'}
          list={list}
          currentName={current?.name || ''}
          customMode={customMode}
          onPick={(name) => {
            if (!name) return;
            setCustomMode(false);
            setTempCreatureName(null);
            selectByName(name);
          }}
        />
        <hr />

        <div className="title">{t('app.slotsTitle')}</div>
        <SlotControls
          slots={slots}
          disabledSet={disabledSet} // ?? truy?n xu?ng
          onPickSlot={onPickSlot}
          onRandomAll={randomAll}
          onResetSlots={resetSlotsOnly}
          favorites={favoriteColors}
          onToggleFavorite={toggleFavoriteColor}
          onResetFavorites={resetFavoriteColors}
          onPasteCmd={handlePasteCmd}
          extraActions={
            <>
              <button
                ref={fillBtnRef}
                className="btn"
                onClick={() => setFillOpen(true)}>
                {t('app.fill')}
              </button>
              {fillOpen && (
                <Popover
                  anchorRef={fillBtnRef}
                  onClose={() => setFillOpen(false)}>
                  <div style={{ padding: 10 }}>
                    <PaletteGrid
                      big
                      showIndex
                      favorites={favoriteColors}
                      onPick={(p) => doFillWith(p)}
                      onToggleFavorite={toggleFavoriteColor}
                      onResetFavorites={resetFavoriteColors}
                    />
                  </div>
                </Popover>
              )}
            </>
          }
        />

        <hr />
        <div className="subtle small">{t('app.lastUpdate', { date: '2025/9/24 17:55' })}</div>

        {/* working canvases */}
        <canvas
          ref={baseCanvasRef}
          style={{ display: 'none' }}
        />
        <canvas
          ref={maskCanvasRef}
          style={{ display: 'none' }}
        />
      </section>
    </div>
  );
}





























