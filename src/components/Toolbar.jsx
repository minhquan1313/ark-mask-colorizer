// src/components/Toolbar.jsx
import { useEffect, useRef, useState } from 'react';
import { DEFAULTS } from '../config/defaults.js';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage.js';

export default function Toolbar({
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
  onReset,
  onDownloadImage,
  onDownloadWithPalette,
  downloadingType = null,
  onCustomFiles,
}) {
  const fileRef = useRef(null);
  const isTransparent = exportBg === 'transparent';
  const lastSolidBgRef = useRef(isTransparent ? DEFAULTS.exportBg : exportBg);
  const bgInputValue = isTransparent ? lastSolidBgRef.current || DEFAULTS.exportBg : exportBg;
  const [, setOverlayBlendMode] = useState(() => {
    const v = loadJSON(STORAGE_KEYS.overlayBlendMode, DEFAULTS.overlayBlendMode);
    return v === 'pastel' ? 'add' : v;
  });

  useEffect(() => {
    const onChanged = (e) => {
      if (e?.detail?.mode === 'add') setOverlayBlendMode('add');
    };
    window.addEventListener('overlay-blend-mode-changed', onChanged);
    return () => window.removeEventListener('overlay-blend-mode-changed', onChanged);
  }, []);
  useEffect(() => {
    if (!isTransparent && typeof exportBg === 'string' && exportBg.startsWith('#') && exportBg.length === 7) {
      lastSolidBgRef.current = exportBg;
    }
  }, [exportBg, isTransparent]);

  const handleExportBgChange = (value) => {
    setExportBg(value);
  };

  const handleTransparentBg = () => {
    if (!isTransparent && typeof exportBg === 'string' && exportBg.startsWith('#') && exportBg.length === 7) {
      lastSolidBgRef.current = exportBg;
    }
    setExportBg('transparent');
  };

  const toggleOverlayBlend = () => {
    setOverlayBlendMode('add');
    try {
      saveJSON(STORAGE_KEYS.overlayBlendMode, 'add');
    } catch {
      /* empty */
    }
    try {
      window.dispatchEvent(new CustomEvent('overlay-blend-mode-changed', { detail: { mode: 'add' } }));
    } catch {
      /* empty */
    }
  };

  // Ensure keyframes exist for spinner if not already present
  if (typeof document !== 'undefined' && !document.getElementById('tb-spin-style')) {
    const style = document.createElement('style');
    style.id = 'tb-spin-style';
    style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  const IconDownload = ({ size = 14 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line
        x1="12"
        y1="15"
        x2="12"
        y2="3"
      />
    </svg>
  );

  return (
    <>
      <hr />
      <div
        className="toolbar-grid"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {/* LEFT: sliders + colors */}
        <div
          className="toolbar"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', flex: '1 1 100%' }}>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Threshold</label>
            <input
              className="form-range"
              type="range"
              min="10"
              max="150"
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{threshold}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Strength</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={strength}
              onChange={(e) => setStrength(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{strength.toFixed(2)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Neutral Strength</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={neutralStrength}
              onChange={(e) => setNeutralStrength(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{neutralStrength.toFixed(2)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Feather</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={feather}
              onChange={(e) => setFeather(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{feather.toFixed(1)}px</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Gamma</label>
            <input
              className="form-range"
              type="range"
              min="1.0"
              max="3.5"
              step="0.05"
              value={gamma}
              onChange={(e) => setGamma(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{gamma.toFixed(2)}</span>
          </div>

          {/* Advanced OKLab tuning */}
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Keep Light</label>
            <input
              className="form-range"
              type="range"
              min="0.90"
              max="1.00"
              step="0.005"
              value={keepLight}
              onChange={(e) => setKeepLight(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{keepLight.toFixed(3)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Color Mix Boost</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={colorMixBoost}
              onChange={(e) => setColorMixBoost(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{colorMixBoost.toFixed(2)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Chroma Boost</label>
            <input
              className="form-range"
              type="range"
              min="1.00"
              max="1.50"
              step="0.01"
              value={chromaBoost}
              onChange={(e) => setChromaBoost(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{chromaBoost.toFixed(2)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Chroma Curve</label>
            <input
              className="form-range"
              type="range"
              min="0.80"
              max="1.20"
              step="0.01"
              value={chromaCurve}
              onChange={(e) => setChromaCurve(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{chromaCurve.toFixed(2)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Speckle Clean</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={speckleClean}
              onChange={(e) => setSpeckleClean(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{speckleClean.toFixed(2)}</span>
          </div>
          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Edge Smooth</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={edgeSmooth}
              onChange={(e) => setEdgeSmooth(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{edgeSmooth.toFixed(2)}</span>
          </div>

          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Boundary Blend</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="2"
              step="0.02"
              value={boundaryBlend}
              onChange={(e) => setBoundaryBlend(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{boundaryBlend.toFixed(2)}</span>
          </div>

          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Overlay Strength</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="3"
              step="0.05"
              value={overlayStrength}
              onChange={(e) => setOverlayStrength(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{overlayStrength.toFixed(2)}</span>
          </div>

          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Overlay Color Strength</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayColorStrength}
              onChange={(e) => setOverlayColorStrength(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{overlayColorStrength.toFixed(2)}</span>
          </div>

          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Overlay Color Mix Boost</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayColorMixBoost}
              onChange={(e) => setOverlayColorMixBoost(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{overlayColorMixBoost.toFixed(2)}</span>
          </div>

          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Overlay Tint (white+color)</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={overlayTint}
              onChange={(e) => setOverlayTint(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span className="small value">{overlayTint.toFixed(2)}</span>
          </div>

          <div
            className="row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px' }}>
            <label className="small subtle">Overlay Blend</label>
            <button
              className="btn"
              title={'Overlay blend: Add'}
              onClick={toggleOverlayBlend}
              style={{ flex: '0 0 auto' }}>
              {'Add'}
            </button>
          </div>

          <div
            className="row-colors"
            style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 320px' }}>
            <label className="small subtle">Export</label>
            <div
              className="swatch"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="small subtle">BG</span>
              <input
                type="color"
                value={bgInputValue}
                onChange={(e) => handleExportBgChange(e.target.value)}
              />
              <button
                className="btn"
                title="N?n trong su?t"
                onClick={handleTransparentBg}
                style={{
                  padding: '4px 8px',
                  borderWidth: isTransparent ? 2 : 1,
                  borderColor: isTransparent ? '#5cc8ff' : undefined,
                  boxShadow: isTransparent ? '0 0 0 2px rgba(92,200,255,0.25) inset' : undefined,
                }}>
                Trong su?t
              </button>
            </div>
            <div
              className="swatch"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="small subtle">Text</span>
              <input
                type="color"
                value={exportText}
                onChange={(e) => setExportText(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: actions */}
        <div
          className="actions"
          style={{ display: 'flex', flex: '1 1 100%', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}>
            Custom mask
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length) onCustomFiles(files);
              e.target.value = '';
            }}
          />
          <button
            className="btn"
            onClick={() => {
              // Reset new overlay-related values here for reliability
              try {
                typeof setBoundaryBlend === 'function' && setBoundaryBlend(DEFAULTS.boundaryBlend);
                typeof setOverlayStrength === 'function' && setOverlayStrength(DEFAULTS.overlayStrength);
                typeof setOverlayColorStrength === 'function' && setOverlayColorStrength(DEFAULTS.overlayColorStrength);
                typeof setOverlayColorMixBoost === 'function' && setOverlayColorMixBoost(DEFAULTS.overlayColorMixBoost);
                typeof setColorMixBoost === 'function' && setColorMixBoost(DEFAULTS.colorMixBoost);
                typeof setOverlayTint === 'function' && setOverlayTint(DEFAULTS.overlayTint);
              } catch {
                /* empty */
              }
              onReset && onReset();
            }}>
            Reset
          </button>

          <div
            className="hstack"
            style={{ display: 'inline-flex', gap: 6 }}>
            <button
              className="btn"
              onClick={onDownloadImage}
              disabled={downloadingType === 'image' || downloadingType === 'palette'}
              title="T?i ?nh"
              style={{ flex: 1, display: 'inline-flex', justifyContent: 'center' }}>
              {downloadingType === 'image' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    aria-busy
                    style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}
                  />
                  ?nh
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconDownload /> ?nh
                </span>
              )}
            </button>
            <button
              className="btn"
              onClick={onDownloadWithPalette}
              disabled={downloadingType === 'image' || downloadingType === 'palette'}
              title="T?i ?nh k�m palette"
              style={{ flex: 1, display: 'inline-flex', justifyContent: 'center', whiteSpace: 'nowrap' }}>
              {downloadingType === 'palette' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    aria-busy
                    style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}
                  />
                  ?nh + m�u
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconDownload /> ?nh + m�u
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


