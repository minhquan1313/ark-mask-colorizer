import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { FALLBACK_LANG, SUPPORTED_LANGS, resources, LANGUAGE_FLAGS, type LanguageCode } from './translations';
import { STORAGE_KEYS } from '../utils/storage';

const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language;

type RuntimeI18n = typeof i18n & { __languageStorageBound?: boolean };
const runtimeI18n = i18n as RuntimeI18n;

function resolveInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return FALLBACK_LANG;
  }
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return FALLBACK_LANG;
    const parsed = JSON.parse(raw) as unknown;
    return SUPPORTED_LANGS.includes(parsed as LanguageCode) ? (parsed as LanguageCode) : FALLBACK_LANG;
  } catch {
    return FALLBACK_LANG;
  }
}

const initialLanguage = resolveInitialLanguage();

if (!runtimeI18n.isInitialized) {
  runtimeI18n
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

  if (typeof window !== 'undefined' && !runtimeI18n.__languageStorageBound) {
    runtimeI18n.on('languageChanged', (lng) => {
      if (!SUPPORTED_LANGS.includes(lng as LanguageCode)) return;
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(lng));
      } catch {
        /* ignore storage errors */
      }
    });
    runtimeI18n.__languageStorageBound = true;
  }
}

export function useI18n(): {
  t: ReturnType<typeof useTranslation>['t'];
  lang: string;
  setLang: (code: LanguageCode) => void;
  setLanguage: (code: LanguageCode) => void;
} {
  const { t, i18n: instance } = useTranslation();

  const setLang = (code: LanguageCode): void => {
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

export function useLanguageOptions(): Array<{
  code: LanguageCode;
  label: string;
  flag: string | null;
}> {
  const { t } = useI18n();
  return SUPPORTED_LANGS.map((code) => ({
    code,
    label: t(`language.options.${code}`),
    flag: LANGUAGE_FLAGS[code] ?? null,
  }));
}

export { i18n, SUPPORTED_LANGS };
