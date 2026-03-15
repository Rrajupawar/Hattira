// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { kn } from './kn';

export type LanguageCode = 'en' | 'kn';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      kn,
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    // FIX: v3 → v4 (required for i18next v23+)
    compatibilityJSON: 'v4',
  });

export default i18n;