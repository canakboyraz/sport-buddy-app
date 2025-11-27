import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { changeLanguage as changeI18nLanguage, getCurrentLanguage, LanguageCode, LANGUAGES } from '../i18n';

type LanguageContextType = {
  currentLanguage: LanguageCode;
  changeLanguage: (languageCode: LanguageCode) => Promise<boolean>;
  languages: typeof LANGUAGES;
  t: (key: string, options?: any) => string;
  isChangingLanguage: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// FORCE i18n initialization by importing and using it
console.log('[LanguageContext] Forcing i18n initialization');
console.log('[LanguageContext] i18n.isInitialized:', i18n.isInitialized);
console.log('[LanguageContext] i18n.language:', i18n.language);
console.log('[LanguageContext] Test translation auth.login:', i18n.t('auth.login'));

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(getCurrentLanguage());
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  useEffect(() => {
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
      const success = await changeI18nLanguage(languageCode);
      if (success) {
        setCurrentLanguage(languageCode);
      }
      return success;
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
