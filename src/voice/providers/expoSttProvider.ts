import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';
import type {
  SttHandlers,
  SttProvider,
  SttStartRequest,
  VoiceError,
} from '../types';

interface PermissionResponse {
  granted: boolean;
}

interface ResultAlternative {
  transcript?: string;
  confidence?: number;
}

interface ResultEventPayload {
  results?: ResultAlternative[];
  isFinal?: boolean;
}

interface ErrorEventPayload {
  error?: string;
  message?: string;
}

interface EventSubscription {
  remove: () => void;
}

function mapExpoErrorCode(raw?: string): VoiceError['code'] {
  if (!raw) {
    return 'unknown';
  }

  if (raw === 'not-allowed' || raw === 'service-not-allowed') {
    return 'permission_denied';
  }
  if (raw === 'network') {
    return 'network';
  }
  if (raw === 'aborted') {
    return 'aborted';
  }
  if (raw === 'audio-capture') {
    return 'unavailable';
  }
  if (raw === 'busy') {
    return 'busy';
  }

  return 'unknown';
}

export class ExpoSttProvider implements SttProvider {
  readonly id = 'expo-stt';
  readonly label = 'Expo Speech Recognition (mobile)';
  private listening = false;
  private subscriptions: EventSubscription[] = [];

  isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return false;
    }
    if (!ExpoSpeechRecognitionModule) {
      return false;
    }
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  }

  isListening(): boolean {
    return this.listening;
  }

  async startListening(
    request: SttStartRequest,
    handlers: SttHandlers,
  ): Promise<void> {
    if (!this.isAvailable()) {
      handlers.onError?.({
        code: 'unavailable',
        message: 'Speech recognition is unavailable on this device.',
      });
      return;
    }

    if (this.listening) {
      handlers.onError?.({
        code: 'busy',
        message: 'Speech recognition is already running.',
      });
      return;
    }

    const permissions =
      (await ExpoSpeechRecognitionModule.requestPermissionsAsync()) as PermissionResponse;
    if (!permissions.granted) {
      handlers.onError?.({
        code: 'permission_denied',
        message: 'Microphone or speech permission was denied.',
      });
      return;
    }

    this.clearListeners();

    this.subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('start', () => {
        this.listening = true;
        handlers.onStart?.();
      }) as EventSubscription,
    );

    this.subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('result', (event: unknown) => {
        const payload = event as ResultEventPayload;
        const firstResult = payload.results?.[0];
        const transcript = firstResult?.transcript?.trim() || '';
        if (!transcript) {
          return;
        }

        handlers.onResult?.({
          transcript,
          isFinal: payload.isFinal === true,
          confidence:
            typeof firstResult?.confidence === 'number'
              ? firstResult.confidence
              : null,
        });
      }) as EventSubscription,
    );

    this.subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('error', (event: unknown) => {
        const payload = event as ErrorEventPayload;
        handlers.onError?.({
          code: mapExpoErrorCode(payload.error),
          message:
            payload.message || payload.error || 'Unknown speech recognition error.',
        });
      }) as EventSubscription,
    );

    this.subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('end', () => {
        this.listening = false;
        handlers.onEnd?.();
        this.clearListeners();
      }) as EventSubscription,
    );

    ExpoSpeechRecognitionModule.start({
      lang: request.locale || 'en-US',
      interimResults: request.interimResults ?? true,
      maxAlternatives: request.maxAlternatives ?? 1,
      continuous: request.continuous ?? false,
    });
  }

  async stopListening(): Promise<void> {
    if (!this.isAvailable()) {
      this.listening = false;
      return;
    }

    ExpoSpeechRecognitionModule.stop();
  }

  async abortListening(): Promise<void> {
    if (!this.isAvailable()) {
      this.listening = false;
      return;
    }

    ExpoSpeechRecognitionModule.abort();
  }

  private clearListeners(): void {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
  }
}
