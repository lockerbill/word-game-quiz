import type {
  SttHandlers,
  SttProvider,
  SttStartRequest,
  TtsProvider,
  TtsSpeakRequest,
} from '../types';

export class NoopTtsProvider implements TtsProvider {
  readonly id = 'noop';
  readonly label = 'Disabled voice output';

  isAvailable(): boolean {
    return true;
  }

  async speak(_request: TtsSpeakRequest): Promise<void> {
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    return Promise.resolve();
  }
}

export class NoopSttProvider implements SttProvider {
  readonly id = 'noop';
  readonly label = 'Disabled voice input';
  private listening = false;

  isAvailable(): boolean {
    return true;
  }

  isListening(): boolean {
    return this.listening;
  }

  async startListening(
    _request: SttStartRequest,
    handlers: SttHandlers,
  ): Promise<void> {
    this.listening = false;
    handlers.onError?.({
      code: 'unavailable',
      message: 'Speech recognition provider is not enabled.',
    });
  }

  async stopListening(): Promise<void> {
    this.listening = false;
  }

  async abortListening(): Promise<void> {
    this.listening = false;
  }
}
