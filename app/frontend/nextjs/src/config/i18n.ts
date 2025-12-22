import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { loadLocale } from '@/locales'

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'zh'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// Language display names
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文',
}

// Load language resources using modular loader
const enResources = loadLocale('en')
const zhResources = loadLocale('zh')

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enResources.message },
      zh: { translation: zhResources.message },
    },
    fallbackLng: 'en', // Default language is English
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Language detection order
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
      // LocalStorage key for language preference
      lookupLocalStorage: 'supercrypto-language',
    },
  })

export default i18n

