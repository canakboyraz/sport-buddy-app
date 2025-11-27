import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Supported languages
export const LANGUAGES = {
  tr: { name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
};

export type LanguageCode = keyof typeof LANGUAGES;

// Language resources
const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

// Get device language based on locale and region
const getDeviceLanguage = (): LanguageCode => {
  const deviceLocale = Localization.getLocales()[0];
  const languageCode = deviceLocale?.languageCode || 'en';
  const regionCode = deviceLocale?.regionCode || '';

  console.log('[i18n] Device locale detected:', {
    language: languageCode,
    region: regionCode,
    fullLocale: `${languageCode}-${regionCode}`
  });

  // Priority 1: Check if device language is directly supported (tr, en)
  if (languageCode in LANGUAGES) {
    console.log(`[i18n] Using device language: ${languageCode}`);
    return languageCode as LanguageCode;
  }

  // Priority 2: Check if region is Turkey, use Turkish
  if (regionCode === 'TR') {
    console.log('[i18n] Region is Turkey, using Turkish');
    return 'tr';
  }

  // Priority 3: Default to English for all other countries
  console.log('[i18n] Using default language: English');
  return 'en';
};

// Initialize i18n - must be done synchronously before any component renders
const defaultLanguage = getDeviceLanguage();

// Initialize i18next synchronously with initImmediate
i18n.use(initReactI18next).init(
  {
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
    react: {
      useSuspense: false,
    },
    // CRITICAL: This makes init synchronous
    initImmediate: false,
  },
  (err) => {
    if (err) {
      console.error('[i18n] Initialization error:', err);
    } else {
      console.log(`[i18n] Initialized with language: ${defaultLanguage}`);
    }
  }
);

// Load saved language preference and update if different (async, in background)
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  .then((savedLanguage) => {
    if (savedLanguage && savedLanguage !== defaultLanguage) {
      i18n.changeLanguage(savedLanguage);
      console.log(`[i18n] Updated to saved language preference: ${savedLanguage}`);
    }
  })
  .catch((error) => {
    console.error('[i18n] Error loading saved language:', error);
  });

// Change language function
export const changeLanguage = async (languageCode: LanguageCode) => {
  try {
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    return true;
  } catch (error) {
    console.error('Error changing language:', error);
    return false;
  }
};

// Get current language
export const getCurrentLanguage = (): LanguageCode => {
  return i18n.language as LanguageCode;
};

// Check if language is RTL (for future support of RTL languages)
export const isRTL = (): boolean => {
  return false; // Currently no RTL languages supported
};

export default i18n;
