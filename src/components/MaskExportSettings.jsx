import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULTS } from '../config/defaults.js';
import { useMaskSettings } from '../context/MaskSettingsContext.jsx';
import { useI18n } from '../i18n/index.js';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage.js';
import ColorFavorites from './ColorFavorites.jsx';

const MAX_COLOR_FAVORITES = 6;
const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

function normalizeHexColor(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function sanitizeColorFavorites(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const value of list) {
    const normalized = normalizeHexColor(value);
    if (normalized && !seen.has(normalized)) {
      result.push(normalized);
      seen.add(normalized);
    }
    if (result.length >= MAX_COLOR_FAVORITES) break;
  }
  return result;
}

function upsertColorFavorite(list, color) {
  const normalized = normalizeHexColor(color);
  if (!normalized) return list;
  const filtered = Array.isArray(list) ? list.filter((item) => item !== normalized) : [];
  filtered.unshift(normalized);
  return filtered.slice(0, MAX_COLOR_FAVORITES);
}

function colorFavoritesEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export default function MaskExportSettings({ t: overrideT, className }) {
  const { t: i18nT } = useI18n();
  const t = useMemo(() => overrideT ?? i18nT, [overrideT, i18nT]);
  const { exportBg, setExportBg, exportText, setExportText } = useMaskSettings();

  const [bgFavorites, setBgFavorites] = useState(() => sanitizeColorFavorites(loadJSON(STORAGE_KEYS.exportBgFavorites, [])));
  const [textFavorites, setTextFavorites] = useState(() => sanitizeColorFavorites(loadJSON(STORAGE_KEYS.exportTextFavorites, [])));

  const isTransparent = exportBg === 'transparent';
  const lastSolidBgRef = useRef(isTransparent ? DEFAULTS.exportBg : exportBg);
  const bgInputValue = isTransparent ? lastSolidBgRef.current || DEFAULTS.exportBg : exportBg;

  useEffect(() => {
    if (!isTransparent && typeof exportBg === 'string' && exportBg.startsWith('#') && exportBg.length === 7) {
      lastSolidBgRef.current = exportBg;
    }
  }, [exportBg, isTransparent]);

  const updateBgFavorites = useCallback((updater) => {
    setBgFavorites((prev) => {
      const next = sanitizeColorFavorites(typeof updater === 'function' ? updater(prev) : updater);
      if (colorFavoritesEqual(prev, next)) return prev;
      saveJSON(STORAGE_KEYS.exportBgFavorites, next);
      return next;
    });
  }, []);

  const updateTextFavorites = useCallback((updater) => {
    setTextFavorites((prev) => {
      const next = sanitizeColorFavorites(typeof updater === 'function' ? updater(prev) : updater);
      if (colorFavoritesEqual(prev, next)) return prev;
      saveJSON(STORAGE_KEYS.exportTextFavorites, next);
      return next;
    });
  }, []);

  const handleExportBgChange = useCallback((value) => {
    setExportBg(value);
  }, [setExportBg]);

  const handleTransparentBg = useCallback(() => {
    if (!isTransparent && typeof exportBg === 'string' && exportBg.startsWith('#') && exportBg.length === 7) {
      lastSolidBgRef.current = exportBg;
    }
    setExportBg('transparent');
  }, [exportBg, isTransparent, setExportBg]);

  const handleBgBlur = useCallback((event) => {
    const normalized = normalizeHexColor(event?.target?.value);
    if (!normalized) return;
    updateBgFavorites((prev) => upsertColorFavorite(prev, normalized));
  }, [updateBgFavorites]);

  const handleTextBlur = useCallback((event) => {
    const normalized = normalizeHexColor(event?.target?.value);
    if (!normalized) return;
    updateTextFavorites((prev) => upsertColorFavorite(prev, normalized));
  }, [updateTextFavorites]);

  const handleBgFavoriteSelect = useCallback((color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    setExportBg(normalized);
    updateBgFavorites((prev) => upsertColorFavorite(prev, normalized));
  }, [setExportBg, updateBgFavorites]);

  const handleTextFavoriteSelect = useCallback((color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    setExportText(normalized);
    updateTextFavorites((prev) => upsertColorFavorite(prev, normalized));
  }, [setExportText, updateTextFavorites]);

  const handleBgFavoriteRemove = useCallback((color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    updateBgFavorites((prev) => prev.filter((value) => value !== normalized));
  }, [updateBgFavorites]);

  const handleTextFavoriteRemove = useCallback((color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    updateTextFavorites((prev) => prev.filter((value) => value !== normalized));
  }, [updateTextFavorites]);

  const handleBgFavoritesReordered = useCallback((next) => {
    updateBgFavorites(next);
  }, [updateBgFavorites]);

  const handleTextFavoritesReordered = useCallback((next) => {
    updateTextFavorites(next);
  }, [updateTextFavorites]);

  return (
    <div className={`mask-export-settings${className ? ` ${className}` : ''}`}>
      <div className="mask-export-settings__header">
        <div className="mask-export-settings__title">{t('toolbar.export', { defaultValue: 'Export' })}</div>
        <div className="mask-export-settings__description subtle small">
          {t('settings.maskExportHint', { defaultValue: 'Choose default export colors and manage quick favorites.' })}
        </div>
      </div>
      <div className="mask-export-settings__inputs">
        <div className="mask-export-settings__field">
          <div className="mask-export-settings__label small subtle">{t('toolbar.bg', { defaultValue: 'Background' })}</div>
          <div className="mask-export-settings__picker">
            <input
              type="color"
              value={bgInputValue}
              onChange={(event) => handleExportBgChange(event.target.value)}
              onBlur={handleBgBlur}
            />
            <button
              type="button"
              className={`mask-export-settings__transparent${isTransparent ? ' is-active' : ''}`}
              onClick={handleTransparentBg}
              aria-label={t('toolbar.transparentTitle', { defaultValue: 'Toggle transparent background' })}>
              {t('settings.transparentToggle', { defaultValue: 'Transparent' })}
            </button>
          </div>
        </div>
        <div className="mask-export-settings__field">
          <div className="mask-export-settings__label small subtle">{t('toolbar.text', { defaultValue: 'Text' })}</div>
          <div className="mask-export-settings__picker">
            <input
              type="color"
              value={exportText}
              onChange={(event) => setExportText(event.target.value)}
              onBlur={handleTextBlur}
            />
          </div>
        </div>
      </div>
      <div className="mask-export-settings__favorites">
        <ColorFavorites
          label={t('toolbar.bgFavorites', { defaultValue: 'Background favorites' })}
          colors={bgFavorites}
          onSelect={handleBgFavoriteSelect}
          onRemove={handleBgFavoriteRemove}
          onReorder={handleBgFavoritesReordered}
        />
        <ColorFavorites
          label={t('toolbar.textFavorites', { defaultValue: 'Text favorites' })}
          colors={textFavorites}
          onSelect={handleTextFavoriteSelect}
          onRemove={handleTextFavoriteRemove}
          onReorder={handleTextFavoritesReordered}
        />
      </div>
    </div>
  );
}
