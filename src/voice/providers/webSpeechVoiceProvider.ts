import type {
  SttHandlers,
  SttProvider,
  SttStartRequest,
  TtsProvider,
  TtsSpeakRequest,
} from '../types';

type SpeechSynthesisLike = {
  speaking: boolean;
  cancel: () => void;
  speak: (utterance: SpeechSynthesisUtteranceLike) => void;
};

type SpeechSynthesisUtteranceLike = {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence?: number;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  item: (index: number) => SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    item: (index: number) => SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getWebGlobals(): {
  speechSynthesis?: SpeechSynthesisLike;
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtteranceLike;
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
} {
  if (typeof globalThis !== 'object') {
    return {};
  }

  return globalThis as unknown as {
    speechSynthesis?: SpeechSynthesisLike;
    SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtteranceLike;
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
}

function mapErrorCode(raw: string):
  | 'unavailable'
  | 'permission_denied'
  | 'busy'
  | 'network'
  | 'aborted'
  | 'unknown' {
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
  return 'unknown';
}

export class WebSpeechTtsProvider implements TtsProvider {
  readonly id = 'web-speech';
  readonly label = 'Web Speech Synthesis';

  isAvailable(): boolean {
    const globals = getWebGlobals();
    return Boolean(globals.speechSynthesis && globals.SpeechSynthesisUtterance);
  }

  async speak(request: TtsSpeakRequest): Promise<void> {
    const globals = getWebGlobals();
    if (!globals.speechSynthesis || !globals.SpeechSynthesisUtterance) {
      throw new Error('Web Speech Synthesis is unavailable.');
    }

    globals.speechSynthesis.cancel();
    const utterance = new globals.SpeechSynthesisUtterance(request.text);
    utterance.lang = request.locale || 'en-US';
    utterance.rate = request.rate ?? 1;
    utterance.pitch = request.pitch ?? 1;
    globals.speechSynthesis.speak(utterance);
  }

  async stop(): Promise<void> {
    const globals = getWebGlobals();
    globals.speechSynthesis?.cancel();
  }
}

export class WebSpeechSttProvider implements SttProvider {
  readonly id = 'web-speech';
  readonly label = 'Web Speech Recognition';
  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;

  isAvailable(): boolean {
    const globals = getWebGlobals();
    return Boolean(globals.SpeechRecognition || globals.webkitSpeechRecognition);
  }

  isListening(): boolean {
    return this.listening;
  }

  async startListening(
    request: SttStartRequest,
    handlers: SttHandlers,
  ): Promise<void> {
    const globals = getWebGlobals();
    const RecognitionCtor =
      globals.SpeechRecognition || globals.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      handlers.onError?.({
        code: 'unavailable',
        message: 'Web Speech recognition is unavailable.',
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

    const recognition = new RecognitionCtor();
    recognition.lang = request.locale || 'en-US';
    recognition.interimResults = request.interimResults ?? true;
    recognition.continuous = request.continuous ?? false;
    recognition.maxAlternatives = request.maxAlternatives ?? 1;

    recognition.onstart = () => {
      this.listening = true;
      handlers.onStart?.();
    };

    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results.item(i);
        const first = result.item(0);
        if (!first || !first.transcript.trim()) {
          continue;
        }

        handlers.onResult?.({
          transcript: first.transcript,
          isFinal: result.isFinal,
          confidence:
            typeof first.confidence === 'number' ? first.confidence : null,
        });
      }
    };

    recognition.onerror = event => {
      handlers.onError?.({
        code: mapErrorCode(event.error),
        message: event.message || `Speech recognition error: ${event.error}`,
      });
    };

    recognition.onend = () => {
      this.listening = false;
      handlers.onEnd?.();
    };

    this.recognition = recognition;
    recognition.start();
  }

  async stopListening(): Promise<void> {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  async abortListening(): Promise<void> {
    if (this.recognition) {
      this.recognition.abort();
    }
  }
}
