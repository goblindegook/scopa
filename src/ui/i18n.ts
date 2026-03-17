import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import it from './locales/it.json'

i18n
  .use(ICU)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      it: { translation: it },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'it'],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'scopa:language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    showSupportNotice: false,
  })

export default i18n
