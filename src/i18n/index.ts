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

// Initialize i18n synchronously first with default language
// Then load saved preference asynchronously
let i18nInitialized = false;

const initI18nSync = () => {
  const defaultLanguage = getDeviceLanguage();

  i18n
    .use(initReactI18next)
    .init({
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
    });

  console.log(`[i18n] Initialized synchronously with language: ${defaultLanguage}`);
  i18nInitialized = true;
};

// Load saved language preference and update if different
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
      console.log(`[i18n] Updated to saved language preference: ${savedLanguage}`);
    }
  } catch (error) {
    console.error('[i18n] Error loading saved language:', error);
  }
};

// Initialize synchronously first
initI18nSync();

// Then load saved preference in background
loadSavedLanguage();

// Export a resolved promise since init is synchronous
export const i18nInitPromise = Promise.resolve();

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
