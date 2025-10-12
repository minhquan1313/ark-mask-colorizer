// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, ColorPicker, Divider, Space, Switch, Typography } from 'antd';
import { DEFAULTS } from '../config/defaults';
import { useMaskSettings } from '../context/MaskSettingsContext';
import { useI18n } from '../i18n';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';
import ColorFavorites from './ColorFavorites';

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

export default function MaskExportSettings({ t: overrideT }) {
  const { t: i18nT } = useI18n();
  const t = useMemo(() => overrideT ?? i18nT, [overrideT, i18nT]);
  const { exportBg, setExportBg, exportText, setExportText, unlockAllSlots, setUnlockAllSlots } = useMaskSettings();

  const [bgFavorites, setBgFavorites] = useState(() => sanitizeColorFavorites(loadJSON(STORAGE_KEYS.exportBgFavorites, [])));
  const [textFavorites, setTextFavorites] = useState(() => sanitizeColorFavorites(loadJSON(STORAGE_KEYS.exportTextFavorites, [])));
  const isTransparent = exportBg === 'transparent';
  const lastSolidBgRef = useRef(isTransparent ? DEFAULTS.exportBg : exportBg);

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

  const applyBgColor = useCallback(
    (hex) => {
      if (!hex) return;
      lastSolidBgRef.current = hex;
      setExportBg(hex);
      updateBgFavorites((prev) => upsertColorFavorite(prev, hex));
    },
    [setExportBg, updateBgFavorites],
  );

  const applyTextColor = useCallback(
    (hex) => {
      if (!hex) return;
      setExportText(hex);
      updateTextFavorites((prev) => upsertColorFavorite(prev, hex));
    },
    [setExportText, updateTextFavorites],
  );

  const handleTransparentBg = useCallback(() => {
    if (!isTransparent && typeof exportBg === 'string' && exportBg.startsWith('#') && exportBg.length === 7) {
      lastSolidBgRef.current = exportBg;
    }
    setExportBg('transparent');
  }, [exportBg, isTransparent, setExportBg]);

  const handleBgFavoriteSelect = useCallback(
    (color) => {
      const normalized = normalizeHexColor(color);
      if (!normalized) return;
      applyBgColor(normalized);
    },
    [applyBgColor],
  );

  const handleTextFavoriteSelect = useCallback(
    (color) => {
      const normalized = normalizeHexColor(color);
      if (!normalized) return;
      applyTextColor(normalized);
    },
    [applyTextColor],
  );

  const handleBgFavoriteRemove = useCallback(
    (color) => {
      const normalized = normalizeHexColor(color);
      if (!normalized) return;
      updateBgFavorites((prev) => prev.filter((value) => value !== normalized));
    },
    [updateBgFavorites],
  );

  const handleTextFavoriteRemove = useCallback(
    (color) => {
      const normalized = normalizeHexColor(color);
      if (!normalized) return;
      updateTextFavorites((prev) => prev.filter((value) => value !== normalized));
    },
    [updateTextFavorites],
  );

  const handleBgFavoritesReordered = useCallback(
    (next) => {
      updateBgFavorites(next);
    },
    [updateBgFavorites],
  );

  const handleTextFavoritesReordered = useCallback(
    (next) => {
      updateTextFavorites(next);
    },
    [updateTextFavorites],
  );

  const currentBgColor = isTransparent ? lastSolidBgRef.current || DEFAULTS.exportBg : exportBg;

  return (
    <Card
      size="small"
      bordered={false}
      style={{ background: 'transparent' }}
      title={
        <Space
          direction="vertical"
          size={0}>
          <Typography.Title
            level={4}
            style={{ margin: 0 }}>
            {t('settings.maskTabTitle', { defaultValue: 'Mask export' })}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('settings.maskExportHint', { defaultValue: 'Choose default export colors and manage quick favorites.' })}
          </Typography.Text>
        </Space>
      }>
      <Space
        direction="vertical"
        size="large"
        style={{ width: '100%' }}>
        <Card
          size="small"
          className="settings-mask__switch"
          bodyStyle={{ display: 'grid', gap: 8 }}>
          <Typography.Text strong>{t('settings.unlockAllSlots', { defaultValue: 'Unlock all slots' })}</Typography.Text>
          <Typography.Text type="secondary">
            {t('settings.unlockAllSlotsDescription', {
              defaultValue: 'Allow editing all color slots regardless of creature mask availability.',
            })}
          </Typography.Text>
          <Switch
            checked={unlockAllSlots}
            onChange={(checked) => setUnlockAllSlots(checked)}
          />
        </Card>

        <Space
          direction="horizontal"
          wrap
          size="large">
          <Space
            direction="vertical"
            size="small">
            <Typography.Text type="secondary">{t('toolbar.bg', { defaultValue: 'Background' })}</Typography.Text>
            <Space
              direction="horizontal"
              size="middle">
              <ColorPicker
                value={currentBgColor}
                onChangeComplete={(color) => {
                  const hex = color.toHexString().toUpperCase();
                  applyBgColor(hex);
                }}
              />
              <Button
                type={isTransparent ? 'primary' : 'default'}
                onClick={handleTransparentBg}>
                {t('settings.transparentToggle', { defaultValue: 'Transparent' })}
              </Button>
            </Space>
            <Typography.Text type="secondary">
              {isTransparent
                ? t('settings.transparentActive', { defaultValue: 'Transparent background will be used.' })
                : t('settings.solidActive', { defaultValue: 'Solid background will be used.' })}
            </Typography.Text>
          </Space>

          <Space
            direction="vertical"
            size="small">
            <Typography.Text type="secondary">{t('toolbar.text', { defaultValue: 'Text' })}</Typography.Text>
            <ColorPicker
              value={exportText}
              onChangeComplete={(color) => {
                const hex = color.toHexString().toUpperCase();
                applyTextColor(hex);
              }}
            />
          </Space>
        </Space>

        <Divider style={{ margin: '12px 0' }} />

        <Card
          size="small"
          title={t('toolbar.bgFavorites', { defaultValue: 'Background favorites' })}
          bodyStyle={{ paddingInline: 0 }}>
          <ColorFavorites
            colors={bgFavorites}
            onSelect={handleBgFavoriteSelect}
            onRemove={handleBgFavoriteRemove}
            onReorder={handleBgFavoritesReordered}
          />
        </Card>
        <Card
          size="small"
          title={t('toolbar.textFavorites', { defaultValue: 'Text favorites' })}
          bodyStyle={{ paddingInline: 0 }}>
          <ColorFavorites
            colors={textFavorites}
            onSelect={handleTextFavoriteSelect}
            onRemove={handleTextFavoriteRemove}
            onReorder={handleTextFavoritesReordered}
          />
        </Card>
      </Space>
    </Card>
  );
}
