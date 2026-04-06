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

export interface AdminRuntimeSettings {
  game: GameRuntimeSettings;
  aiValidation: AiValidationRuntimeSettings;
  features: Record<string, boolean>;
}

export interface RuntimeSettingsSnapshot {
  version: number;
  settings: AdminRuntimeSettings;
}

export interface PartialAdminRuntimeSettings {
  game?: Partial<GameRuntimeSettings> & {
    timerSecondsByMode?: Partial<GameRuntimeSettings['timerSecondsByMode']>;
  };
  aiValidation?: Partial<AiValidationRuntimeSettings>;
  features?: Record<string, boolean>;
}

export interface AdminSettingsRevision {
  id: string;
  version: number;
  settings: Record<string, unknown>;
  reason: string;
  createdByUserId: string | null;
  publishedByUserId: string | null;
  rollbackFromRevisionId: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSettingsRevisions {
  page: number;
  limit: number;
  total: number;
  data: AdminSettingsRevision[];
}

export interface UpdateAdminSettingsPayload {
  expectedVersion: number;
  reason: string;
  settings: PartialAdminRuntimeSettings;
}

export interface UpdateAdminSettingsResponse {
  version: number;
  settings: AdminRuntimeSettings;
  revisionId: string;
  publishedAt: string;
}

export interface RollbackAdminSettingsPayload {
  targetRevisionId: string;
  expectedVersion: number;
  reason: string;
}

export interface RollbackAdminSettingsResponse {
  rollbackTarget: {
    id: string;
    version: number;
  };
  appliedRevision: {
    id: string;
    version: number;
    publishedAt: string;
  };
}
