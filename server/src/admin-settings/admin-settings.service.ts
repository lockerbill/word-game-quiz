import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { AdminSettingsRevision } from '../entities/admin-settings-revision.entity.js';
import type { User } from '../entities/user.entity.js';
import { ListAdminSettingsRevisionsQueryDto } from './dto/list-admin-settings-revisions-query.dto.js';
import { RollbackAdminSettingsDto } from './dto/rollback-admin-settings.dto.js';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto.js';
import type {
  AdminRuntimeSettings,
  AiValidationProviderName,
  PartialAdminRuntimeSettings,
  RuntimeSettingsSnapshot,
} from './admin-settings.types.js';

interface AdminActor {
  id: string;
  role: User['role'];
}

const ALLOWED_FEATURE_FLAG_KEY = /^[a-z][a-zA-Z0-9_]{1,63}$/;

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(AdminSettingsRevision)
    private revisionRepo: Repository<AdminSettingsRevision>,
    private adminAuditLogService: AdminAuditLogService,
  ) {}

  async getRuntimeSettings(): Promise<AdminRuntimeSettings> {
    const current = await this.getCurrentSettings();
    return current.settings;
  }

  async getCurrentSettings(): Promise<RuntimeSettingsSnapshot> {
    const latest = await this.getLatestRevision();
    if (!latest) {
      return {
        version: 0,
        settings: this.getDefaultSettings(),
      };
    }

    return {
      version: latest.version,
      settings: this.parseAndValidateSettings(latest.settings),
    };
  }

  async listRevisions(query: ListAdminSettingsRevisionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.revisionRepo
      .createQueryBuilder('revision')
      .orderBy('revision.version', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return { page, limit, total, data };
  }

  async getRevision(revisionId: string): Promise<AdminSettingsRevision> {
    const revision = await this.revisionRepo.findOne({
      where: { id: revisionId },
    });
    if (!revision) {
      throw new NotFoundException('Settings revision not found');
    }

    return revision;
  }

  async updateSettings(actor: AdminActor, dto: UpdateAdminSettingsDto) {
    const current = await this.getCurrentSettings();
    if (dto.expectedVersion !== current.version) {
      throw new ConflictException(
        `Settings version mismatch: expected ${dto.expectedVersion}, current is ${current.version}`,
      );
    }

    const merged = this.mergeSettings(current.settings, dto.settings);
    const validated = this.validateSettings(merged);

    const revision = this.revisionRepo.create({
      version: current.version + 1,
      settings: validated as unknown as Record<string, unknown>,
      reason: dto.reason,
      createdByUserId: actor.id,
      publishedByUserId: actor.id,
      rollbackFromRevisionId: null,
      publishedAt: new Date(),
    });

    const saved = await this.revisionRepo.save(revision);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'settings.update',
      targetType: 'admin_settings_revision',
      targetId: saved.id,
      reason: dto.reason,
      beforeState: {
        version: current.version,
        settings: current.settings,
      },
      afterState: {
        version: saved.version,
        settings: validated,
      },
    });

    return {
      version: saved.version,
      settings: validated,
      revisionId: saved.id,
      publishedAt: saved.publishedAt,
    };
  }

  async rollbackSettings(actor: AdminActor, dto: RollbackAdminSettingsDto) {
    const current = await this.getCurrentSettings();
    if (dto.expectedVersion !== current.version) {
      throw new ConflictException(
        `Settings version mismatch: expected ${dto.expectedVersion}, current is ${current.version}`,
      );
    }

    const target = await this.getRevision(dto.targetRevisionId);
    const targetSettings = this.parseAndValidateSettings(target.settings);

    const revision = this.revisionRepo.create({
      version: current.version + 1,
      settings: targetSettings as unknown as Record<string, unknown>,
      reason: dto.reason,
      createdByUserId: actor.id,
      publishedByUserId: actor.id,
      rollbackFromRevisionId: target.id,
      publishedAt: new Date(),
    });

    const saved = await this.revisionRepo.save(revision);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'settings.rollback',
      targetType: 'admin_settings_revision',
      targetId: saved.id,
      reason: dto.reason,
      beforeState: {
        version: current.version,
      },
      afterState: {
        version: saved.version,
        rollbackFromRevisionId: target.id,
      },
      metadata: {
        rollbackTargetRevisionId: target.id,
        rollbackTargetVersion: target.version,
      },
    });

    return {
      rollbackTarget: {
        id: target.id,
        version: target.version,
      },
      appliedRevision: {
        id: saved.id,
        version: saved.version,
        publishedAt: saved.publishedAt,
      },
    };
  }

  private async getLatestRevision(): Promise<AdminSettingsRevision | null> {
    return this.revisionRepo
      .createQueryBuilder('revision')
      .orderBy('revision.version', 'DESC')
      .limit(1)
      .getOne();
  }

  private parseAndValidateSettings(payload: Record<string, unknown>) {
    return this.validateSettings(payload as unknown as AdminRuntimeSettings);
  }

  private getDefaultSettings(): AdminRuntimeSettings {
    const parsePositiveInt = (value: string | undefined, fallback: number) => {
      const parsed = Number.parseInt(value ?? '', 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }

      return parsed;
    };

    const parseUnitInterval = (value: string | undefined, fallback: number) => {
      const parsed = Number(value ?? '');
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        return fallback;
      }

      return parsed;
    };

    const providerRaw = (
      process.env.AI_VALIDATION_PROVIDER || 'openai'
    ).toLowerCase();
    const provider: AiValidationProviderName =
      providerRaw === 'ollama' || providerRaw === 'gemini'
        ? providerRaw
        : 'openai';

    return {
      game: {
        categoriesPerGame: 10,
        timerSecondsByMode: {
          practice: 30,
          ranked: 30,
          daily: 30,
          relax: 0,
          hardcore: 20,
        },
      },
      aiValidation: {
        enabled: (process.env.AI_VALIDATION_ENABLED || 'true') === 'true',
        provider,
        timeoutMs: parsePositiveInt(process.env.AI_VALIDATION_TIMEOUT_MS, 2500),
        minConfidence: parseUnitInterval(
          process.env.AI_VALIDATION_MIN_CONFIDENCE,
          0.7,
        ),
        cacheTtlSeconds: parsePositiveInt(
          process.env.AI_VALIDATION_CACHE_TTL_SECONDS,
          604800,
        ),
      },
      features: {},
    };
  }

  private mergeSettings(
    current: AdminRuntimeSettings,
    patch: PartialAdminRuntimeSettings,
  ): AdminRuntimeSettings {
    return {
      game: {
        ...current.game,
        ...(patch.game ?? {}),
        timerSecondsByMode: {
          ...current.game.timerSecondsByMode,
          ...(patch.game?.timerSecondsByMode ?? {}),
        },
      },
      aiValidation: {
        ...current.aiValidation,
        ...(patch.aiValidation ?? {}),
      },
      features: {
        ...current.features,
        ...(patch.features ?? {}),
      },
    };
  }

  private validateSettings(input: AdminRuntimeSettings): AdminRuntimeSettings {
    const topLevelKeys = Object.keys(input);
    for (const key of topLevelKeys) {
      if (!['game', 'aiValidation', 'features'].includes(key)) {
        throw new BadRequestException(`Unknown settings key: ${key}`);
      }
    }

    if (!input.game || typeof input.game !== 'object') {
      throw new BadRequestException('settings.game is required');
    }
    if (!input.aiValidation || typeof input.aiValidation !== 'object') {
      throw new BadRequestException('settings.aiValidation is required');
    }
    if (!input.features || typeof input.features !== 'object') {
      throw new BadRequestException('settings.features is required');
    }

    const categoriesPerGame = Number(input.game.categoriesPerGame);
    if (
      !Number.isInteger(categoriesPerGame) ||
      categoriesPerGame < 1 ||
      categoriesPerGame > 25
    ) {
      throw new BadRequestException(
        'game.categoriesPerGame must be an integer between 1 and 25',
      );
    }

    const modes = ['practice', 'ranked', 'daily', 'relax', 'hardcore'] as const;
    for (const mode of modes) {
      const value = Number(input.game.timerSecondsByMode?.[mode]);
      if (!Number.isInteger(value) || value < 0 || value > 120) {
        throw new BadRequestException(
          `game.timerSecondsByMode.${mode} must be an integer between 0 and 120`,
        );
      }
    }

    if (typeof input.aiValidation.enabled !== 'boolean') {
      throw new BadRequestException('aiValidation.enabled must be a boolean');
    }

    if (!['openai', 'ollama', 'gemini'].includes(input.aiValidation.provider)) {
      throw new BadRequestException(
        'aiValidation.provider must be openai, ollama, or gemini',
      );
    }

    const timeoutMs = Number(input.aiValidation.timeoutMs);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new BadRequestException(
        'aiValidation.timeoutMs must be an integer between 100 and 60000',
      );
    }

    const minConfidence = Number(input.aiValidation.minConfidence);
    if (
      !Number.isFinite(minConfidence) ||
      minConfidence < 0 ||
      minConfidence > 1
    ) {
      throw new BadRequestException(
        'aiValidation.minConfidence must be between 0 and 1',
      );
    }

    const cacheTtlSeconds = Number(input.aiValidation.cacheTtlSeconds);
    if (
      !Number.isInteger(cacheTtlSeconds) ||
      cacheTtlSeconds < 1 ||
      cacheTtlSeconds > 2_592_000
    ) {
      throw new BadRequestException(
        'aiValidation.cacheTtlSeconds must be an integer between 1 and 2592000',
      );
    }

    const features = input.features as Record<string, unknown>;
    for (const [key, value] of Object.entries(features)) {
      if (!ALLOWED_FEATURE_FLAG_KEY.test(key)) {
        throw new BadRequestException(
          `Invalid feature flag key: ${key}. Use alphanumeric/underscore camelCase-like keys`,
        );
      }
      if (typeof value !== 'boolean') {
        throw new BadRequestException(`Feature flag ${key} must be a boolean`);
      }
    }

    return {
      game: {
        categoriesPerGame,
        timerSecondsByMode: {
          practice: Number(input.game.timerSecondsByMode.practice),
          ranked: Number(input.game.timerSecondsByMode.ranked),
          daily: Number(input.game.timerSecondsByMode.daily),
          relax: Number(input.game.timerSecondsByMode.relax),
          hardcore: Number(input.game.timerSecondsByMode.hardcore),
        },
      },
      aiValidation: {
        enabled: input.aiValidation.enabled,
        provider: input.aiValidation.provider,
        timeoutMs,
        minConfidence,
        cacheTtlSeconds,
      },
      features: input.features,
    };
  }
}
