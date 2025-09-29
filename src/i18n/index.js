import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { FALLBACK_LANG, SUPPORTED_LANGS, resources } from './translations.js';
import { STORAGE_KEYS } from '../utils/storage.js';

const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language;

function resolveInitialLanguage() {
  if (typeof window === 'undefined') {
    return FALLBACK_LANG;
  }
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return FALLBACK_LANG;
    const parsed = JSON.parse(raw);
    return SUPPORTED_LANGS.includes(parsed) ? parsed : FALLBACK_LANG;
  } catch {
    return FALLBACK_LANG;
  }
}

const initialLanguage = resolveInitialLanguage();

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: FALLBACK_LANG,
      supportedLngs: SUPPORTED_LANGS,
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    })
    .catch((err) => {
      console.error('Failed to initialise i18next', err);
    });

  if (typeof window !== 'undefined' && !i18n.__languageStorageBound) {
    i18n.on('languageChanged', (lng) => {
      if (!SUPPORTED_LANGS.includes(lng)) return;
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(lng));
      } catch {
        /* ignore storage errors */
      }
    });
    i18n.__languageStorageBound = true;
  }
}

export function useI18n() {
  const { t, i18n: instance } = useTranslation();

  const setLang = (code) => {
    if (SUPPORTED_LANGS.includes(code) && instance.language !== code) {
      instance.changeLanguage(code).catch(() => {
        /* ignore change errors */
      });
    }
  };

  return {
    t,
    lang: instance.language,
    setLang,
    setLanguage: setLang,
  };
}

export function useLanguageOptions() {
  const { t } = useI18n();
  return SUPPORTED_LANGS.map((code) => ({
    code,
    label: t(`language.options.${code}`),
  }));
}

export { i18n, SUPPORTED_LANGS };
