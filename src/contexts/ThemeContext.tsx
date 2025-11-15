import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Özel tema renkleri
const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    primaryContainer: '#bb86fc',
    secondary: '#03dac6',
    secondaryContainer: '#018786',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#b00020',
    onPrimary: '#ffffff',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    primaryContainer: '#3700b3',
    secondary: '#03dac6',
    secondaryContainer: '#018786',
    background: '#121212',
    surface: '#1e1e1e',
    error: '#cf6679',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: '#ffffff',
    onSurface: '#ffffff',
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
