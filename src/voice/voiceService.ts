import { ExpoSttProvider } from './providers/expoSttProvider';
import { ExpoTtsProvider } from './providers/expoTtsProvider';
import { NoopSttProvider, NoopTtsProvider } from './providers/noopVoiceProvider';
import {
  WebSpeechSttProvider,
  WebSpeechTtsProvider,
} from './providers/webSpeechVoiceProvider';
import type { SttProvider, TtsProvider } from './types';

interface VoiceProviderRegistry {
  tts: Map<string, TtsProvider>;
  stt: Map<string, SttProvider>;
}

export class VoiceService {
  private readonly registry: VoiceProviderRegistry;
  private readonly fallbackTtsId: string;
  private readonly fallbackSttId: string;

  constructor(options?: {
    ttsProviders?: TtsProvider[];
    sttProviders?: SttProvider[];
    fallbackTtsId?: string;
    fallbackSttId?: string;
  }) {
    const ttsProviders = options?.ttsProviders || [new NoopTtsProvider()];
    const sttProviders = options?.sttProviders || [new NoopSttProvider()];

    this.registry = {
      tts: new Map(ttsProviders.map(provider => [provider.id, provider])),
      stt: new Map(sttProviders.map(provider => [provider.id, provider])),
    };

    this.fallbackTtsId = options?.fallbackTtsId || ttsProviders[0].id;
    this.fallbackSttId = options?.fallbackSttId || sttProviders[0].id;
  }

  registerTtsProvider(provider: TtsProvider): void {
    this.registry.tts.set(provider.id, provider);
  }

  registerSttProvider(provider: SttProvider): void {
    this.registry.stt.set(provider.id, provider);
  }

  listTtsProviders(): TtsProvider[] {
    return Array.from(this.registry.tts.values());
  }

  listSttProviders(): SttProvider[] {
    return Array.from(this.registry.stt.values());
  }

  getTtsProvider(id?: string | null): TtsProvider {
    if (id && this.registry.tts.has(id)) {
      return this.registry.tts.get(id)!;
    }

    const fallback = this.registry.tts.get(this.fallbackTtsId);
    if (fallback) {
      return fallback;
    }

    return this.listTtsProviders()[0];
  }

  getSttProvider(id?: string | null): SttProvider {
    if (id && this.registry.stt.has(id)) {
      return this.registry.stt.get(id)!;
    }

    const fallback = this.registry.stt.get(this.fallbackSttId);
    if (fallback) {
      return fallback;
    }

    return this.listSttProviders()[0];
  }

  async getAvailableTtsProviders(): Promise<TtsProvider[]> {
    const all = this.listTtsProviders();
    const availability = await Promise.all(
      all.map(provider => Promise.resolve(provider.isAvailable())),
    );
    return all.filter((_, index) => availability[index]);
  }

  async getAvailableSttProviders(): Promise<SttProvider[]> {
    const all = this.listSttProviders();
    const availability = await Promise.all(
      all.map(provider => Promise.resolve(provider.isAvailable())),
    );
    return all.filter((_, index) => availability[index]);
  }
}

export function createDefaultVoiceService(): VoiceService {
  const service = new VoiceService({
    ttsProviders: [new NoopTtsProvider()],
    sttProviders: [new NoopSttProvider()],
    fallbackTtsId: 'noop',
    fallbackSttId: 'noop',
  });

  service.registerTtsProvider(new WebSpeechTtsProvider());
  service.registerSttProvider(new WebSpeechSttProvider());
  service.registerTtsProvider(new ExpoTtsProvider());
  service.registerSttProvider(new ExpoSttProvider());

  return service;
}

export const voiceService = createDefaultVoiceService();
