import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Özel tema renkleri - Geliştirilmiş Koyu Mod Tasarımı
const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    primaryContainer: '#bb86fc',
    secondary: '#03dac6',
    secondaryContainer: '#018786',
    tertiary: '#9c27b0',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceVariant: '#f0f0f0',
    error: '#b00020',
    errorContainer: '#ffdad6',
    onPrimary: '#ffffff',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onSurfaceVariant: '#666666',
    outline: '#e0e0e0',
    outlineVariant: '#d0d0d0',
    shadow: '#000000',
    inverseSurface: '#1e1e1e',
    inverseOnSurface: '#ffffff',
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Ana renkler - Daha canlı ve modern
    primary: '#bb86fc',
    primaryContainer: '#4a148c',
    secondary: '#03dac6',
    secondaryContainer: '#005f56',
    tertiary: '#cf6679',

    // Arka plan renkleri - Daha zengin karanlık tonlar
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceVariant: '#2d2d2d',
    surfaceDisabled: '#1f1f1f',

    // Hata renkleri
    error: '#cf6679',
    errorContainer: '#93000a',

    // Metin renkleri - Yüksek kontrast
    onPrimary: '#000000',
    onPrimaryContainer: '#e1bee7',
    onSecondary: '#000000',
    onSecondaryContainer: '#a7ffeb',
    onTertiary: '#000000',
    onBackground: '#e8e8e8',
    onSurface: '#e8e8e8',
    onSurfaceVariant: '#b0b0b0',
    onError: '#ffffff',
    onErrorContainer: '#ffdad6',

    // Kontur ve gölge
    outline: '#404040',
    outlineVariant: '#2d2d2d',
    shadow: '#000000',

    // Ters yüzey
    inverseSurface: '#e8e8e8',
    inverseOnSurface: '#1a1a1a',
    inversePrimary: '#6200ee',

    // Kart ve modal arka planları
    elevation: {
      level0: 'transparent',
      level1: '#1f1f1f',
      level2: '#242424',
      level3: '#292929',
      level4: '#2d2d2d',
      level5: '#323232',
    },

    // Özel renkler
    backdrop: 'rgba(0, 0, 0, 0.8)',
  },
};

const { LightTheme: NavigationLight, DarkTheme: NavigationDark } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

export const CombinedLightTheme = {
  ...customLightTheme,
  ...NavigationLight,
  colors: {
    ...customLightTheme.colors,
    ...NavigationLight.colors,
  },
};

export const CombinedDarkTheme = {
  ...customDarkTheme,
  ...NavigationDark,
  colors: {
    ...customDarkTheme.colors,
    ...NavigationDark.colors,
  },
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof CombinedLightTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePreference');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('themePreference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? CombinedDarkTheme : CombinedLightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
