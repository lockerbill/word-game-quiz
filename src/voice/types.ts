export interface VoiceError {
  code:
    | 'unavailable'
    | 'permission_denied'
    | 'busy'
    | 'network'
    | 'aborted'
    | 'unknown';
  message: string;
}

export interface TtsSpeakRequest {
  text: string;
  locale?: string;
  rate?: number;
  pitch?: number;
}

export interface TtsProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): boolean | Promise<boolean>;
  speak(request: TtsSpeakRequest): Promise<void>;
  stop(): Promise<void>;
}

export interface SttResult {
  transcript: string;
  isFinal: boolean;
  confidence: number | null;
}

export interface SttStartRequest {
  locale?: string;
  interimResults?: boolean;
  maxAlternatives?: number;
  continuous?: boolean;
}

export interface SttHandlers {
  onStart?: () => void;
  onResult?: (result: SttResult) => void;
  onError?: (error: VoiceError) => void;
  onEnd?: () => void;
}

export interface SttProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): boolean | Promise<boolean>;
  isListening(): boolean;
  startListening(request: SttStartRequest, handlers: SttHandlers): Promise<void>;
  stopListening(): Promise<void>;
  abortListening(): Promise<void>;
}
