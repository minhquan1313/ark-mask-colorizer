import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULTS } from '../config/defaults.js';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage.js';
import { adjustTextColorForBackground } from '../utils/contrast.js';

function usePersistentValue(key, fallback) {
  const [value, setValue] = useState(() => {
    const stored = loadJSON(key, fallback);
    return stored == null ? fallback : stored;
  });

  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}

export function useMaskSettingsState() {
  const [threshold, setThreshold] = usePersistentValue(STORAGE_KEYS.threshold, DEFAULTS.threshold);
  const [strength, setStrength] = usePersistentValue(STORAGE_KEYS.strength, DEFAULTS.strength);
  const [neutralStrength, setNeutralStrength] = usePersistentValue(STORAGE_KEYS.neutralStrength, DEFAULTS.neutralStrength);
  const [feather, setFeather] = usePersistentValue(STORAGE_KEYS.feather, DEFAULTS.feather);
  const [gamma, setGamma] = usePersistentValue(STORAGE_KEYS.gamma, DEFAULTS.gamma);
  const [keepLight, setKeepLight] = usePersistentValue(STORAGE_KEYS.keepLight, DEFAULTS.keepLight);
  const [chromaBoost, setChromaBoost] = usePersistentValue(STORAGE_KEYS.chromaBoost, DEFAULTS.chromaBoost);
  const [chromaCurve, setChromaCurve] = usePersistentValue(STORAGE_KEYS.chromaCurve, DEFAULTS.chromaCurve);
  const [speckleClean, setSpeckleClean] = usePersistentValue(STORAGE_KEYS.speckleClean, DEFAULTS.speckleClean);
  const [edgeSmooth, setEdgeSmooth] = usePersistentValue(STORAGE_KEYS.edgeSmooth, DEFAULTS.edgeSmooth);
  const [boundaryBlend, setBoundaryBlend] = usePersistentValue(STORAGE_KEYS.boundaryBlend, DEFAULTS.boundaryBlend);
  const [overlayStrength, setOverlayStrength] = usePersistentValue(STORAGE_KEYS.overlayStrength, DEFAULTS.overlayStrength);
  const [overlayColorStrength, setOverlayColorStrength] = usePersistentValue(STORAGE_KEYS.overlayColorStrength, DEFAULTS.overlayColorStrength);
  const [overlayColorMixBoost, setOverlayColorMixBoost] = usePersistentValue(STORAGE_KEYS.overlayColorMixBoost, DEFAULTS.overlayColorMixBoost);
  const [colorMixBoost, setColorMixBoost] = usePersistentValue(STORAGE_KEYS.colorMixBoost, DEFAULTS.colorMixBoost);
  const [overlayTint, setOverlayTint] = usePersistentValue(STORAGE_KEYS.overlayTint, DEFAULTS.overlayTint);
  const [exportBgRaw, setExportBgRaw] = usePersistentValue(STORAGE_KEYS.exportBg, DEFAULTS.exportBg);
  const [exportText, setExportText] = usePersistentValue(STORAGE_KEYS.exportTx, DEFAULTS.exportText);

  const setExportBg = useCallback(
    (next) => {
      setExportBgRaw(next);
      setExportText((prev) => adjustTextColorForBackground(prev, next));
    },
    [setExportBgRaw, setExportText]
  );

  return useMemo(
    () => ({
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
      exportBg: exportBgRaw,
      setExportBg,
      exportText,
      setExportText,
    }),
    [
      boundaryBlend,
      chromaBoost,
      chromaCurve,
      colorMixBoost,
      edgeSmooth,
      exportBgRaw,
      exportText,
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
      setExportBg,
      setExportText,
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
      threshold,
    ]
  );
}

export default useMaskSettingsState;

