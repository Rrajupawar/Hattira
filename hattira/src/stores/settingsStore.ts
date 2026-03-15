// src/stores/settingsStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import type { LanguageCode } from '@/i18n';

interface SettingsState {
  language: LanguageCode;
  notificationsEnabled: boolean;
  isDiscoverable: boolean;
  showDistance: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDiscoverable: (discoverable: boolean) => void;
  setShowDistance: (show: boolean) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = 'hattira_settings';

// FIX: ensure named export exists
export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'en',
  notificationsEnabled: true,
  isDiscoverable: true,
  showDistance: true,

  setLanguage: async (lang: LanguageCode) => {
    await i18n.changeLanguage(lang);
    set({ language: lang });
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), language: lang })
    );
  },

  setNotificationsEnabled: (enabled: boolean) => {
    set({ notificationsEnabled: enabled });
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), notificationsEnabled: enabled })
    );
  },

  setDiscoverable: (isDiscoverable: boolean) => {
    set({ isDiscoverable });
  },

  setShowDistance: (showDistance: boolean) => {
    set({ showDistance });
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        set(parsed as SettingsState);
        if (parsed.language) {
          await i18n.changeLanguage(parsed.language);
        }
      }
    } catch {
      // Use defaults
    }
  },
}));