import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { Answer } from '../entities/answer.entity.js';
import { Category } from '../entities/category.entity.js';
import { ContentRevision } from '../entities/content-revision.entity.js';
import type { User } from '../entities/user.entity.js';
import { CreateContentRevisionDraftDto } from './dto/create-content-revision-draft.dto.js';
import { ListContentRevisionsQueryDto } from './dto/list-content-revisions-query.dto.js';
import { TransitionContentRevisionDto } from './dto/transition-content-revision.dto.js';

interface AdminActor {
  id: string;
  role: User['role'];
}

interface ContentSnapshotCategory {
  id: number;
  name: string;
  difficulty: number;
  emoji: string;
  enabled: boolean;
}

interface ContentSnapshotAnswer {
  categoryId: number;
  letter: string;
  answer: string;
}

interface ContentSnapshot {
  categories: ContentSnapshotCategory[];
  answers: ContentSnapshotAnswer[];
  capturedAt: string;
}

@Injectable()
export class AdminContentRevisionService {
  constructor(
    @InjectRepository(ContentRevision)
    private contentRevisionRepo: Repository<ContentRevision>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    private adminAuditLogService: AdminAuditLogService,
  ) {}

  async listRevisions(query: ListContentRevisionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.contentRevisionRepo
      .createQueryBuilder('revision')
      .orderBy('revision.version', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (query.status) {
      qb.andWhere('revision.status = :status', { status: query.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { page, limit, total, data };
  }

  async getRevision(revisionId: string) {
    const revision = await this.contentRevisionRepo.findOne({
      where: { id: revisionId },
    });
    if (!revision) {
      throw new NotFoundException('Content revision not found');
    }

    return revision;
  }

  async createDraftFromCurrent(
    actor: AdminActor,
    dto: CreateContentRevisionDraftDto,
  ) {
    const nextVersion = await this.getNextVersion();
    const snapshot = await this.captureCurrentSnapshot();

    const revision = new ContentRevision();
    revision.version = nextVersion;
    revision.status = 'draft';
    revision.title = dto.title;
    revision.reason = dto.reason ?? null;
    revision.snapshot = snapshot as unknown as Record<string, unknown>;
    revision.createdByUserId = actor.id;
    revision.publishedByUserId = null;
    revision.publishedAt = null;
    const saved = await this.contentRevisionRepo.save(revision);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.revision.create_draft',
      targetType: 'content_revision',
      targetId: saved.id,
      reason: dto.reason ?? null,
      beforeState: null,
      afterState: {
        version: saved.version,
        status: saved.status,
        title: saved.title,
      },
    });

    return saved;
  }

  async submitForReview(
    actor: AdminActor,
    revisionId: string,
    dto: TransitionContentRevisionDto,
  ) {
    const revision = await this.getRevision(revisionId);
    if (revision.status !== 'draft') {
      throw new BadRequestException(
        'Only draft revisions can be moved to review',
      );
    }

    const beforeState = { status: revision.status };
    revision.status = 'in_review';
    revision.reason = dto.reason;
    const saved = await this.contentRevisionRepo.save(revision);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.revision.submit_review',
      targetType: 'content_revision',
      targetId: saved.id,
      reason: dto.reason,
      beforeState,
      afterState: { status: saved.status },
    });

    return saved;
  }

  async publishRevision(
    actor: AdminActor,
    revisionId: string,
    dto: TransitionContentRevisionDto,
  ) {
    const revision = await this.getRevision(revisionId);
    if (revision.status !== 'draft' && revision.status !== 'in_review') {
      throw new BadRequestException(
        'Only draft or in-review revisions can be published',
      );
    }

    const snapshot = this.parseSnapshot(revision.snapshot);
    await this.applySnapshot(snapshot);

    const beforeState = {
      status: revision.status,
      publishedAt: revision.publishedAt,
    };

    revision.status = 'published';
    revision.reason = dto.reason;
    revision.publishedByUserId = actor.id;
    revision.publishedAt = new Date();
    const saved = await this.contentRevisionRepo.save(revision);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.revision.publish',
      targetType: 'content_revision',
      targetId: saved.id,
      reason: dto.reason,
      beforeState,
      afterState: {
        status: saved.status,
        publishedByUserId: saved.publishedByUserId,
        publishedAt: saved.publishedAt,
      },
    });

    return saved;
  }

  async rollbackToRevision(
    actor: AdminActor,
    revisionId: string,
    dto: TransitionContentRevisionDto,
  ) {
    const target = await this.getRevision(revisionId);
    if (target.status !== 'published') {
      throw new BadRequestException(
        'Only published revisions can be rollback targets',
      );
    }

    const snapshot = this.parseSnapshot(target.snapshot);
    await this.applySnapshot(snapshot);

    const nextVersion = await this.getNextVersion();
    const rollbackRevision = new ContentRevision();
    rollbackRevision.version = nextVersion;
    rollbackRevision.status = 'published';
    rollbackRevision.title = `Rollback to v${target.version}`;
    rollbackRevision.reason = dto.reason;
    rollbackRevision.snapshot = snapshot as unknown as Record<string, unknown>;
    rollbackRevision.createdByUserId = actor.id;
    rollbackRevision.publishedByUserId = actor.id;
    rollbackRevision.publishedAt = new Date();
    const saved = await this.contentRevisionRepo.save(rollbackRevision);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.revision.rollback',
      targetType: 'content_revision',
      targetId: saved.id,
      reason: dto.reason,
      beforeState: {
        rollbackTargetRevisionId: target.id,
        rollbackTargetVersion: target.version,
      },
      afterState: {
        version: saved.version,
        status: saved.status,
      },
    });

    return {
      rollbackTarget: {
        id: target.id,
        version: target.version,
        title: target.title,
      },
      newPublishedRevision: saved,
    };
  }

  private parseSnapshot(payload: Record<string, unknown>): ContentSnapshot {
    const categoriesRaw = payload.categories;
    const answersRaw = payload.answers;
    const capturedAtRaw = payload.capturedAt;

    if (
      !Array.isArray(categoriesRaw) ||
      !Array.isArray(answersRaw) ||
      typeof capturedAtRaw !== 'string'
    ) {
      throw new BadRequestException('Invalid content revision snapshot');
    }

    return {
      categories: categoriesRaw as ContentSnapshotCategory[],
      answers: answersRaw as ContentSnapshotAnswer[],
      capturedAt: capturedAtRaw,
    };
  }

  private async captureCurrentSnapshot(): Promise<ContentSnapshot> {
    const categories = await this.categoryRepo.find({
      order: { id: 'ASC' },
    });
    const answers = await this.answerRepo.find({
      order: { categoryId: 'ASC', letter: 'ASC', answer: 'ASC' },
    });

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        difficulty: category.difficulty,
        emoji: category.emoji,
        enabled: category.enabled,
      })),
      answers: answers.map((answer) => ({
        categoryId: answer.categoryId,
        letter: answer.letter,
        answer: answer.answer,
      })),
      capturedAt: new Date().toISOString(),
    };
  }

  private async applySnapshot(snapshot: ContentSnapshot): Promise<void> {
    await this.categoryRepo.manager.transaction(async (tx) => {
      const categoryIds = snapshot.categories.map((category) => category.id);

      for (const category of snapshot.categories) {
        const existing = await tx.findOne(Category, {
          where: { id: category.id },
        });
        if (existing) {
          existing.name = category.name;
          existing.difficulty = category.difficulty;
          existing.emoji = category.emoji;
          existing.enabled = category.enabled;
          await tx.save(Category, existing);
          continue;
        }

        await tx.save(Category, category);
      }

      if (categoryIds.length > 0) {
        await tx
          .createQueryBuilder()
          .update(Category)
          .set({ enabled: false })
          .where('id NOT IN (:...categoryIds)', { categoryIds })
          .execute();

        await tx
          .createQueryBuilder()
          .delete()
          .from(Answer)
          .where('category_id IN (:...categoryIds)', { categoryIds })
          .execute();
      } else {
        await tx
          .createQueryBuilder()
          .update(Category)
          .set({ enabled: false })
          .execute();
      }

      if (snapshot.answers.length > 0) {
        const normalizedRows = snapshot.answers.map((row) => ({
          categoryId: row.categoryId,
          letter: row.letter.toUpperCase(),
          answer: row.answer,
        }));

        await tx
          .createQueryBuilder()
          .insert()
          .into(Answer)
          .values(normalizedRows)
          .execute();
      }
    });
  }

  private async getNextVersion(): Promise<number> {
    const latest = await this.contentRevisionRepo
      .createQueryBuilder('revision')
      .orderBy('revision.version', 'DESC')
      .limit(1)
      .getOne();

    return (latest?.version ?? 0) + 1;
  }
}
