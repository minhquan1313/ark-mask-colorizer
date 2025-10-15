// src/components/Toolbar.jsx
import { DownloadOutlined, ExperimentOutlined, ReloadOutlined, SlidersOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Divider, Slider, Space, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULTS } from '../config/defaults';
import { useMaskSettings } from '../context/MaskSettingsContext';
import { useI18n } from '../i18n';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';

const { Text } = Typography;

export default function Toolbar({ onReset, onDownloadImage, onDownloadWithPalette, downloadingType = null, onCustomFiles }) {
  const { t } = useI18n();
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
  } = useMaskSettings();

  const fileRef = useRef(null);
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
    [
      t,
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
      colorMixBoost,
      setColorMixBoost,
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
      overlayTint,
      setOverlayTint,
    ],
  );

  const renderSlider = (config) => {
    const formatted = config.format ? config.format(config.value) : config.value;
    return (
      <Space
        key={config.key}
        direction="vertical"
        size={4}
        style={{ width: '100%' }}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{config.label}</Text>
          <Text strong>{formatted}</Text>
        </Space>
        <Slider
          min={config.min}
          max={config.max}
          step={config.step}
          value={config.value}
          tooltip={{ formatter: config.format }}
          onChange={(value) => {
            const setter = config.setter;
            const numeric = Array.isArray(value) ? value[0] : value;
            if (typeof setter === 'function') {
              setter(Number(numeric));
            }
          }}
        />
      </Space>
    );
  };

  const handleReset = () => {
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
  };

  const isDownloadingImage = downloadingType === 'image';
  const isDownloadingPalette = downloadingType === 'palette';

  return (
    <Space
      direction="vertical"
      size="large"
      style={{ width: '100%' }}>
      {!isProduction && (
        <Button
          icon={<SlidersOutlined />}
          type={devSlidersVisible ? 'primary' : 'default'}
          onClick={() => setDevSlidersVisible((prev) => !prev)}>
          {devSlidersVisible
            ? t('toolbar.hideSliders', { defaultValue: 'Hide sliders' })
            : t('toolbar.showSliders', { defaultValue: 'Show sliders' })}
        </Button>
      )}
      {showSliderControls && (
        <Space
          direction="vertical"
          size="middle"
          style={{ width: '100%' }}>
          {sliderConfigs.map(renderSlider)}
          <Button
            icon={<ExperimentOutlined />}
            onClick={toggleOverlayBlend}>
            {t('toolbar.overlayBlendButton')}
          </Button>
        </Space>
      )}

      {showSliderControls && <Divider style={{ margin: '8px 0' }} />}

      <Space
        size="middle"
        wrap>
        <Button
          icon={<UploadOutlined />}
          onClick={() => fileRef.current?.click()}>
          {t('toolbar.customMask')}
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleReset}>
          {t('toolbar.reset')}
        </Button>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={onDownloadImage}
          loading={isDownloadingImage}
          disabled={isDownloadingPalette}>
          {t('toolbar.downloadImage')}
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
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={onDownloadWithPalette}
          loading={isDownloadingPalette}
          disabled={isDownloadingImage}>
          {t('toolbar.downloadWithPalette')}
        </Button>
      </Space>
    </Space>
  );
}
