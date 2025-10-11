import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULTS } from '../config/defaults';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';
import { adjustTextColorForBackground } from '../utils/contrast';

function usePersistentValue<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stored = loadJSON<T>(key, fallback);
    return stored == null ? fallback : stored;
  });

  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}

export interface MaskSettingsStateValue {
  threshold: number;
  setThreshold: Dispatch<SetStateAction<number>>;
  strength: number;
  setStrength: Dispatch<SetStateAction<number>>;
  neutralStrength: number;
  setNeutralStrength: Dispatch<SetStateAction<number>>;
  feather: number;
  setFeather: Dispatch<SetStateAction<number>>;
  gamma: number;
  setGamma: Dispatch<SetStateAction<number>>;
  keepLight: number;
  setKeepLight: Dispatch<SetStateAction<number>>;
  chromaBoost: number;
  setChromaBoost: Dispatch<SetStateAction<number>>;
  chromaCurve: number;
  setChromaCurve: Dispatch<SetStateAction<number>>;
  speckleClean: number;
  setSpeckleClean: Dispatch<SetStateAction<number>>;
  edgeSmooth: number;
  setEdgeSmooth: Dispatch<SetStateAction<number>>;
  boundaryBlend: number;
  setBoundaryBlend: Dispatch<SetStateAction<number>>;
  overlayStrength: number;
  setOverlayStrength: Dispatch<SetStateAction<number>>;
  overlayColorStrength: number;
  setOverlayColorStrength: Dispatch<SetStateAction<number>>;
  overlayColorMixBoost: number;
  setOverlayColorMixBoost: Dispatch<SetStateAction<number>>;
  colorMixBoost: number;
  setColorMixBoost: Dispatch<SetStateAction<number>>;
  overlayTint: number;
  setOverlayTint: Dispatch<SetStateAction<number>>;
  exportBg: string;
  setExportBg: (next: string) => void;
  exportText: string;
  setExportText: Dispatch<SetStateAction<string>>;
}

export function useMaskSettingsState(): MaskSettingsStateValue {
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
    (next: string) => {
      setExportBgRaw(next);
      setExportText((prev) => adjustTextColorForBackground(prev, next));
    },
    [setExportBgRaw, setExportText],
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
    ],
  );
}

export default useMaskSettingsState;
