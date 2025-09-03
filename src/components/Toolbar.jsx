// src/components/Toolbar.jsx
import { useRef } from 'react';

export default function Toolbar({
  threshold,
  setThreshold,
  strength,
  setStrength,
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
      <div className="toolbar-grid">
        {/* LEFT: sliders + colors */}
        <div className="toolbar">
          <div className="row">
            <label className="small subtle">Threshold</label>
            <input
              className="form-range"
              type="range"
              min="10"
              max="150"
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
            />
            <span className="small value">{threshold}</span>
          </div>
          <div className="row">
            <label className="small subtle">Strength</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={strength}
              onChange={(e) => setStrength(+e.target.value)}
            />
            <span className="small value">{strength.toFixed(2)}</span>
          </div>
          <div className="row">
            <label className="small subtle">Feather</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={feather}
              onChange={(e) => setFeather(+e.target.value)}
            />
            <span className="small value">{feather.toFixed(1)}px</span>
          </div>
          <div className="row">
            <label className="small subtle">Gamma</label>
            <input
              className="form-range"
              type="range"
              min="1.0"
              max="3.5"
              step="0.05"
              value={gamma}
              onChange={(e) => setGamma(+e.target.value)}
            />
            <span className="small value">{gamma.toFixed(2)}</span>
          </div>

          {/* Advanced OKLab tuning */}
          <div className="row">
            <label className="small subtle">Keep Light</label>
            <input
              className="form-range"
              type="range"
              min="0.90"
              max="1.00"
              step="0.005"
              value={keepLight}
              onChange={(e) => setKeepLight(+e.target.value)}
            />
            <span className="small value">{keepLight.toFixed(3)}</span>
          </div>
          <div className="row">
            <label className="small subtle">Chroma Boost</label>
            <input
              className="form-range"
              type="range"
              min="1.00"
              max="1.50"
              step="0.01"
              value={chromaBoost}
              onChange={(e) => setChromaBoost(+e.target.value)}
            />
            <span className="small value">{chromaBoost.toFixed(2)}</span>
          </div>
          <div className="row">
            <label className="small subtle">Chroma Curve</label>
            <input
              className="form-range"
              type="range"
              min="0.80"
              max="1.20"
              step="0.01"
              value={chromaCurve}
              onChange={(e) => setChromaCurve(+e.target.value)}
            />
            <span className="small value">{chromaCurve.toFixed(2)}</span>
          </div>
          <div className="row">
            <label className="small subtle">Speckle Clean</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={speckleClean}
              onChange={(e) => setSpeckleClean(+e.target.value)}
            />
            <span className="small value">{speckleClean.toFixed(2)}</span>
          </div>
          <div className="row">
            <label className="small subtle">Edge Smooth</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={edgeSmooth}
              onChange={(e) => setEdgeSmooth(+e.target.value)}
            />
            <span className="small value">{edgeSmooth.toFixed(2)}</span>
          </div>

          <div className="row-colors">
            <label className="small subtle">Export</label>
            <div className="swatch">
              <span className="small subtle">BG</span>
              <input
                type="color"
                value={exportBg}
                onChange={(e) => setExportBg(e.target.value)}
              />
              <button
                className="btn"
                title="Nền trong suốt"
                onClick={() => setExportBg('transparent')}
                style={{
                  padding: '4px 8px',
                  borderWidth: isTransparent ? 2 : 1,
                  borderColor: isTransparent ? '#5cc8ff' : undefined,
                  boxShadow: isTransparent ? '0 0 0 2px rgba(92,200,255,0.25) inset' : undefined,
                }}>
                Trong suốt
              </button>
            </div>
            <div className="swatch">
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
        <div className="actions">
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
            onClick={onReset}>
            Reset
          </button>

          <div
            className="hstack"
            style={{ gap: 6, width: '100%' }}>
            <button
              className="btn"
              onClick={onDownloadImage}
              disabled={downloadingType === 'image' || downloadingType === 'palette'}
              title="Tải ảnh"
              style={{ flex: 1, display: 'inline-flex', justifyContent: 'center' }}>
              {downloadingType === 'image' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    aria-busy
                    style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}
                  />
                  Ảnh
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconDownload /> Ảnh
                </span>
              )}
            </button>
            <button
              className="btn"
              onClick={onDownloadWithPalette}
              disabled={downloadingType === 'image' || downloadingType === 'palette'}
              title="Tải ảnh kèm palette"
              style={{ flex: 1, display: 'inline-flex', justifyContent: 'center' }}>
              {downloadingType === 'palette' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    aria-busy
                    style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}
                  />
                  Ảnh + màu
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconDownload /> Ảnh + màu
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
