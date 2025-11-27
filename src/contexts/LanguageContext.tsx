import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tr from '../i18n/locales/tr.json';
import en from '../i18n/locales/en.json';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Supported languages
export const LANGUAGES = {
  tr: { name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
};

export type LanguageCode = keyof typeof LANGUAGES;

const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

// Get device language
const getDeviceLanguage = (): LanguageCode => {
  const deviceLocale = Localization.getLocales()[0];
  const languageCode = deviceLocale?.languageCode || 'en';
  const regionCode = deviceLocale?.regionCode || '';

  if (languageCode in LANGUAGES) {
    return languageCode as LanguageCode;
  }
  if (regionCode === 'TR') {
    return 'tr';
  }
  return 'en';
};

// IMPORTANT: Initialize i18n synchronously RIGHT NOW, before anything else
const defaultLanguage = getDeviceLanguage();

console.log('[LanguageContext MODULE] Starting i18n initialization...');
console.log('[LanguageContext MODULE] defaultLanguage:', defaultLanguage);

// Check if i18n is already initialized (hot reload case)
if (!i18n.isInitialized) {
  console.log('[LanguageContext MODULE] Initializing i18n for the first time');
  // Initialize synchronously
  i18n.use(initReactI18next);

  // Use the init method synchronously - it's actually sync despite returning a promise
  i18n.init({
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
} else {
  console.log('[LanguageContext MODULE] i18n already initialized (hot reload)');
}

console.log('[LanguageContext MODULE] After init():');
console.log('[LanguageContext MODULE] - isInitialized:', i18n.isInitialized);
console.log('[LanguageContext MODULE] - language:', i18n.language);
console.log('[LanguageContext MODULE] - t("auth.login"):', i18n.t('auth.login'));
console.log('[LanguageContext MODULE] - t("auth.email"):', i18n.t('auth.email'));
console.log('[LanguageContext MODULE] - t("common.appName"):', i18n.t('common.appName'));

type LanguageContextType = {
  currentLanguage: LanguageCode;
  changeLanguage: (languageCode: LanguageCode) => Promise<boolean>;
  languages: typeof LANGUAGES;
  t: (key: string, options?: any) => string;
  isChangingLanguage: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // i18n is already initialized at module level, just use it
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(i18n.language as LanguageCode || defaultLanguage);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  console.log('[LanguageProvider RENDER] currentLanguage:', currentLanguage);
  console.log('[LanguageProvider RENDER] i18n.language:', i18n.language);
  console.log('[LanguageProvider RENDER] t("auth.login") =', t('auth.login'));
  console.log('[LanguageProvider RENDER] i18n.t("auth.login") =', i18n.t('auth.login'));

  useEffect(() => {
    // Load saved language preference
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((savedLanguage) => {
      if (savedLanguage && savedLanguage !== currentLanguage) {
        i18n.changeLanguage(savedLanguage);
        setCurrentLanguage(savedLanguage as LanguageCode);
      }
    });

    // Listen to language changes
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as LanguageCode);
    };

    i18nInstance.on('languageChanged', handleLanguageChange);

    return () => {
      i18nInstance.off('languageChanged', handleLanguageChange);
    };
  }, [i18nInstance]);

  const changeLanguage = async (languageCode: LanguageCode): Promise<boolean> => {
    setIsChangingLanguage(true);
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      setCurrentLanguage(languageCode);
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      return false;
    } finally {
      setIsChangingLanguage(false);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        languages: LANGUAGES,
        t,
        isChangingLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
