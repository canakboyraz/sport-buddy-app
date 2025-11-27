import React, { createContext, useContext, useState, useEffect } from 'react';
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
console.log('[LanguageContext MODULE] resources:', JSON.stringify(Object.keys(resources)));
console.log('[LanguageContext MODULE] tr keys count:', Object.keys(tr).length);
console.log('[LanguageContext MODULE] en keys count:', Object.keys(en).length);

// Always reinitialize to ensure fresh state
if (i18n.isInitialized) {
  console.log('[LanguageContext MODULE] i18n already initialized, creating new instance');
}

// Use initReactI18next plugin
i18n.use(initReactI18next);

// Initialize without resources first
i18n.init({
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
  react: {
    useSuspense: false,
  },
  // Add these to ensure resources load properly
  returnEmptyString: false,
  returnNull: false,
  parseMissingKeyHandler: (key) => {
    console.warn('[i18n] Missing translation key:', key);
    return key;
  },
});

// Add resources manually after initialization
console.log('[LanguageContext MODULE] Adding resources manually...');
i18n.addResourceBundle('tr', 'translation', tr, true, true);
i18n.addResourceBundle('en', 'translation', en, true, true);
console.log('[LanguageContext MODULE] Resources added manually');

console.log('[LanguageContext MODULE] After init():');
console.log('[LanguageContext MODULE] - isInitialized:', i18n.isInitialized);
console.log('[LanguageContext MODULE] - language:', i18n.language);
console.log('[LanguageContext MODULE] - hasResourceBundle tr:', i18n.hasResourceBundle('tr', 'translation'));
console.log('[LanguageContext MODULE] - hasResourceBundle en:', i18n.hasResourceBundle('en', 'translation'));
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
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(i18n.language as LanguageCode || defaultLanguage);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [, forceUpdate] = useState({});

  // Use i18n.t directly instead of useTranslation hook
  const t = (key: string, options?: any): string => {
    return i18n.t(key, options);
  };

  console.log('[LanguageProvider RENDER] currentLanguage:', currentLanguage);
  console.log('[LanguageProvider RENDER] i18n.language:', i18n.language);
  console.log('[LanguageProvider RENDER] Direct i18n.t("auth.login") =', i18n.t('auth.login'));
  console.log('[LanguageProvider RENDER] Direct i18n.t("auth.email") =', i18n.t('auth.email'));

  useEffect(() => {
    // Load saved language preference
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((savedLanguage) => {
      if (savedLanguage && savedLanguage !== currentLanguage) {
        i18n.changeLanguage(savedLanguage);
        setCurrentLanguage(savedLanguage as LanguageCode);
        forceUpdate({});
      }
    });

    // Listen to language changes
    const handleLanguageChange = (lng: string) => {
      console.log('[LanguageProvider] Language changed to:', lng);
      setCurrentLanguage(lng as LanguageCode);
      forceUpdate({});
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

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
