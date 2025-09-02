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
import { useRecolor } from './hooks/useRecolor.js';
import { extractQuoted, extractSpeciesFromBlueprint, normalizeName, parseNumList, sanitizeName } from './utils/arkCmd.js';
import { ARK_PALETTE } from './utils/arkPalette.js';
import { STORAGE_KEYS, loadJSON, saveJSON } from './utils/storage.js';

const initialBg = loadJSON(STORAGE_KEYS.exportBg, DEFAULTS.exportBg);
const initialText = loadJSON(STORAGE_KEYS.exportTx, DEFAULTS.exportText);

const idToEntry = (id) => ARK_PALETTE.find((p) => String(p.index) === String(id)) || null;
const QIDX_BP = 0; // Blueprint'...'
const QIDX_BASE = 2; // "103,53,0,0,100,105,0,0"
const QIDX_INC = 3; // "0,0,0,0,0,0,0,0"
const QIDX_NAME = 4; // "TÃªn dino do user Ä‘áº·t"
const QIDX_COLORS = 8; // "76,83,83,0,83,70"

export default function App() {
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);

  // âœ… KHá»žI Táº O tá»« localStorage ngay láº­p tá»©c (trÃ¡nh overwrite)
  const initialSlots = useMemo(() => loadJSON(STORAGE_KEYS.slots, DEFAULTS.slots), []);
  const preferredCreature = useMemo(() => loadJSON(STORAGE_KEYS.creature, DEFAULTS.defaultCreatureName), []);

  const [slots, setSlots] = useState(Array.isArray(initialSlots) && initialSlots.length === 6 ? initialSlots : DEFAULTS.slots);
  const [threshold, setThreshold] = useState(DEFAULTS.threshold);
  const [strength, setStrength] = useState(DEFAULTS.strength);
  const [feather, setFeather] = useState(DEFAULTS.feather);
  const [gamma, setGamma] = useState(DEFAULTS.gamma);
  const [speckleClean, setSpeckleClean] = useState(DEFAULTS.speckleClean);
  const [edgeSmooth, setEdgeSmooth] = useState(DEFAULTS.edgeSmooth);
  // Advanced OKLab tuning
  const [keepLight, setKeepLight] = useState(DEFAULTS.keepLight);
  const [chromaBoost, setChromaBoost] = useState(DEFAULTS.chromaBoost);
  const [chromaCurve, setChromaCurve] = useState(DEFAULTS.chromaCurve);
  const [exportBg, setExportBg] = useState(initialBg);
  const [exportText, setExportText] = useState(initialText);
  const [fillOpen, setFillOpen] = useState(false);
  const fillBtnRef = useRef(null);

  const { list, current, selectByName, setCurrent } = useCreatures(preferredCreature);
  const [tempCreatureName, setTempCreatureName] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const creatureName = tempCreatureName ?? (current?.name || 'â€”');
  const disabledSet = customMode ? new Set() : new Set(current?.noMask || []);

  const { baseImg, maskImg, loadPairFromFiles, loadFromEntry } = useImages();
  const { draw } = useRecolor({ threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth });
  const rafRef = useRef(0);
  const pendingArgsRef = useRef(null);

  // Khi current thay Ä‘á»•i â†’ load áº£nh Ä‘Ãºng con, KHÃ”NG dÃ¹ng base.png máº·c Ä‘á»‹nh
  useEffect(() => {
    if (current) loadFromEntry(current);
  }, [current, loadFromEntry]);

  // Khi Ä‘á»•i creature â†’ set null cho cÃ¡c slot bá»‹ disable
  useEffect(() => {
    if (!current || customMode) return;
    const disabled = new Set(current.noMask || []);
    setSlots((prev) => prev.map((v, i) => (disabled.has(i) ? null : v)));
  }, [current, customMode]);

  // Khi bật customMode, clear current để lần chọn creature kế tiếp luôn tải đúng ảnh
  useEffect(() => {
    if (customMode) {
      try {
        // setCurrent có trong hook useCreatures
        // eslint-disable-next-line no-unused-expressions
        setCurrent && setCurrent(null);
      } catch {}
    }
  }, [customMode, setCurrent]);

  // Váº½ khi Ä‘Ã£ cÃ³ áº£nh
  useEffect(() => {
    if (!baseImg || !maskImg) return;
    const args = { baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots };
    pendingArgsRef.current = args;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      draw(pendingArgsRef.current);
      rafRef.current = 0;
    });
  }, [baseImg, maskImg, slots, threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, speckleClean, edgeSmooth, draw]);

  // âœ… LÆ°u slots má»—i khi Ä‘á»•i (Ä‘Ã£ an toÃ n vÃ¬ init tá»« storage)
  useEffect(() => {
    saveJSON(STORAGE_KEYS.slots, slots);
  }, [slots]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportBg, exportBg);
  }, [exportBg]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportTx, exportText);
  }, [exportText]);

  // âœ… LÆ°u creature khi Ä‘á»•i
  useEffect(() => {
    if (current?.name) saveJSON(STORAGE_KEYS.creature, current.name);
  }, [current, customMode]);
  async function handlePasteCmd() {
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt) return;
      const quoted = extractQuoted(txt);

      // --- 1) Species tá»« Blueprint -> auto select creature
      const bpStr = quoted[QIDX_BP] ?? '';
      const speciesRaw = extractSpeciesFromBlueprint(bpStr); // "Basilisk"
      const speciesNorm = normalizeName(speciesRaw);
      if (speciesNorm) {
        // tÃ¬m trong creatures.json (so khÃ´ng phÃ¢n biá»‡t hoa thÆ°á»ng, bá» _-)
        const found = list.find((c) => normalizeName(c.name) === speciesNorm);
        if (found) {
          selectByName(found.name); // load Ä‘Ãºng base/mask cá»§a loÃ i
          saveJSON(STORAGE_KEYS.creature, found.name);
          // náº¿u báº¡n Ä‘ang cÃ³ tempCreatureName Ä‘á»ƒ hiá»ƒn thá»‹ tÃªn tá»± do, nÃªn clear:
          setTempCreatureName(null);
        }
      }

      // --- 2) TÃªn ngÆ°á»i dÃ¹ng Ä‘áº·t (Ä‘á»ƒ hiá»ƒn thá»‹ phá»¥): khÃ´ng chá»©a kÃ½ tá»± Ä‘áº·c biá»‡t
      const rawName = quoted[QIDX_NAME] ?? '';
      const dinoName = sanitizeName(rawName);
      if (dinoName) saveJSON(STORAGE_KEYS.cmdName, dinoName);

      // --- 3) Base/Inc stats (8 sá»‘ má»—i bÃªn) -> lÆ°u láº¡i cho tÆ°Æ¡ng lai
      const baseStats = parseNumList(quoted[QIDX_BASE], 8, 8);
      const incStats = parseNumList(quoted[QIDX_INC], 8, 8);
      if (baseStats) saveJSON(STORAGE_KEYS.cmdBaseStats, baseStats);
      if (incStats) saveJSON(STORAGE_KEYS.cmdIncStats, incStats);

      // --- 4) MÃ u 6 slot -> apply (bá» qua slot bá»‹ noMask)
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

      // (tuá»³ chá»n) hiá»ƒn thá»‹ toast: â€œÄÃ£ dÃ¡n CMD, auto chá»n Basilisk vÃ  Ã¡p mÃ uâ€
    } catch (e) {
      console.error('Paste CMD failed', e);
    }
  }

  function handleDownload() {
    const src = outCanvasRef.current;
    if (!src) return;
    const W = src.width,
      H = src.height;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d');
    ctx.fillStyle = exportBg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(src, 0, 0, W, H);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'recolor.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  }

  const doFillWith = (entry) => {
    setSlots(Array.from({ length: 6 }, (_, i) => (disabledSet.has(i) ? null : entry ? { ...entry } : null)));
    setFillOpen(false);
  };

  const reset = () => {
    setSlots([...DEFAULTS.slots]);
    setThreshold(DEFAULTS.threshold);
    setStrength(DEFAULTS.strength);
    setFeather(DEFAULTS.feather);
    setGamma(DEFAULTS.gamma);
    // slots sáº½ Ä‘Æ°á»£c lÆ°u láº¡i qua effect á»Ÿ trÃªn
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
    try { setCurrent && setCurrent(null); } catch {}
    saveJSON(STORAGE_KEYS.creature, baseName);
  }
  const resetSlotsOnly = () => {
    setSlots(Array.from({ length: 6 }, (_, i) => null));
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

        {/* â¬‡ï¸ truyá»n exportBg/exportText xuá»‘ng Ä‘á»ƒ CanvasView copy Ä‘Ãºng */}
        <CanvasView
          outCanvasRef={outCanvasRef}
          loading={!baseImg || !maskImg}
          slots={slots}
          exportBg={exportBg}
          exportText={exportText}
        />

        <Toolbar
          threshold={threshold}
          setThreshold={setThreshold}
          strength={strength}
          setStrength={setStrength}
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
          exportBg={exportBg}
          setExportBg={setExportBg}
          exportText={exportText}
          setExportText={setExportText}
          onReset={reset}
          onDownload={handleDownload}
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
          disabledSet={disabledSet} // â¬…ï¸ truyá»n xuá»‘ng
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
          LÆ°u Ã½: Index <b>255</b> lÃ  undefined (bá» qua slot). Cáº·p tÃªn: <code>name.png</code> & <code>name_m.png</code>.
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







