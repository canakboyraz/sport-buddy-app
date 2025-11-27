import { tr, enUS } from 'date-fns/locale';
import i18n from '../i18n';

/**
 * Returns the appropriate date-fns locale based on the current i18n language
 */
export const getDateLocale = () => {
  const currentLanguage = i18n.language;

  switch (currentLanguage) {
    case 'tr':
      return tr;
    case 'en':
      return enUS;
    default:
      return enUS; // Default to English
  }
};
