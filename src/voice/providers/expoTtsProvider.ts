import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { TtsProvider, TtsSpeakRequest } from '../types';

export class ExpoTtsProvider implements TtsProvider {
  readonly id = 'expo-tts';
  readonly label = 'Expo Speech (mobile)';

  isAvailable(): boolean {
    return Platform.OS !== 'web' && typeof Speech.speak === 'function';
  }

  async speak(request: TtsSpeakRequest): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Expo Speech is unavailable on this platform.');
    }

    await this.stop();

    await new Promise<void>((resolve, reject) => {
      Speech.speak(request.text, {
        language: request.locale,
        rate: request.rate,
        pitch: request.pitch,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => reject(new Error('Expo Speech failed to speak text.')),
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    Speech.stop();
  }
}
