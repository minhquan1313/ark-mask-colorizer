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
const QIDX_NAME = 4; // "Tên dino do user đặt"
const QIDX_COLORS = 8; // "76,83,83,0,83,70"

export default function App() {
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);

  // ✅ KHỞI TẠO từ localStorage ngay lập tức (tránh overwrite)
  const initialSlots = useMemo(() => loadJSON(STORAGE_KEYS.slots, DEFAULTS.slots), []);
  const preferredCreature = useMemo(() => loadJSON(STORAGE_KEYS.creature, DEFAULTS.defaultCreatureName), []);

  const [slots, setSlots] = useState(Array.isArray(initialSlots) && initialSlots.length === 6 ? initialSlots : DEFAULTS.slots);
  const [threshold, setThreshold] = useState(DEFAULTS.threshold);
  const [strength, setStrength] = useState(DEFAULTS.strength);
  const [feather, setFeather] = useState(DEFAULTS.feather);
  const [gamma, setGamma] = useState(DEFAULTS.gamma);
  // Advanced OKLab tuning
  const [keepLight, setKeepLight] = useState(DEFAULTS.keepLight);
  const [chromaBoost, setChromaBoost] = useState(DEFAULTS.chromaBoost);
  const [chromaCurve, setChromaCurve] = useState(DEFAULTS.chromaCurve);
  const [exportBg, setExportBg] = useState(initialBg);
  const [exportText, setExportText] = useState(initialText);
  const [fillOpen, setFillOpen] = useState(false);
  const fillBtnRef = useRef(null);

  const { list, current, selectByName } = useCreatures(preferredCreature);
  const [tempCreatureName, setTempCreatureName] = useState(null);
  const creatureName = tempCreatureName ?? (current?.name || '—');
  const disabledSet = new Set(current?.noMask || []);

  const { baseImg, maskImg, loadPairFromFiles, loadFromEntry } = useImages();
  const { draw } = useRecolor({ threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve });
  const rafRef = useRef(0);
  const pendingArgsRef = useRef(null);

  // Khi current thay đổi → load ảnh đúng con, KHÔNG dùng base.png mặc định
  useEffect(() => {
    if (current) loadFromEntry(current);
  }, [current, loadFromEntry]);

  // Khi đổi creature → set null cho các slot bị disable
  useEffect(() => {
    if (!current) return;
    const disabled = new Set(current.noMask || []);
    setSlots((prev) => prev.map((v, i) => (disabled.has(i) ? null : v)));
  }, [current]);

  // Vẽ khi đã có ảnh
  useEffect(() => {
    if (!baseImg || !maskImg) return;
    const args = { baseImg, maskImg, baseCanvasRef, maskCanvasRef, outCanvasRef, slots };
    pendingArgsRef.current = args;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      draw(pendingArgsRef.current);
      rafRef.current = 0;
    });
  }, [baseImg, maskImg, slots, threshold, strength, feather, gamma, keepLight, chromaBoost, chromaCurve, draw]);

  // ✅ Lưu slots mỗi khi đổi (đã an toàn vì init từ storage)
  useEffect(() => {
    saveJSON(STORAGE_KEYS.slots, slots);
  }, [slots]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportBg, exportBg);
  }, [exportBg]);
  useEffect(() => {
    saveJSON(STORAGE_KEYS.exportTx, exportText);
  }, [exportText]);

  // ✅ Lưu creature khi đổi
  useEffect(() => {
    if (current?.name) saveJSON(STORAGE_KEYS.creature, current.name);
  }, [current]);
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
    const baseName = await loadPairFromFiles(fileList); // có thể undefined nếu fail
    if (!baseName) return;

    // tìm trong creatures.json xem có trùng name không
    const found = list.find((c) => {
      const noExt = (c.base || '').replace(/\.png$/i, '');
      return noExt === baseName;
    });

    if (found) {
      // dùng entry chuẩn (để có đúng danh sách masks…)
      selectByName(found.name);
      saveJSON(STORAGE_KEYS.creature, found.name);
    } else {
      // không có trong json → set tên “tự do” theo baseName
      // hiển thị tên ở UI dùng current?.name, nên ta “fake” current nhẹ:
      setTempCreatureName(baseName); // ➜ thêm state nhỏ để hiển thị tên tạm
      saveJSON(STORAGE_KEYS.creature, baseName);
    }
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

        {/* ⬇️ truyền exportBg/exportText xuống để CanvasView copy đúng */}
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
          list={list}
          currentName={creatureName}
          onPick={selectByName}
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
          Lưu ý: Index <b>255</b> là undefined (bỏ qua slot). Cặp tên: <code>name.png</code> & <code>name_m.png</code>.
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
