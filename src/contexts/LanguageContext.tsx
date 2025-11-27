import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n, { createInstance } from 'i18next';
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

// Create a new i18n instance to avoid conflicts
const i18nInstance = createInstance();

const defaultLanguage = getDeviceLanguage();

console.log('[LanguageContext MODULE] Starting i18n initialization...');
console.log('[LanguageContext MODULE] defaultLanguage:', defaultLanguage);
console.log('[LanguageContext MODULE] resources keys:', JSON.stringify(Object.keys(resources)));
console.log('[LanguageContext MODULE] tr translation keys:', Object.keys(tr).length);
console.log('[LanguageContext MODULE] en translation keys:', Object.keys(en).length);

// Initialize the instance synchronously with initImmediate: false
i18nInstance
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
    returnEmptyString: false,
    returnNull: false,
    keySeparator: '.',
    parseMissingKeyHandler: (key) => {
      console.warn('[i18n] Missing translation key:', key);
      return key;
    },
  });

console.log('[LanguageContext MODULE] After init():');
console.log('[LanguageContext MODULE] - isInitialized:', i18nInstance.isInitialized);
console.log('[LanguageContext MODULE] - language:', i18nInstance.language);
console.log('[LanguageContext MODULE] - hasResourceBundle tr:', i18nInstance.hasResourceBundle('tr', 'translation'));
console.log('[LanguageContext MODULE] - hasResourceBundle en:', i18nInstance.hasResourceBundle('en', 'translation'));
console.log('[LanguageContext MODULE] - Test translations:');
console.log('[LanguageContext MODULE]   - t("auth.login"):', i18nInstance.t('auth.login'));
console.log('[LanguageContext MODULE]   - t("auth.email"):', i18nInstance.t('auth.email'));
console.log('[LanguageContext MODULE]   - t("common.appName"):', i18nInstance.t('common.appName'));

type LanguageContextType = {
  currentLanguage: LanguageCode;
  changeLanguage: (languageCode: LanguageCode) => Promise<boolean>;
  languages: typeof LANGUAGES;
  t: (key: string, options?: any) => string;
  isChangingLanguage: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(i18nInstance.language as LanguageCode || defaultLanguage);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [, forceUpdate] = useState({});

  // Use i18nInstance.t directly instead of useTranslation hook
  const t = (key: string, options?: any): string => {
    return i18nInstance.t(key, options);
  };

  console.log('[LanguageProvider RENDER] currentLanguage:', currentLanguage);
  console.log('[LanguageProvider RENDER] i18nInstance.language:', i18nInstance.language);
  console.log('[LanguageProvider RENDER] Direct i18nInstance.t("auth.login") =', i18nInstance.t('auth.login'));
  console.log('[LanguageProvider RENDER] Direct i18nInstance.t("auth.email") =', i18nInstance.t('auth.email'));

  useEffect(() => {
    // Load saved language preference
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((savedLanguage) => {
      if (savedLanguage && savedLanguage !== currentLanguage) {
        i18nInstance.changeLanguage(savedLanguage);
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

    i18nInstance.on('languageChanged', handleLanguageChange);

    return () => {
      i18nInstance.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const changeLanguage = async (languageCode: LanguageCode): Promise<boolean> => {
    setIsChangingLanguage(true);
    try {
      await i18nInstance.changeLanguage(languageCode);
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
