// src/App.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomNav from './components/BottomNav.jsx';
import MaskPage from './components/pages/MaskPage.jsx';
import LibraryPage from './components/pages/LibraryPage.jsx';
import SettingsPage from './components/pages/SettingsPage.jsx';
import { MaskSettingsProvider } from './context/MaskSettingsContext.jsx';
import useMaskSettingsState from './hooks/useMaskSettingsState.js';
import { DEFAULTS } from './config/defaults.js';
import { useCreatures } from './hooks/useCreatures.js';
import { useImages } from './hooks/useImages.js';
import { useRecolorWorker } from './hooks/useRecolorWorker.js';
import { useI18n, useLanguageOptions } from './i18n/index.js';
import { extractQuoted, extractSpeciesFromBlueprint, normalizeName, parseNumList, sanitizeName } from './utils/arkCmd.js';
import { ARK_PALETTE } from './utils/arkPalette.js';
import { STORAGE_KEYS, loadJSON, saveJSON } from './utils/storage.js';
import { hexToRgb, relLuminance } from './utils/contrast.js';
import { idToEntry, buildVariantKey, buildSlotsColorSignature, normalizeFavoriteIds } from './utils/slotUtils.js';
import { MaskIcon, LibraryIcon, SettingsIcon } from './components/icons/NavIcons.jsx';

const QIDX_BP = 0; // Blueprint'...'
const QIDX_BASE = 2; // "103,53,0,0,100,105,0,0"
const QIDX_INC = 3; // "0,0,0,0,0,0,0,0"
const QIDX_NAME = 4; // "T?n dino do user d?t"
const QIDX_COLORS = 8; // "76,83,83,0,83,70"
export default function App() {
  const { t, setLang, lang } = useI18n();
  const languageOptions = useLanguageOptions();
  const [activePage, setActivePage] = useState('mask');
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);

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
    exportBg,
    setExportBg,
    exportText,
    setExportText,
  } = maskSettings;
  const [slots, setSlots] = useState(Array.isArray(initialSlots) && initialSlots.length === 6 ? initialSlots : DEFAULTS.slots);
  const [favoriteColors, setFavoriteColors] = useState(initialPaletteFavorites);
  const [fillOpen, setFillOpen] = useState(false);
  const fillBtnRef = useRef(null);
  const openFill = useCallback(() => setFillOpen(true), []);
  const closeFill = useCallback(() => setFillOpen(false), []);
  const { list, current, selectByName, setCurrent } = useCreatures(preferredCreature);
  const [tempCreatureName, setTempCreatureName] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const creatureName = tempCreatureName ?? (current?.name || '?');
  const disabledSet = useMemo(() => (customMode ? new Set() : new Set(current?.noMask || [])), [customMode, current]);

  const { baseImg, maskImg, extraMasks, loadPairFromFiles, loadFromEntry } = useImages();
  const slotLinks = useMemo(() => {
    if (!Array.isArray(extraMasks) || !extraMasks.length) {
      return {};
    }
    const map = {};
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
  const { draw, busy } = useRecolorWorker({ threshold, strength, neutralStrength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayStrength, overlayColorStrength, overlayColorMixBoost, colorMixBoost, overlayTint });
  const rafRef = useRef(0);
  const pendingArgsRef = useRef(null);
  const slotsRef = useRef(slots);
  const cachedRenderRef = useRef({ url: null, width: 0, height: 0 });
  const [maskRenderNonce, setMaskRenderNonce] = useState(0);
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

  const reorderFavoriteColors = useCallback((nextOrder) => {
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

  useEffect(() => {
    if (activePage === 'mask') {
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
    }
    const cleanupCanvas = outCanvasRef.current;
    return () => {
      if (activePage !== 'mask') return;
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
  }, [activePage]);

  // V? khi d? c? ?nh
  useEffect(() => {
    if (activePage !== 'mask') return;
    if (!baseImg || !maskImg) return;
    const args = { baseImg, maskImg, extraMasks, baseCanvasRef, maskCanvasRef, outCanvasRef, slots: slotsRef.current, renderNonce: maskRenderNonce };
    pendingArgsRef.current = args;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      draw(pendingArgsRef.current);
      rafRef.current = 0;
    });
  }, [activePage, maskRenderNonce, baseImg, maskImg, extraMasks, slotsColorSignature, threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayStrength, overlayColorStrength, overlayColorMixBoost, colorMixBoost, overlayTint, draw]);

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

      // (tu? ch?n) hi?n th? toast: ??? d?n CMD, auto ch?n Basilisk v? ?p m?u?
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

  const doFillWith = useCallback(
    (entry) => {
      setSlots(Array.from({ length: 6 }, (_, i) => (disabledSet.has(i) ? null : entry ? { ...entry } : null)));
      closeFill();
    },
    [disabledSet, closeFill]
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

  const onPickSlot = useCallback((slotIndex, entryOrNull) => {
    setSlots((prev) => {
      const next = prev.slice();
      next[slotIndex] = entryOrNull ? { ...entryOrNull } : null;
      return next;
    });
  }, []);

  const randomAll = useCallback(() => {
    const pool = ARK_PALETTE.filter((p) => String(p.index) !== '255');
    setSlots(Array.from({ length: 6 }, (_, i) => (disabledSet.has(i) ? null : pool[Math.floor(Math.random() * pool.length)])));
  }, [disabledSet]);

  const navItems = useMemo(
    () => [
      { id: 'mask', label: t('nav.mask', { defaultValue: 'Mask' }), icon: <MaskIcon /> },
      { id: 'library', label: t('nav.library', { defaultValue: 'Library' }), icon: <LibraryIcon /> },
      { id: 'settings', label: t('nav.settings', { defaultValue: 'Settings' }), icon: <SettingsIcon /> },
    ],
    [t]
  );

  const handleSelectCreature = useCallback(
    (name) => {
      if (!name) return;
      setCustomMode(false);
      setTempCreatureName(null);
      selectByName(name);
    },
    [selectByName, setCustomMode, setTempCreatureName]
  );

  const canvasState = {
    baseImg,
    maskImg,
    busy,
    outCanvasRef,
    baseCanvasRef,
    maskCanvasRef,
  };

  const fillControls = {
    isOpen: fillOpen,
    anchorRef: fillBtnRef,
    open: openFill,
    close: closeFill,
    onPick: doFillWith,
  };

  const creaturePickerProps = {
    list,
    currentName: current?.name || '',
    customMode,
    onSelect: handleSelectCreature,
  };

  const toolbarActions = {
    onReset: reset,
    onDownloadImage: handleDownloadImage,
    onDownloadWithPalette: handleDownloadWithPalette,
    downloadingType,
    onCustomFiles: handleCustomFiles,
  };

  let pageContent = (
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
    />
  );

  if (activePage === 'library') {
    pageContent = <LibraryPage t={t} />;
  } else if (activePage === 'settings') {
    pageContent = (
      <SettingsPage
        t={t}
        languageOptions={languageOptions}
        lang={lang}
        onSelectLanguage={setLang}
      />
    );
  }

  return (
    <MaskSettingsProvider value={maskSettings}>
      <div className="app-shell">
        <main className="app-main">{pageContent}</main>
        <BottomNav items={navItems} activeId={activePage} onSelect={setActivePage} />
      </div>
    </MaskSettingsProvider>
  );
}







