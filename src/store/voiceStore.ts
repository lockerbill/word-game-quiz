import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

const WEB_SPEECH_PROVIDER_ID = 'web-speech';
const EXPO_TTS_PROVIDER_ID = 'expo-tts';
const EXPO_STT_PROVIDER_ID = 'expo-stt';

function getPlatformPreferredTtsProviderId(): string {
  return Platform.OS === 'web' ? WEB_SPEECH_PROVIDER_ID : EXPO_TTS_PROVIDER_ID;
}

function getPlatformPreferredSttProviderId(): string {
  return Platform.OS === 'web' ? WEB_SPEECH_PROVIDER_ID : EXPO_STT_PROVIDER_ID;
}

async function resolveBestTtsProviderId(preferredId?: string | null): Promise<string> {
  const preferred = voiceService.getTtsProvider(preferredId || getPlatformPreferredTtsProviderId());
  const preferredAvailable = await Promise.resolve(preferred.isAvailable());
  if (preferredAvailable) {
    return preferred.id;
  }

  const available = await voiceService.getAvailableTtsProviders();
  const best = available.find(provider => provider.id !== 'noop') || available[0];
  return best?.id || 'noop';
}

async function resolveBestSttProviderId(preferredId?: string | null): Promise<string> {
  const preferred = voiceService.getSttProvider(preferredId || getPlatformPreferredSttProviderId());
  const preferredAvailable = await Promise.resolve(preferred.isAvailable());
  if (preferredAvailable) {
    return preferred.id;
  }

  const available = await voiceService.getAvailableSttProviders();
  const best = available.find(provider => provider.id !== 'noop') || available[0];
  return best?.id || 'noop';
}

const defaultSettings: PersistedVoiceSettings = {
  voiceModeEnabled: false,
  autoSpeakQuestion: true,
  ttsProviderId: getPlatformPreferredTtsProviderId(),
  sttProviderId: getPlatformPreferredSttProviderId(),
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

      const bestTtsProviderId = await resolveBestTtsProviderId();
      const bestSttProviderId = await resolveBestSttProviderId();

      if (!raw) {
        const next = {
          ...defaultSettings,
          ttsProviderId: bestTtsProviderId,
          sttProviderId: bestSttProviderId,
        };
        set({ ...next, isLoaded: true });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return;
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizePersistedSettings(parsed);
      const migrated: PersistedVoiceSettings = {
        ...normalized,
        ttsProviderId:
          normalized.ttsProviderId === 'noop' ? bestTtsProviderId : normalized.ttsProviderId,
        sttProviderId:
          normalized.sttProviderId === 'noop' ? bestSttProviderId : normalized.sttProviderId,
      };
      set({ ...migrated, isLoaded: true });

      if (
        migrated.ttsProviderId !== normalized.ttsProviderId
        || migrated.sttProviderId !== normalized.sttProviderId
      ) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch {
      const fallback = {
        ...defaultSettings,
        ttsProviderId: await resolveBestTtsProviderId(),
        sttProviderId: await resolveBestSttProviderId(),
      };
      set({ ...fallback, isLoaded: true });
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
