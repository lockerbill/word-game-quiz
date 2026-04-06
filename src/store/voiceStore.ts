import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { voiceService } from '../voice';

interface PersistedVoiceSettings {
  voiceModeEnabled: boolean;
  autoSpeakQuestion: boolean;
  ttsProviderId: string;
  sttProviderId: string;
  locale: string;
  speechRate: number;
  speechPitch: number;
}

interface VoiceState extends PersistedVoiceSettings {
  isLoaded: boolean;
  isListening: boolean;
  lastError: string | null;

  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setVoiceModeEnabled: (value: boolean) => void;
  setAutoSpeakQuestion: (value: boolean) => void;
  setTtsProviderId: (id: string) => void;
  setSttProviderId: (id: string) => void;
  setLocale: (locale: string) => void;
  setSpeechRate: (rate: number) => void;
  setSpeechPitch: (pitch: number) => void;
  setListening: (value: boolean) => void;
  setLastError: (message: string | null) => void;
  clearError: () => void;
}

const STORAGE_KEY = '@alpha_bucks_voice';

const defaultSettings: PersistedVoiceSettings = {
  voiceModeEnabled: false,
  autoSpeakQuestion: true,
  ttsProviderId: 'noop',
  sttProviderId: 'noop',
  locale: 'en-US',
  speechRate: 1,
  speechPitch: 1,
};

function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function resolveTtsProviderId(value: unknown): string {
  if (typeof value !== 'string') {
    return defaultSettings.ttsProviderId;
  }
  return voiceService.getTtsProvider(value).id;
}

function resolveSttProviderId(value: unknown): string {
  if (typeof value !== 'string') {
    return defaultSettings.sttProviderId;
  }
  return voiceService.getSttProvider(value).id;
}

function normalizePersistedSettings(raw: unknown): PersistedVoiceSettings {
  if (!raw || typeof raw !== 'object') {
    return defaultSettings;
  }

  const value = raw as Partial<PersistedVoiceSettings>;
  return {
    voiceModeEnabled:
      typeof value.voiceModeEnabled === 'boolean'
        ? value.voiceModeEnabled
        : defaultSettings.voiceModeEnabled,
    autoSpeakQuestion:
      typeof value.autoSpeakQuestion === 'boolean'
        ? value.autoSpeakQuestion
        : defaultSettings.autoSpeakQuestion,
    ttsProviderId: resolveTtsProviderId(value.ttsProviderId),
    sttProviderId: resolveSttProviderId(value.sttProviderId),
    locale:
      typeof value.locale === 'string' && value.locale.trim().length > 0
        ? value.locale
        : defaultSettings.locale,
    speechRate: clampValue(
      typeof value.speechRate === 'number'
        ? value.speechRate
        : defaultSettings.speechRate,
      0.5,
      2,
    ),
    speechPitch: clampValue(
      typeof value.speechPitch === 'number'
        ? value.speechPitch
        : defaultSettings.speechPitch,
      0.5,
      2,
    ),
  };
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  ...defaultSettings,
  isLoaded: false,
  isListening: false,
  lastError: null,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ isLoaded: true });
        return;
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizePersistedSettings(parsed);
      set({ ...normalized, isLoaded: true });
    } catch {
      set({ ...defaultSettings, isLoaded: true });
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      const toSave: PersistedVoiceSettings = {
        voiceModeEnabled: state.voiceModeEnabled,
        autoSpeakQuestion: state.autoSpeakQuestion,
        ttsProviderId: resolveTtsProviderId(state.ttsProviderId),
        sttProviderId: resolveSttProviderId(state.sttProviderId),
        locale: state.locale,
        speechRate: state.speechRate,
        speechPitch: state.speechPitch,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore persistence failures and keep runtime state.
    }
  },

  setVoiceModeEnabled: (value: boolean) => {
    set({ voiceModeEnabled: value });
    void get().saveSettings();
  },

  setAutoSpeakQuestion: (value: boolean) => {
    set({ autoSpeakQuestion: value });
    void get().saveSettings();
  },

  setTtsProviderId: (id: string) => {
    set({ ttsProviderId: resolveTtsProviderId(id) });
    void get().saveSettings();
  },

  setSttProviderId: (id: string) => {
    set({ sttProviderId: resolveSttProviderId(id) });
    void get().saveSettings();
  },

  setLocale: (locale: string) => {
    const safeLocale = locale.trim().length > 0 ? locale.trim() : defaultSettings.locale;
    set({ locale: safeLocale });
    void get().saveSettings();
  },

  setSpeechRate: (rate: number) => {
    set({ speechRate: clampValue(rate, 0.5, 2) });
    void get().saveSettings();
  },

  setSpeechPitch: (pitch: number) => {
    set({ speechPitch: clampValue(pitch, 0.5, 2) });
    void get().saveSettings();
  },

  setListening: (value: boolean) => set({ isListening: value }),
  setLastError: (message: string | null) => set({ lastError: message }),
  clearError: () => set({ lastError: null }),
}));
