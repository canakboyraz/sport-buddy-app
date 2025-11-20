import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Simple translation resources (add more languages as needed)
const resources = {
    en: {
        translation: {
            welcome: 'Welcome',
            // add more keys here
        },
    },
    tr: {
        translation: {
            welcome: 'Hoşgeldiniz',
            // add more keys here
        },
    },
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: Localization.getLocales()[0]?.languageCode ?? 'en', // use device language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
