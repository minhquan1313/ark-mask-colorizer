import en from './locales/en.json';
import vi from './locales/vi.json';
import enFlag from './flags/en.svg';
import viFlag from './flags/vi.svg';

export const FALLBACK_LANG = 'en';
export const SUPPORTED_LANGS = ['en', 'vi'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGS)[number];

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} satisfies Record<LanguageCode, { translation: Record<string, unknown> }>;

export const LANGUAGE_FLAGS = {
  en: enFlag,
  vi: viFlag,
} satisfies Record<LanguageCode, string>;
