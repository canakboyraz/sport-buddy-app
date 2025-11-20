import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web support for SecureStore is limited, so we might need a fallback or handle it gracefully.
// For this project, we'll assume mobile-first but add a basic check.

export const secureStore = {
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      // SecureStore is not supported on web. 
      // In a real app, you might use cookies or localStorage with encryption, 
      // but for now we'll warn or use localStorage if critical.
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('SecureStore not supported on web', e);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },

  deleteItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('SecureStore not supported on web', e);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
