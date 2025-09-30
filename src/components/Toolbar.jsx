// src/components/Toolbar.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULTS } from '../config/defaults.js';
import { useI18n } from '../i18n/index.js';
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
  const { t } = useI18n();
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

  if (typeof document !== 'undefined' && !document.getElementById('tb-spin-style')) {
    const style = document.createElement('style');
    style.id = 'tb-spin-style';
    style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  const isProduction = Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD);
  const [devSlidersVisible, setDevSlidersVisible] = useState(() => {
    const stored = loadJSON(STORAGE_KEYS.hideSliders, false);
    return stored === true ? false : true;
  });
  useEffect(() => {
    saveJSON(STORAGE_KEYS.hideSliders, !devSlidersVisible);
  }, [devSlidersVisible]);
  const showSliderControls = !isProduction && devSlidersVisible;

  const sliderConfigs = useMemo(
    () => [
      {
        key: 'threshold',
        label: t('toolbar.threshold'),
        value: threshold,
        min: 10,
        max: 150,
        step: 1,
        format: (v) => Math.round(v),
        setter: setThreshold,
      },
      {
        key: 'strength',
        label: t('toolbar.strength'),
        value: strength,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setStrength,
      },
      {
        key: 'neutral-strength',
        label: t('toolbar.neutralStrength'),
        value: neutralStrength,
        min: 0,
        max: 5,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setNeutralStrength,
      },
      {
        key: 'feather',
        label: t('toolbar.feather'),
        value: feather,
        min: 0,
        max: 4,
        step: 0.1,
        format: (v) => `${v.toFixed(1)}px`,
        setter: setFeather,
      },
      {
        key: 'gamma',
        label: t('toolbar.gamma'),
        value: gamma,
        min: 1.0,
        max: 3.5,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setGamma,
      },
      {
        key: 'keep-light',
        label: t('toolbar.keepLight'),
        value: keepLight,
        min: 0.9,
        max: 1.0,
        step: 0.005,
        format: (v) => v.toFixed(3),
        setter: setKeepLight,
      },
      {
        key: 'color-mix',
        label: t('toolbar.colorMixBoost'),
        value: colorMixBoost,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setColorMixBoost,
      },
      {
        key: 'chroma-boost',
        label: t('toolbar.chromaBoost'),
        value: chromaBoost,
        min: 1.0,
        max: 1.5,
        step: 0.01,
        format: (v) => v.toFixed(2),
        setter: setChromaBoost,
      },
      {
        key: 'chroma-curve',
        label: t('toolbar.chromaCurve'),
        value: chromaCurve,
        min: 0.8,
        max: 1.2,
        step: 0.01,
        format: (v) => v.toFixed(2),
        setter: setChromaCurve,
      },
      {
        key: 'speckle',
        label: t('toolbar.speckleClean'),
        value: speckleClean,
        min: 0,
        max: 2,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setSpeckleClean,
      },
      {
        key: 'edge',
        label: t('toolbar.edgeSmooth'),
        value: edgeSmooth,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setEdgeSmooth,
      },
      {
        key: 'boundary',
        label: t('toolbar.boundaryBlend'),
        value: boundaryBlend,
        min: 0,
        max: 2,
        step: 0.02,
        format: (v) => v.toFixed(2),
        setter: setBoundaryBlend,
      },
      {
        key: 'overlay-strength',
        label: t('toolbar.overlayStrength'),
        value: overlayStrength,
        min: 0,
        max: 3,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayStrength,
      },
      {
        key: 'overlay-color-strength',
        label: t('toolbar.overlayColorStrength'),
        value: overlayColorStrength,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayColorStrength,
      },
      {
        key: 'overlay-color-mix',
        label: t('toolbar.overlayColorMixBoost'),
        value: overlayColorMixBoost,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayColorMixBoost,
      },
      {
        key: 'overlay-tint',
        label: t('toolbar.overlayTint'),
        value: overlayTint,
        min: 0,
        max: 1,
        step: 0.01,
        format: (v) => v.toFixed(2),
        setter: setOverlayTint,
      },
    ],
    [t, threshold, setThreshold, strength, setStrength, neutralStrength, setNeutralStrength, feather, setFeather, gamma, setGamma, keepLight, setKeepLight, colorMixBoost, setColorMixBoost, chromaBoost, setChromaBoost, chromaCurve, setChromaCurve, speckleClean, setSpeckleClean, edgeSmooth, setEdgeSmooth, boundaryBlend, setBoundaryBlend, overlayStrength, setOverlayStrength, overlayColorStrength, setOverlayColorStrength, overlayColorMixBoost, setOverlayColorMixBoost, overlayTint, setOverlayTint]
  );

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

  const renderSlider = (config) => {
    const id = `slider-${config.key}`;
    const handleChange = (event) => {
      const setter = config.setter;
      if (typeof setter === 'function') {
        setter(Number(event.target.value));
      }
    };
    const formatted = config.format ? config.format(config.value) : config.value;
    return (
      <div
        key={config.key}
        className="mask-toolbar__slider">
        <label
          className="mask-toolbar__slider-label"
          htmlFor={id}>
          {config.label}
        </label>
        <div className="mask-toolbar__slider-control">
          <input
            id={id}
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={config.value}
            onChange={handleChange}
          />
          <span className="mask-toolbar__slider-value">{formatted}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mask-toolbar">
      <div className="mask-toolbar__sliders">
        {!isProduction && (
          <button
            type="button"
            className={`btn mask-toolbar__toggle${devSlidersVisible ? ' is-active' : ''}`}
            onClick={() => setDevSlidersVisible((prev) => !prev)}
            aria-pressed={devSlidersVisible}>
            {devSlidersVisible
              ? t('toolbar.hideSliders', { defaultValue: 'Hide sliders' })
              : t('toolbar.showSliders', { defaultValue: 'Show sliders' })}
          </button>
        )}
        {showSliderControls && sliderConfigs.map(renderSlider)}
        {showSliderControls && (
          <div className="mask-toolbar__slider mask-toolbar__slider--button">
            <span className="mask-toolbar__slider-label">{t('toolbar.overlayBlend')}</span>
            <button
              className="btn"
              onClick={toggleOverlayBlend}
              title={t('toolbar.overlayBlendTitle')}>
              {t('toolbar.overlayBlendButton')}
            </button>
          </div>
        )}

        <div className="mask-toolbar__colors">
          <span className="mask-toolbar__slider-label">{t('toolbar.export')}</span>
          <div className="mask-toolbar__color-row">
            <div className="mask-toolbar__color-field">
              <span className="small subtle">{t('toolbar.bg')}</span>
              <div className="mask-toolbar__color-picker">
                <input
                  type="color"
                  value={bgInputValue}
                  onChange={(e) => handleExportBgChange(e.target.value)}
                />
                <button
                  type="button"
                  className={`mask-toolbar__color-clear${isTransparent ? ' is-active' : ''}`}
                  aria-label={t('toolbar.transparentTitle')}
                  onClick={handleTransparentBg}>
                  <span aria-hidden>X</span>
                </button>
              </div>
            </div>
            <div className="mask-toolbar__color-field">
              <span className="small subtle">{t('toolbar.text')}</span>
              <div className="mask-toolbar__color-picker mask-toolbar__color-picker--plain">
                <input
                  type="color"
                  value={exportText}
                  onChange={(e) => setExportText(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mask-toolbar__actions">
        <button
          className="btn"
          onClick={() => fileRef.current?.click()}>
          {t('toolbar.customMask')}
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
            try {
              typeof setBoundaryBlend === 'function' && setBoundaryBlend(DEFAULTS.boundaryBlend);
              typeof setOverlayStrength === 'function' && setOverlayStrength(DEFAULTS.overlayStrength);
              typeof setOverlayColorStrength === 'function' && setOverlayColorStrength(DEFAULTS.overlayColorStrength);
              typeof setOverlayColorMixBoost === 'function' && setOverlayColorMixBoost(DEFAULTS.overlayColorMixBoost);
              typeof setColorMixBoost === 'function' && setColorMixBoost(DEFAULTS.colorMixBoost);
              typeof setOverlayTint === 'function' && setOverlayTint(DEFAULTS.overlayTint);
            } catch {
              /* noop */
            }
            if (typeof onReset === 'function') onReset();
          }}>
          {t('toolbar.reset')}
        </button>
        <button
          className="btn"
          onClick={onDownloadImage}
          disabled={downloadingType === 'image' || downloadingType === 'palette'}
          title={t('toolbar.downloadImageTitle')}>
          {downloadingType === 'image' ? (
            <span className="mask-toolbar__spinner-label">
              <span
                aria-busy
                className="mask-toolbar__spinner"
              />
              {t('toolbar.downloadingImage')}
            </span>
          ) : (
            <span className="mask-toolbar__icon-label">
              <IconDownload /> {t('toolbar.downloadImage')}
            </span>
          )}
        </button>
        <button
          className="btn"
          onClick={onDownloadWithPalette}
          disabled={downloadingType === 'image' || downloadingType === 'palette'}
          title={t('toolbar.downloadWithPaletteTitle')}>
          {downloadingType === 'palette' ? (
            <span className="mask-toolbar__spinner-label">
              <span
                aria-busy
                className="mask-toolbar__spinner"
              />
              {t('toolbar.downloadingPalette')}
            </span>
          ) : (
            <span className="mask-toolbar__icon-label">
              <IconDownload /> {t('toolbar.downloadWithPalette')}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
