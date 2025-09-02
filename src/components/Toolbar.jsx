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
  onDownload,
  onCustomFiles,
}) {
  const fileRef = useRef(null);

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

          {/* Export colors: 1 hàng, input màu hiển thị đúng */}
          <div className="row-colors">
            <label className="small subtle">Export</label>
            <div className="swatch">
              <span className="small subtle">BG</span>
              <input
                type="color"
                value={exportBg}
                onChange={(e) => setExportBg(e.target.value)}
              />
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
              // allow selecting the same file again to re-trigger onChange
              e.target.value = '';
            }}
          />
          <button
            className="btn"
            onClick={onReset}>
            Reset
          </button>
          <button
            className="btn"
            onClick={onDownload}>
            Tải ảnh
          </button>
        </div>
      </div>
    </>
  );
}
