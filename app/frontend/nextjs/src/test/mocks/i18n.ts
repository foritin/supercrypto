import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { loadLocale } from '@/locales'

const enResources = loadLocale('en')

// Initialize i18n for tests with only English
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enResources.message },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n

