import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language codes type
export type LanguageCode = 'en' | 'tr';

// Language definitions
export const LANGUAGES = {
    en: {
        code: 'en' as LanguageCode,
        name: 'English',
        nativeName: 'English',
    },
    tr: {
        code: 'tr' as LanguageCode,
        name: 'Turkish',
        nativeName: 'Türkçe',
    },
};

// Translation resources
const resources = {
    en: {
        translation: {
            welcome: 'Welcome',
            settings: {
                title: 'Settings',
                preferences: 'Preferences',
                language: 'Language',
                theme: 'Theme',
                darkMode: 'Dark Mode',
                lightMode: 'Light Mode',
                notifications: 'Notifications',
                account: 'Account',
                privacy: 'Privacy',
                blockedUsers: 'Blocked Users',
                about: 'About',
                help: 'Help & Support',
                feedback: 'Feedback',
                termsOfService: 'Terms of Service',
                privacyPolicy: 'Privacy Policy',
                version: 'Version',
            },
            notifications: {
                settings: 'Notification Settings',
            },
            weather: {
                loading: 'Loading weather...',
                error: 'Unable to load weather',
                current: 'Current Weather',
                atSessionTime: 'Weather at Session Time',
                feelsLike: 'Feels Like',
                humidity: 'Humidity',
                wind: 'Wind',
                recommendedClothing: 'Recommended Clothing',
            },
        },
    },
    tr: {
        translation: {
            welcome: 'Hoşgeldiniz',
            settings: {
                title: 'Ayarlar',
                preferences: 'Tercihler',
                language: 'Dil',
                theme: 'Tema',
                darkMode: 'Koyu Mod',
                lightMode: 'Açık Mod',
                notifications: 'Bildirimler',
                account: 'Hesap',
                privacy: 'Gizlilik',
                blockedUsers: 'Engellenen Kullanıcılar',
                about: 'Hakkında',
                help: 'Yardım & Destek',
                feedback: 'Geri Bildirim',
                termsOfService: 'Kullanım Şartları',
                privacyPolicy: 'Gizlilik Politikası',
                version: 'Sürüm',
            },
            notifications: {
                settings: 'Bildirim Ayarları',
            },
            weather: {
                loading: 'Hava durumu yükleniyor...',
                error: 'Hava durumu yüklenemedi',
                current: 'Şu Anki Hava Durumu',
                atSessionTime: 'Seans Saatinde Hava Durumu',
                feelsLike: 'Hissedilen',
                humidity: 'Nem',
                wind: 'Rüzgar',
                recommendedClothing: 'Önerilen Kıyafet',
            },
        },
    },
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'user_language_preference';

// Get current language
export const getCurrentLanguage = (): LanguageCode => {
    return (i18n.language || 'tr') as LanguageCode;
};

// Change language
export const changeLanguage = async (languageCode: LanguageCode): Promise<boolean> => {
    try {
        await i18n.changeLanguage(languageCode);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
        return true;
    } catch (error) {
        console.error('Error changing language:', error);
        return false;
    }
};

// Initialize i18n
const initI18n = async () => {
    try {
        // Try to get saved language preference
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const deviceLanguage = Localization.getLocales()[0]?.languageCode;

        // Determine initial language
        let initialLanguage: LanguageCode = 'tr';
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'tr')) {
            initialLanguage = savedLanguage as LanguageCode;
        } else if (deviceLanguage === 'en' || deviceLanguage === 'tr') {
            initialLanguage = deviceLanguage as LanguageCode;
        }

        await i18n
            .use(initReactI18next)
            .init({
                resources,
                lng: initialLanguage,
                fallbackLng: 'tr',
                interpolation: {
                    escapeValue: false,
                },
            });
    } catch (error) {
        console.error('Error initializing i18n:', error);
        // Fallback to simple initialization
        await i18n
            .use(initReactI18next)
            .init({
                resources,
                lng: 'tr',
                fallbackLng: 'tr',
                interpolation: {
                    escapeValue: false,
                },
            });
    }
};

// Initialize immediately
initI18n();

export default i18n;
