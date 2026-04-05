export type AiValidationProviderName = 'openai' | 'ollama' | 'gemini';

export interface GameRuntimeSettings {
  categoriesPerGame: number;
  timerSecondsByMode: {
    practice: number;
    ranked: number;
    daily: number;
    relax: number;
    hardcore: number;
  };
}

export interface AiValidationRuntimeSettings {
  enabled: boolean;
  provider: AiValidationProviderName;
  timeoutMs: number;
  minConfidence: number;
  cacheTtlSeconds: number;
}

export interface FeatureFlagRuntimeSettings {
  [key: string]: boolean;
}

export interface AdminRuntimeSettings {
  game: GameRuntimeSettings;
  aiValidation: AiValidationRuntimeSettings;
  features: FeatureFlagRuntimeSettings;
}

export interface RuntimeSettingsSnapshot {
  version: number;
  settings: AdminRuntimeSettings;
}

export interface PartialAdminRuntimeSettings {
  game?: Omit<Partial<GameRuntimeSettings>, 'timerSecondsByMode'> & {
    timerSecondsByMode?: Partial<GameRuntimeSettings['timerSecondsByMode']>;
  };
  aiValidation?: Partial<AiValidationRuntimeSettings>;
  features?: Record<string, boolean>;
}
