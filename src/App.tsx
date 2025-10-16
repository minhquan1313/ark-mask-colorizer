import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { ExtractorIcon, LibraryIcon, MaskIcon, SettingsIcon, UtilitiesIcon } from './components/icons/NavIcons';
import ExtractorPage from './components/pages/ExtractorPage';
import LibraryPage from './components/pages/LibraryPage';
import MaskPage from './components/pages/MaskPage';
import SettingsPage from './components/pages/SettingsPage';
import UtilitiesPage from './components/pages/UtilitiesPage';
import { DEFAULTS } from './config/defaults';
import { MaskSettingsProvider } from './context/MaskSettingsContext';
import { useCreatures } from './hooks/useCreatures';
import { useImages } from './hooks/useImages';
import useMaskSettingsState from './hooks/useMaskSettingsState';
import { useRecolorWorker } from './hooks/useRecolorWorker';
import { useI18n, useLanguageOptions } from './i18n';
import type {
  CanvasState,
  CreaturePickerControls,
  FillControls as FillControlState,
  RecolorDrawArgs,
  SlotLinkMap,
  ToolbarActions as ToolbarActionState,
} from './types/mask';
import { extractQuoted, extractSpeciesFromBlueprint, normalizeName, parseNumList, sanitizeName } from './utils/arkCmd';
import { ARK_PALETTE, type ArkPaletteEntry } from './utils/arkPalette';
import { hexToRgb, relLuminance } from './utils/contrast';
import { cloneSlotValue, slotHex, slotIndexString } from './utils/slotDisplay';
import { buildSlotsColorSignature, buildVariantKey, idToEntry, normalizeFavoriteIds, type SlotValue } from './utils/slotUtils';
import { STORAGE_KEYS, loadJSON, saveJSON } from './utils/storage';

const QIDX_BP = 0; // Blueprint'...'
const QIDX_BASE = 2; // "103,53,0,0,100,105,0,0"
const QIDX_INC = 3; // "0,0,0,0,0,0,0,0"
const QIDX_NAME = 4; // "T?n dino do user d?t"
const QIDX_COLORS = 8; // "76,83,83,0,83,70"

type CachedRender = {
  url: string | null;
  width: number;
  height: number;
};

export default function App() {
  const { t, setLang, lang } = useI18n();
  const languageOptions = useLanguageOptions();
  const location = useLocation();
  const isMaskPage = location.pathname === '/' || location.pathname.startsWith('/mask');
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ? KH?I T?O t? localStorage ngay l?p t?c (tr?nh overwrite)
  const initialSlots = useMemo(() => loadJSON(STORAGE_KEYS.slots, DEFAULTS.slots), []);
  const preferredCreature = useMemo(() => loadJSON(STORAGE_KEYS.creature, DEFAULTS.defaultCreatureName), []);
  const initialPaletteFavorites = useMemo(() => normalizeFavoriteIds(loadJSON(STORAGE_KEYS.paletteFavorites, DEFAULTS.paletteFavorites)), []);

  const maskSettings = useMaskSettingsState();
  const {
    threshold,
    setThreshold,
    strength,
    setStrength,
    neutralStrength,
    setNeutralStrength,
    feather,
    setFeather,
    gamma,
    setGamma,
    keepLight,
    setKeepLight,
    chromaBoost,
    setChromaBoost,
    chromaCurve,
    setChromaCurve,
    speckleClean,
    setSpeckleClean,
    edgeSmooth,
    setEdgeSmooth,
    boundaryBlend,
    setBoundaryBlend,
    overlayStrength,
    setOverlayStrength,
    overlayColorStrength,
    setOverlayColorStrength,
    overlayColorMixBoost,
    setOverlayColorMixBoost,
    colorMixBoost,
    setColorMixBoost,
    overlayTint,
    setOverlayTint,
    unlockAllSlots,
    exportBg,
    setExportBg,
    exportText,
    setExportText,
  } = maskSettings;
  const defaultSlotFallback = useMemo(() => idToEntry(36), []);

  const [slots, setSlots] = useState<SlotValue[]>(() => {
    if (Array.isArray(initialSlots) && initialSlots.length === 6) {
      return initialSlots as SlotValue[];
    }
    return (DEFAULTS.slots as SlotValue[]).slice();
  });
  const [favoriteColors, setFavoriteColors] = useState<string[]>(initialPaletteFavorites);
  const [fillOpen, setFillOpen] = useState<boolean>(false);
  const fillBtnRef = useRef<HTMLButtonElement | null>(null);
  const openFill = useCallback(() => setFillOpen(true), []);
  const closeFill = useCallback(() => setFillOpen(false), []);
  const { list, current, selectByName, setCurrent } = useCreatures(preferredCreature);
  const [tempCreatureName, setTempCreatureName] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const creatureName = tempCreatureName ?? (current?.name || '?');
  const { baseImg, maskImg, extraMasks, loadPairFromFiles, loadFromEntry, maskAvailable } = useImages();
  const hasMaskSources = useMemo(() => {
    if (!current) return false;
    const maskList = Array.isArray(current.masks) ? current.masks : [];
    return maskList.some((value) => typeof value === 'string' && value.trim().length > 0);
  }, [current]);
  const baseOnlyMode = !maskAvailable && !hasMaskSources;
  const copyDisabledSet = useMemo<Set<number>>(() => {
    if (baseOnlyMode) return new Set([0, 1, 2, 3, 4, 5]);
    if (!unlockAllSlots) return new Set();
    return new Set<number>(current?.noMask || []);
  }, [baseOnlyMode, unlockAllSlots, current]);
  const disabledSet = useMemo<Set<number>>(() => {
    if (customMode) return new Set();
    if (baseOnlyMode) return new Set([0, 1, 2, 3, 4, 5]);
    if (unlockAllSlots) return new Set();
    return new Set<number>(current?.noMask || []);
  }, [customMode, current, unlockAllSlots, baseOnlyMode]);

  useEffect(() => {
    if (baseOnlyMode && fillOpen) {
      setFillOpen(false);
    }
  }, [baseOnlyMode, fillOpen]);
  const slotLinks = useMemo<SlotLinkMap>(() => {
    if (!Array.isArray(extraMasks) || !extraMasks.length) {
      return {};
    }
    const map: SlotLinkMap = {};
    for (const mask of extraMasks) {
      const pair = Array.isArray(mask?.pair) ? mask.pair : [];
      if (pair.length !== 2) continue;
      const [rawA, rawB] = pair;
      const a = Number(rawA);
      const b = Number(rawB);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (a === b) continue;
      if (a < 0 || a > 5 || b < 0 || b > 5) continue;
      const currentA = Array.isArray(map[a]) ? map[a] : [];
      const currentB = Array.isArray(map[b]) ? map[b] : [];
      map[a] = Array.from(new Set([...currentA, b])).filter((idx) => idx >= 0 && idx <= 5);
      map[b] = Array.from(new Set([...currentB, a])).filter((idx) => idx >= 0 && idx <= 5);
    }
    return map;
  }, [extraMasks]);
  const variantKey = useMemo(() => buildVariantKey(current, slots), [current, slots]);
  const slotsColorSignature = useMemo(() => buildSlotsColorSignature(slots), [slots]);
  const { draw, busy } = useRecolorWorker({
    threshold,
    strength,
    neutralStrength,
    feather,
    gamma,
    keepLight,
    chromaBoost,
    chromaCurve,
    speckleClean,
    edgeSmooth,
    boundaryBlend,
    overlayStrength,
    overlayColorStrength,
    overlayColorMixBoost,
    colorMixBoost,
    overlayTint,
  });
  const rafRef = useRef<number | null>(null);
  const pendingArgsRef = useRef<RecolorDrawArgs | null>(null);
  const slotsRef = useRef<SlotValue[]>(slots);
  const cachedRenderRef = useRef<CachedRender>({ url: null, width: 0, height: 0 });
  const [maskRenderNonce, setMaskRenderNonce] = useState<number>(0);
  slotsRef.current = slots;
  const toggleFavoriteColor = useCallback((entry: ArkPaletteEntry | null | undefined) => {
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

  const reorderFavoriteColors = useCallback((nextOrder: Array<string | number | null | undefined>) => {
    if (!Array.isArray(nextOrder)) return;
    setFavoriteColors((prevRaw) => {
      const prev = Array.isArray(prevRaw) ? prevRaw.map((id) => String(id)) : [];
      const sanitized = nextOrder.map((id) => String(id)).filter((id, index, arr) => arr.indexOf(id) === index);
      const preserved = sanitized.filter((id) => prev.includes(id));
      const remainder = prev.filter((id) => !preserved.includes(id));
      const next = preserved.concat(remainder);
      saveJSON(STORAGE_KEYS.paletteFavorites, next);
      return next;
    });
  }, []);

  // Khi current thay d?i ? load ?nh d?ng con, KH?NG d?ng base.png m?c d?nh
  useEffect(() => {
    if (!current) return;
    loadFromEntry(current, slotsRef.current);
  }, [current, variantKey, loadFromEntry]);

  // Khi d?i creature ? set null cho c?c slot b? disable
  useEffect(() => {
    if (!current || customMode || unlockAllSlots || baseOnlyMode) return;
    const disabled = new Set(current.noMask || []);
    const fallback = defaultSlotFallback;
    setSlots((prev) =>
      prev.map((value, index) => {
        if (disabled.has(index)) return null;
        if ((value == null || value === undefined) && fallback) {
          return cloneSlotValue(fallback);
        }
        return value;
      }),
    );
  }, [current, customMode, defaultSlotFallback, unlockAllSlots, baseOnlyMode]);

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

  useEffect(() => {
    if (!isMaskPage) return undefined;

    setMaskRenderNonce((value) => value + 1);
    const canvas = outCanvasRef.current;
    const cache = cachedRenderRef.current;
    if (canvas && cache?.url) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (cache.width && cache.height && (canvas.width !== cache.width || canvas.height !== cache.height)) {
          canvas.width = cache.width;
          canvas.height = cache.height;
        }
        const img = new Image();
        img.onload = () => {
          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch {
            /* ignore draw from cache errors */
          }
        };
        img.src = cache.url;
      }
    }
    const cleanupCanvas = outCanvasRef.current;
    return () => {
      if (!cleanupCanvas || !cleanupCanvas.width || !cleanupCanvas.height) {
        cachedRenderRef.current = { url: null, width: 0, height: 0 };
        return;
      }
      try {
        cachedRenderRef.current = {
          url: cleanupCanvas.toDataURL('image/png'),
          width: cleanupCanvas.width,
          height: cleanupCanvas.height,
        };
      } catch {
        cachedRenderRef.current = { url: null, width: 0, height: 0 };
      }
    };
  }, [isMaskPage]);

  useEffect(() => {
    if (!isMaskPage) return;
    if (!baseOnlyMode) return;
    if (!baseImg || !baseImg.complete) return;
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const outCanvas = outCanvasRef.current;
    if (!baseCanvas || !outCanvas) return;
    const width = baseImg.naturalWidth || baseImg.width || 0;
    const height = baseImg.naturalHeight || baseImg.height || 0;
    if (!width || !height) return;
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!baseCtx) return;
    baseCtx.clearRect(0, 0, width, height);
    baseCtx.drawImage(baseImg, 0, 0, width, height);
    if (maskCanvas) {
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) maskCtx.clearRect(0, 0, width, height);
    }
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;
    outCtx.clearRect(0, 0, width, height);
    outCtx.drawImage(baseCanvas, 0, 0, width, height);
  }, [isMaskPage, baseImg, baseOnlyMode]);

  // V? khi d? c? ?nh
  useEffect(() => {
    if (!isMaskPage) return;
    if (!baseImg || !maskImg) return;
    const args: RecolorDrawArgs = {
      baseImg,
      maskImg,
      extraMasks,
      baseCanvasRef,
      maskCanvasRef,
      outCanvasRef,
      slots: slotsRef.current,
      renderNonce: maskRenderNonce,
    };
    pendingArgsRef.current = args;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const pending = pendingArgsRef.current;
      if (pending) {
        draw(pending);
      }
      rafRef.current = null;
    });
  }, [
    isMaskPage,
    maskRenderNonce,
    baseImg,
    maskImg,
    extraMasks,
    slotsColorSignature,
    threshold,
    strength,
    feather,
    gamma,
    keepLight,
    chromaBoost,
    chromaCurve,
    speckleClean,
    edgeSmooth,
    boundaryBlend,
    overlayStrength,
    overlayColorStrength,
    overlayColorMixBoost,
    colorMixBoost,
    overlayTint,
    draw,
  ]);

  // ? Luu slots m?i khi d?i (d? an to?n v? init t? storage)
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.slots, slots);
  }, [slots]);
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
        // t?m trong creatures.json (so kh?ng ph?n bi?t hoa thu?ng, b? _-)
        const found = list.find((c) => normalizeName(c.name) === speciesNorm);
        if (found) {
          selectByName(found.name); // load d?ng base/mask c?a lo?i
          saveJSON(STORAGE_KEYS.creature, found.name);
          // n?u b?n dang c? tempCreatureName d? hi?n th? t?n t? do, n?n clear:
          setTempCreatureName(null);
        }
      }

      // --- 2) T?n ngu?i d?ng d?t (d? hi?n th? ph?): kh?ng ch?a k? t? d?c bi?t
      const rawName = quoted[QIDX_NAME] ?? '';
      const dinoName = sanitizeName(rawName);
      if (dinoName) saveJSON(STORAGE_KEYS.cmdName, dinoName);

      // --- 3) Base/Inc stats (8 s? m?i b?n) -> luu l?i cho tuong lai
      const baseStats = parseNumList(quoted[QIDX_BASE], 8, 8);
      const incStats = parseNumList(quoted[QIDX_INC], 8, 8);
      if (baseStats) saveJSON(STORAGE_KEYS.cmdBaseStats, baseStats);
      if (incStats) saveJSON(STORAGE_KEYS.cmdIncStats, incStats);

      // --- 4) M?u 6 slot -> apply (b? qua slot b? noMask)
      let colorIds = parseNumList(quoted[QIDX_COLORS], 6, 6);
      if (!colorIds) {
        const directMatches = Array.from(txt.matchAll(/setTargetDinoColor\s+(\d)\s+(\d+)/gi));
        if (directMatches.length > 0) {
          const direct = Array(6).fill(255);
          let applied = false;
          for (const match of directMatches) {
            const slotIdx = Number(match[1]);
            const colorId = Number(match[2]);
            if (!Number.isInteger(slotIdx) || slotIdx < 0 || slotIdx > 5) continue;
            if (!Number.isFinite(colorId)) continue;
            direct[slotIdx] = colorId;
            applied = true;
          }
          if (applied) {
            colorIds = direct;
          }
        }
      }
      if (colorIds) {
        const disabled = baseOnlyMode ? new Set([0, 1, 2, 3, 4, 5]) : unlockAllSlots ? new Set() : new Set(current?.noMask || []);
        setSlots(
          Array.from({ length: 6 }, (_, i) => {
            if (disabled.has(i)) return null;
            const id = colorIds[i];
            return id === 255 || id == null ? null : cloneSlotValue(idToEntry(id));
          }),
        );
      }

      // (tu? ch?n) hi?n th? toast: ??? d?n CMD, auto ch?n Basilisk v? ?p m?u?
    } catch (e) {
      console.error('Paste CMD failed', e);
    }
  }

  const [downloadingType, setDownloadingType] = useState<'image' | 'palette' | null>(null);

  function handleDownloadImage() {
    const src = outCanvasRef.current;
    if (!src) return;
    const W = src.width,
      H = src.height;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d');
    if (!ctx) return;
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
        if (!blob) return;
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
    if (!ctx) return;
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
    let x = startX;
    const y = startY;
    for (let i = 0; i < 6; i++) {
      const slotValue = slots[i];
      const hex = slotHex(slotValue);
      // swatch box
      if (hex) {
        ctx.fillStyle = hex;
        roundRect(ctx, x, y, sw, sh, 8);
        ctx.fill();
        // index
        const rgb = hexToRgb(hex);
        if (rgb) {
          const lum = relLuminance(rgb[0], rgb[1], rgb[2]);
          ctx.fillStyle = lum > 0.55 ? '#111' : '#fff';
          const idxLabel = slotIndexString(slotValue) ?? '';
          ctx.fillText(idxLabel, x + sw / 2, y + sh / 2);
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
        if (!blob) return;
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

  function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function drawChecker(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number) {
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

  const doFillWith = useCallback(
    (entry: ArkPaletteEntry | null) => {
      setSlots(Array.from({ length: 6 }, (_, i) => (disabledSet.has(i) ? null : cloneSlotValue(entry))));
      closeFill();
    },
    [disabledSet, closeFill],
  );

  const reset = useCallback(() => {
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
    setExportBg(DEFAULTS.exportBg);
    setExportText(DEFAULTS.exportText);
  }, [
    setThreshold,
    setStrength,
    setNeutralStrength,
    setFeather,
    setGamma,
    setKeepLight,
    setChromaBoost,
    setChromaCurve,
    setSpeckleClean,
    setEdgeSmooth,
    setBoundaryBlend,
    setOverlayStrength,
    setOverlayColorStrength,
    setOverlayColorMixBoost,
    setColorMixBoost,
    setOverlayTint,
    setExportBg,
    setExportText,
  ]);

  async function handleCustomFiles(fileList: FileList | File[] | null | undefined) {
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

  const onPickSlot = useCallback((slotIndex: number, entryOrNull: SlotValue | null) => {
    setSlots((prev) => {
      const next = prev.slice();
      next[slotIndex] = cloneSlotValue(entryOrNull);
      return next;
    });
  }, []);

  const randomAll = useCallback(() => {
    const pool = ARK_PALETTE.filter((p) => String(p.index) !== '255');
    setSlots(
      Array.from({ length: 6 }, (_, i) => {
        if (disabledSet.has(i) || pool.length === 0) return null;
        return { ...pool[Math.floor(Math.random() * pool.length)] };
      }),
    );
  }, [disabledSet]);

  const navItems = useMemo(
    () => [
      {
        id: 'mask',
        to: '/mask',
        end: true,
        label: t('nav.mask', { defaultValue: 'Mask' }),
        icon: <MaskIcon style={{ fontSize: 24 }} />,
      },
      {
        id: 'extractor',
        to: '/extractor',
        label: t('nav.extractor', { defaultValue: 'Extractor' }),
        icon: <ExtractorIcon style={{ fontSize: 24 }} />,
      },
      {
        id: 'library',
        to: '/library',
        label: t('nav.library', { defaultValue: 'Library' }),
        icon: <LibraryIcon style={{ fontSize: 24 }} />,
      },
      {
        id: 'utilities',
        to: '/utilities',
        label: t('nav.utilities', { defaultValue: 'Utilities' }),
        icon: <UtilitiesIcon style={{ fontSize: 24 }} />,
      },
      {
        id: 'settings',
        to: '/settings',
        label: t('nav.settings', { defaultValue: 'Settings' }),
        icon: <SettingsIcon style={{ fontSize: 24 }} />,
      },
    ],
    [t],
  );

  const handleSelectCreature = useCallback(
    (name: string | null | undefined) => {
      if (!name) return;
      setCustomMode(false);
      setTempCreatureName(null);
      selectByName(name);
    },
    [selectByName, setCustomMode, setTempCreatureName],
  );

  const canvasState: CanvasState = {
    baseImg,
    maskImg,
    extraMasks,
    busy,
    outCanvasRef,
    baseCanvasRef,
    maskCanvasRef,
  };

  const fillControls: FillControlState = {
    isOpen: fillOpen,
    anchorRef: fillBtnRef,
    open: openFill,
    close: closeFill,
    onPick: doFillWith,
  };

  const creaturePickerProps: CreaturePickerControls = {
    list: list ?? [],
    currentName: current?.name || '',
    customMode,
    onSelect: handleSelectCreature,
  };

  const toolbarActions: ToolbarActionState = {
    onReset: reset,
    onDownloadImage: handleDownloadImage,
    onDownloadWithPalette: handleDownloadWithPalette,
    downloadingType,
    onCustomFiles: handleCustomFiles,
  };

  const maskPageElement = (
    <MaskPage
      t={t}
      creatureName={creatureName}
      canvas={canvasState}
      slots={slots}
      exportBg={exportBg}
      exportText={exportText}
      disabledSet={disabledSet}
      slotLinks={slotLinks}
      onPickSlot={onPickSlot}
      onRandomAll={randomAll}
      onResetSlots={resetSlotsOnly}
      favoriteColors={favoriteColors}
      onToggleFavorite={toggleFavoriteColor}
      onResetFavorites={resetFavoriteColors}
      onReorderFavorites={reorderFavoriteColors}
      onPasteCmd={handlePasteCmd}
      fillControls={fillControls}
      creaturePicker={creaturePickerProps}
      toolbarActions={toolbarActions}
      slotControlsDisabled={baseOnlyMode}
      copyDisabledSet={copyDisabledSet}
    />
  );

  const settingsPageElement = (
    <SettingsPage
      t={t}
      languageOptions={languageOptions}
      lang={lang}
      onSelectLanguage={setLang}
    />
  );

  return (
    <MaskSettingsProvider value={maskSettings}>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                <Navigate
                  to="/mask"
                  replace
                />
              }
            />
            <Route
              path="/mask"
              element={maskPageElement}
            />
            <Route
              path="/extractor"
              element={<ExtractorPage t={t} />}
            />
            <Route
              path="/library"
              element={<LibraryPage t={t} />}
            />
            <Route
              path="/utilities"
              element={<UtilitiesPage t={t} />}
            />
            <Route
              path="/settings"
              element={settingsPageElement}
            />
            <Route
              path="*"
              element={
                <Navigate
                  to="/mask"
                  replace
                />
              }
            />
          </Routes>
        </main>
        <BottomNav items={navItems} />
      </div>
    </MaskSettingsProvider>
  );
}
