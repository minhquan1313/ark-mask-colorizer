import { DownloadOutlined, ExperimentOutlined, ReloadOutlined, SlidersOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Divider, Slider, Space, Typography, type SliderSingleProps } from 'antd';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { DEFAULTS } from '../config/defaults';
import { useMaskSettings } from '../context/MaskSettingsContext';
import { useI18n } from '../i18n';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';

type DownloadingType = 'image' | 'palette' | null;

interface ToolbarProps {
  onReset: () => void;
  onDownloadImage: () => void;
  onDownloadWithPalette: () => void;
  downloadingType?: DownloadingType;
  onCustomFiles: (files: FileList | File[] | null | undefined) => Promise<void> | void;
}

interface SliderConfig {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string | number;
  setter: (value: number) => void;
}

const { Text } = Typography;

const isProduction = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.PROD);

export default function Toolbar({ onReset, onDownloadImage, onDownloadWithPalette, downloadingType = null, onCustomFiles }: ToolbarProps) {
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

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [, setOverlayBlendMode] = useState<'add'>(() => {
    const stored = loadJSON(STORAGE_KEYS.overlayBlendMode, DEFAULTS.overlayBlendMode);
    return stored === 'pastel' ? 'add' : stored;
  });

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: string }>).detail;
      if (detail?.mode === 'add') {
        setOverlayBlendMode('add');
      }
    };
    window.addEventListener('overlay-blend-mode-changed', listener);
    return () => window.removeEventListener('overlay-blend-mode-changed', listener);
  }, []);

  const toggleOverlayBlend = () => {
    setOverlayBlendMode('add');
    saveJSON(STORAGE_KEYS.overlayBlendMode, 'add');
    try {
      window.dispatchEvent(new CustomEvent('overlay-blend-mode-changed', { detail: { mode: 'add' } }));
    } catch {
      /* ignore */
    }
  };

  if (typeof document !== 'undefined' && !document.getElementById('tb-spin-style')) {
    const style = document.createElement('style');
    style.id = 'tb-spin-style';
    style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  const [devSlidersVisible, setDevSlidersVisible] = useState<boolean>(() => {
    const stored = loadJSON<boolean>(STORAGE_KEYS.hideSliders, false);
    return !stored;
  });

  useEffect(() => {
    saveJSON(STORAGE_KEYS.hideSliders, !devSlidersVisible);
  }, [devSlidersVisible]);

  const sliderConfigs = useMemo<SliderConfig[]>(
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
        key: 'neutralStrength',
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
        max: 1,
        step: 0.01,
        format: (v) => v.toFixed(2),
        setter: setFeather,
      },
      {
        key: 'gamma',
        label: t('toolbar.gamma'),
        value: gamma,
        min: 0.1,
        max: 3,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setGamma,
      },
      {
        key: 'keepLight',
        label: t('toolbar.keepLight'),
        value: keepLight,
        min: 0.5,
        max: 1.5,
        step: 0.02,
        format: (v) => v.toFixed(2),
        setter: setKeepLight,
      },
      {
        key: 'chromaBoost',
        label: t('toolbar.chromaBoost'),
        value: chromaBoost,
        min: 0,
        max: 2,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setChromaBoost,
      },
      {
        key: 'chromaCurve',
        label: t('toolbar.chromaCurve'),
        value: chromaCurve,
        min: 0,
        max: 3,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setChromaCurve,
      },
      {
        key: 'speckleClean',
        label: t('toolbar.speckleClean'),
        value: speckleClean,
        min: 0,
        max: 3,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setSpeckleClean,
      },
      {
        key: 'edgeSmooth',
        label: t('toolbar.edgeSmooth'),
        value: edgeSmooth,
        min: 0,
        max: 1,
        step: 0.01,
        format: (v) => v.toFixed(2),
        setter: setEdgeSmooth,
      },
      {
        key: 'boundaryBlend',
        label: t('toolbar.boundaryBlend'),
        value: boundaryBlend,
        min: 0,
        max: 1,
        step: 0.01,
        format: (v) => v.toFixed(2),
        setter: setBoundaryBlend,
      },
      {
        key: 'overlayStrength',
        label: t('toolbar.overlayStrength'),
        value: overlayStrength,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayStrength,
      },
      {
        key: 'overlayColorStrength',
        label: t('toolbar.overlayColorStrength'),
        value: overlayColorStrength,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayColorStrength,
      },
      {
        key: 'overlayColorMixBoost',
        label: t('toolbar.overlayColorMixBoost'),
        value: overlayColorMixBoost,
        min: 0,
        max: 1.5,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayColorMixBoost,
      },
      {
        key: 'colorMixBoost',
        label: t('toolbar.colorMixBoost'),
        value: colorMixBoost,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setColorMixBoost,
      },
      {
        key: 'overlayTint',
        label: t('toolbar.overlayTint'),
        value: overlayTint,
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        setter: setOverlayTint,
      },
    ],
    [
      boundaryBlend,
      chromaBoost,
      chromaCurve,
      colorMixBoost,
      edgeSmooth,
      feather,
      gamma,
      keepLight,
      neutralStrength,
      overlayColorMixBoost,
      overlayColorStrength,
      overlayStrength,
      overlayTint,
      setBoundaryBlend,
      setChromaBoost,
      setChromaCurve,
      setColorMixBoost,
      setEdgeSmooth,
      setFeather,
      setGamma,
      setKeepLight,
      setNeutralStrength,
      setOverlayColorMixBoost,
      setOverlayColorStrength,
      setOverlayStrength,
      setOverlayTint,
      setSpeckleClean,
      setStrength,
      setThreshold,
      speckleClean,
      strength,
      t,
      threshold,
    ],
  );

  const renderSlider = (config: SliderConfig) => {
    const formatted = config.format ? config.format(config.value) : config.value;
    const handleChange: SliderSingleProps['onChange'] = (value) => {
      const numeric = Array.isArray(value) ? value[0] : value;
      config.setter(Number(numeric));
    };

    const formatFn = config.format;
    const tooltipFormatter = formatFn ? (value?: number) => (value == null ? undefined : formatFn(value)) : undefined;

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
          tooltip={{ formatter: tooltipFormatter }}
          onChange={handleChange}
        />
      </Space>
    );
  };

  const handleReset = () => {
    setBoundaryBlend(DEFAULTS.boundaryBlend);
    setOverlayStrength(DEFAULTS.overlayStrength);
    setOverlayColorStrength(DEFAULTS.overlayColorStrength);
    setOverlayColorMixBoost(DEFAULTS.overlayColorMixBoost);
    setColorMixBoost(DEFAULTS.colorMixBoost);
    setOverlayTint(DEFAULTS.overlayTint);
    onReset();
  };

  const isDownloadingImage = downloadingType === 'image';
  const isDownloadingPalette = downloadingType === 'palette';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    void onCustomFiles(files);
    event.target.value = '';
  };

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
      {!isProduction && devSlidersVisible && (
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

      {!isProduction && devSlidersVisible && <Divider style={{ margin: '8px 0' }} />}

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
            ref={fileRef as MutableRefObject<HTMLInputElement | null>}
            type="file"
            accept="image/png"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
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
