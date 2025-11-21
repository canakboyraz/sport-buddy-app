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

// Get device language
const getDeviceLanguage = (): LanguageCode => {
  const deviceLocale = Localization.getLocales()[0];
  const languageCode = deviceLocale?.languageCode || 'en';

  // Check if device language is supported
  if (languageCode in LANGUAGES) {
    return languageCode as LanguageCode;
  }

  // Default to Turkish for Turkey region, English otherwise
  return deviceLocale?.regionCode === 'TR' ? 'tr' : 'en';
};

// Initialize i18next
const initI18n = async () => {
  let savedLanguage: string | null = null;

  try {
    savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('Error loading saved language:', error);
  }

  const language = savedLanguage || getDeviceLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already handles XSS
      },
      compatibilityJSON: 'v3', // Use v3 format for pluralization
      react: {
        useSuspense: false,
      },
    });
};

initI18n();

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
