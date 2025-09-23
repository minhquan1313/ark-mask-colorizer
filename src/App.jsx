// src/App.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import CanvasView from './components/CanvasView.jsx';
import CreaturePicker from './components/CreaturePicker.jsx';
import PaletteGrid from './components/PaletteGrid.jsx';
import Popover from './components/Popover.jsx';
import SlotControls from './components/SlotControls.jsx';
import Toolbar from './components/Toolbar.jsx';
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

const idToEntry = (id) => ARK_PALETTE.find((p) => String(p.index) === String(id)) || null;
const QIDX_BP = 0; // Blueprint'...'
const QIDX_BASE = 2; // "103,53,0,0,100,105,0,0"
const QIDX_INC = 3; // "0,0,0,0,0,0,0,0"
const QIDX_NAME = 4; // "Tên dino do user đặt"
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


export default function App() {
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);

  // ✅ KHỞI TẠO từ localStorage ngay lập tức (tránh overwrite)
  const initialSlots = useMemo(() => loadJSON(STORAGE_KEYS.slots, DEFAULTS.slots), []);
  const preferredCreature = useMemo(() => loadJSON(STORAGE_KEYS.creature, DEFAULTS.defaultCreatureName), []);

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
  const [overlayStrength, setOverlayStrength] = useState(DEFAULTS.overlayStrength);
  // Advanced OKLab tuning
  const [keepLight, setKeepLight] = useState(initialKeepLight);
  const [chromaBoost, setChromaBoost] = useState(initialChromaBoost);
  const [chromaCurve, setChromaCurve] = useState(initialChromaCurve);
  const [exportBg, setExportBg] = useState(initialBg);
  const [exportText, setExportText] = useState(initialText);
  const [fillOpen, setFillOpen] = useState(false);
  const fillBtnRef = useRef(null);

  const { list, current, selectByName, setCurrent } = useCreatures(preferredCreature);
  const [tempCreatureName, setTempCreatureName] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const creatureName = tempCreatureName ?? (current?.name || '�');
  const disabledSet = customMode ? new Set() : new Set(current?.noMask || []);

  const { baseImg, maskImg, extraMasks, loadPairFromFiles, loadFromEntry } = useImages();
  const variantKey = useMemo(() => buildVariantKey(current, slots), [current, slots]);
  const slotsColorSignature = useMemo(() => buildSlotsColorSignature(slots), [slots]);
  const { draw, busy } = useRecolorWorker({ threshold, strength, neutralStrength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayStrength, overlayTint });
  const rafRef = useRef(0);
  const pendingArgsRef = useRef(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  // Khi current thay đổi → load ảnh đúng con, KHÔNG dùng base.png mặc định
  useEffect(() => {
    if (!current) return;
    loadFromEntry(current, slotsRef.current);
  }, [current, variantKey, loadFromEntry]);

  // Khi đổi creature → set null cho các slot bị disable
  useEffect(() => {
    if (!current || customMode) return;
    const disabled = new Set(current.noMask || []);
    setSlots((prev) => prev.map((v, i) => (disabled.has(i) ? null : v)));
  }, [current, customMode]);

  // Khi b?t customMode, clear current d? l?n ch?n creature k? ti?p lu�n t?i d�ng ?nh
  useEffect(() => {
    if (customMode) {
      try {
        // setCurrent c� trong hook useCreatures

        setCurrent && setCurrent(null);
      } catch {
        /* empty */
      }
    }
  }, [customMode, setCurrent]);

  // Vẽ khi đã có ảnh
  useEffect(() => {
    if (!baseImg || !maskImg) return;
    const args = { baseImg, maskImg, extraMasks, baseCanvasRef, maskCanvasRef, outCanvasRef, slots: slotsRef.current };
    pendingArgsRef.current = args;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      draw(pendingArgsRef.current);
      rafRef.current = 0;
    });
  }, [baseImg, maskImg, extraMasks, slotsColorSignature, threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, boundaryBlend, overlayStrength, overlayTint, draw]);

  // ✅ Lưu slots mỗi khi đổi (đã an toàn vì init từ storage)
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
    saveJSON(STORAGE_KEYS.exportBg, exportBg);
  }, [exportBg]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportTx, exportText);
  }, [exportText]);

  // ✅ Lưu creature khi đổi
  useEffect(() => {
    if (current?.name) saveJSON(STORAGE_KEYS.creature, current.name);
  }, [current, customMode]);
  async function handlePasteCmd() {
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt) return;
      const quoted = extractQuoted(txt);

      // --- 1) Species từ Blueprint -> auto select creature
      const bpStr = quoted[QIDX_BP] ?? '';
      const speciesRaw = extractSpeciesFromBlueprint(bpStr); // "Basilisk"
      const speciesNorm = normalizeName(speciesRaw);
      if (speciesNorm) {
        // tìm trong creatures.json (so không phân biệt hoa thường, bỏ _-)
        const found = list.find((c) => normalizeName(c.name) === speciesNorm);
        if (found) {
          selectByName(found.name); // load đúng base/mask của loài
          saveJSON(STORAGE_KEYS.creature, found.name);
          // nếu bạn đang có tempCreatureName để hiển thị tên tự do, nên clear:
          setTempCreatureName(null);
        }
      }

      // --- 2) Tên người dùng đặt (để hiển thị phụ): không chứa ký tự đặc biệt
      const rawName = quoted[QIDX_NAME] ?? '';
      const dinoName = sanitizeName(rawName);
      if (dinoName) saveJSON(STORAGE_KEYS.cmdName, dinoName);

      // --- 3) Base/Inc stats (8 số mỗi bên) -> lưu lại cho tương lai
      const baseStats = parseNumList(quoted[QIDX_BASE], 8, 8);
      const incStats = parseNumList(quoted[QIDX_INC], 8, 8);
      if (baseStats) saveJSON(STORAGE_KEYS.cmdBaseStats, baseStats);
      if (incStats) saveJSON(STORAGE_KEYS.cmdIncStats, incStats);

      // --- 4) Màu 6 slot -> apply (bỏ qua slot bị noMask)
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

      // (tuỳ chọn) hiển thị toast: “Đã dán CMD, auto chọn Basilisk và áp màu”
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
      ctx.fillText(`Slot ${i}`, x + sw / 2, y + sh + labelY - 4);
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
    // slots sẽ được lưu lại qua effect ở trên
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
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8, color: 'var(--muted)' }}>{creatureName}</div>

        {/* ⬇️ truyền exportBg/exportText xuống để CanvasView copy đúng */}
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
          currentName={customMode ? 'Custom' : current?.name}
          customMode={customMode}
          onPick={(name) => {
            if (!name) return;
            setCustomMode(false);
            setTempCreatureName(null);
            selectByName(name);
          }}
        />
        <hr />

        <div className="title">Slots (0 - 5)</div>
        <SlotControls
          slots={slots}
          disabledSet={disabledSet} // ⬅️ truyền xuống
          onPickSlot={onPickSlot}
          onRandomAll={randomAll}
          onResetSlots={resetSlotsOnly}
          onPasteCmd={handlePasteCmd}
          extraActions={
            <>
              <button
                ref={fillBtnRef}
                className="btn"
                onClick={() => setFillOpen(true)}>
                Fill
              </button>
              {fillOpen && (
                <Popover
                  anchorRef={fillBtnRef}
                  onClose={() => setFillOpen(false)}>
                  <div style={{ padding: 10 }}>
                    <PaletteGrid
                      big
                      showIndex
                      onPick={(p) => doFillWith(p)}
                    />
                  </div>
                </Popover>
              )}
            </>
          }
        />

        <hr />
        <div className="subtle small">
          Luu �: Index <b>255</b> l� undefined (b? qua slot). C?p t�n: <code>name.png</code> & <code>name_m.png</code>.
        </div>

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
