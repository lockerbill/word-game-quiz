import { Injectable, Logger } from '@nestjs/common';
import { AdminSettingsService } from '../admin-settings/admin-settings.service.js';
import { RedisService } from '../redis/redis.service.js';
import type {
  AiValidationRequest,
  AiValidationResult,
  ValidationReason,
} from './ai-validation.types.js';
import { OpenAiValidationProvider } from './providers/openai.provider.js';
import { OllamaValidationProvider } from './providers/ollama.provider.js';
import { GeminiValidationProvider } from './providers/gemini.provider.js';
import type { AiValidationProvider } from './providers/ai-validation-provider.js';

@Injectable()
export class AiValidationService {
  private readonly logger = new Logger(AiValidationService.name);
  private readonly attemptsByProvider = new Map<string, number>();
  private readonly errorsByProvider = new Map<string, number>();

  constructor(
    private readonly adminSettingsService: AdminSettingsService,
    private readonly redis: RedisService,
    private readonly openAiProvider: OpenAiValidationProvider,
    private readonly ollamaProvider: OllamaValidationProvider,
    private readonly geminiProvider: GeminiValidationProvider,
  ) {}

  async validateUnknownAnswer(
    request: AiValidationRequest,
  ): Promise<AiValidationResult> {
    const runtimeSettings =
      await this.adminSettingsService.getRuntimeSettings();
    if (!runtimeSettings.aiValidation.enabled) {
      return this.strictInvalid('ai_error', null, null);
    }

    const provider = this.getConfiguredProvider(
      runtimeSettings.aiValidation.provider,
    );
    const model = provider.getModel();
    const cacheKey = this.buildCacheKey(provider.name, model, request);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AiValidationResult;
        return parsed;
      } catch {
        await this.redis.del(cacheKey);
      }
    }

    try {
      const timeoutMs = runtimeSettings.aiValidation.timeoutMs;
      const minConfidence = runtimeSettings.aiValidation.minConfidence;

      this.trackAttempt(provider.name);
      const modelResult = await this.withTimeout(
        provider.validate(request),
        timeoutMs,
      );

      const accepted =
        modelResult.valid && modelResult.confidence >= minConfidence;
      const result: AiValidationResult = {
        valid: accepted,
        confidence: modelResult.confidence,
        reason: accepted ? 'ai_validated' : 'ai_rejected',
        provider: provider.name,
        model,
      };

      const ttl = runtimeSettings.aiValidation.cacheTtlSeconds;
      await this.redis.set(cacheKey, JSON.stringify(result), ttl);
      return result;
    } catch (error) {
      this.trackError(provider.name);
      this.logger.warn(
        `AI validation failed (${provider.name}): ${(error as Error).message}`,
      );
      return this.strictInvalid('ai_error', provider.name, model);
    }
  }

  private getConfiguredProvider(configured: string): AiValidationProvider {
    if (configured === 'ollama') {
      return this.ollamaProvider;
    }
    if (configured === 'gemini') {
      return this.geminiProvider;
    }
    return this.openAiProvider;
  }

  private buildCacheKey(
    provider: string,
    model: string,
    request: AiValidationRequest,
  ): string {
    const normalize = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, ' ');

    return [
      'ai-validation',
      provider,
      model,
      normalize(request.letter),
      normalize(request.categoryName),
      normalize(request.answer),
    ].join(':');
  }

  private strictInvalid(
    reason: ValidationReason,
    provider: string | null,
    model: string | null,
  ): AiValidationResult {
    return {
      valid: false,
      confidence: 0,
      reason,
      provider,
      model,
    };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Validation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private trackAttempt(provider: string): void {
    const attempts = (this.attemptsByProvider.get(provider) || 0) + 1;
    this.attemptsByProvider.set(provider, attempts);
  }

  private trackError(provider: string): void {
    const errors = (this.errorsByProvider.get(provider) || 0) + 1;
    this.errorsByProvider.set(provider, errors);

    const attempts = this.attemptsByProvider.get(provider) || 0;
    if (attempts >= 10 && attempts % 10 === 0) {
      const errorRate = (errors / attempts) * 100;
      this.logger.warn(
        `AI validation error rate (${provider}): ${errors}/${attempts} (${errorRate.toFixed(1)}%)`,
      );
    }
  }
}
