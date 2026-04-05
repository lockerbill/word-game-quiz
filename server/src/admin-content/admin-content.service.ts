import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { Answer } from '../entities/answer.entity.js';
import { Category } from '../entities/category.entity.js';
import type { User } from '../entities/user.entity.js';
import { CreateAnswerDto } from './dto/create-answer.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { DeleteAnswerDto } from './dto/delete-answer.dto.js';
import { ListAnswersQueryDto } from './dto/list-answers-query.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { SetCategoryEnabledDto } from './dto/set-category-enabled.dto.js';
import { UpdateAnswerDto } from './dto/update-answer.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

interface AdminActor {
  id: string;
  role: User['role'];
}

interface CategoryAnswerCountRow {
  category_id: number | string;
  answercount: number | string | null;
}

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    private adminAuditLogService: AdminAuditLogService,
  ) {}

  async listCategories(query: ListCategoriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.answers', 'answer')
      .addSelect('COUNT(answer.id)', 'answerCount')
      .groupBy('category.id')
      .orderBy('category.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (query.search) {
      qb.andWhere('LOWER(category.name) LIKE LOWER(:search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    if (typeof query.enabled === 'boolean') {
      qb.andWhere('category.enabled = :enabled', { enabled: query.enabled });
    }

    const [rows, count] = await Promise.all([
      qb.getRawAndEntities(),
      this.categoryRepo
        .createQueryBuilder('category')
        .where(
          [
            query.search ? 'LOWER(category.name) LIKE LOWER(:search)' : '1 = 1',
            typeof query.enabled === 'boolean'
              ? 'category.enabled = :enabled'
              : '1 = 1',
          ].join(' AND '),
          {
            search: `%${(query.search ?? '').trim()}%`,
            enabled: query.enabled,
          },
        )
        .getCount(),
    ]);

    const answerCountByCategoryId = new Map<number, number>();
    const rawRows = rows.raw as CategoryAnswerCountRow[];
    for (const raw of rawRows) {
      const categoryId = Number(raw.category_id);
      const answerCount = Number(raw.answercount ?? 0);
      answerCountByCategoryId.set(categoryId, answerCount);
    }

    return {
      page,
      limit,
      total: count,
      data: rows.entities.map((category) => ({
        id: category.id,
        name: category.name,
        difficulty: category.difficulty,
        emoji: category.emoji,
        enabled: category.enabled,
        createdAt: category.createdAt,
        answerCount: answerCountByCategoryId.get(category.id) ?? 0,
      })),
    };
  }

  async createCategory(actor: AdminActor, dto: CreateCategoryDto) {
    const normalizedName = this.normalizeSpaces(dto.name);

    const existing = await this.categoryRepo
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name: normalizedName })
      .getOne();

    if (existing) {
      throw new ConflictException('Category name already exists');
    }

    const nextId = await this.getNextCategoryId();
    const category = this.categoryRepo.create({
      id: nextId,
      name: normalizedName,
      difficulty: dto.difficulty ?? 1,
      emoji: this.normalizeEmoji(dto.emoji),
      enabled: dto.enabled ?? true,
    });
    const saved = await this.categoryRepo.save(category);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.category.create',
      targetType: 'category',
      targetId: String(saved.id),
      reason: dto.reason,
      beforeState: null,
      afterState: {
        id: saved.id,
        name: saved.name,
        difficulty: saved.difficulty,
        emoji: saved.emoji,
        enabled: saved.enabled,
      },
    });

    return saved;
  }

  async updateCategory(
    actor: AdminActor,
    categoryId: number,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const beforeState = {
      id: category.id,
      name: category.name,
      difficulty: category.difficulty,
      emoji: category.emoji,
      enabled: category.enabled,
    };

    if (dto.name) {
      const normalizedName = this.normalizeSpaces(dto.name);
      const duplicate = await this.categoryRepo
        .createQueryBuilder('category')
        .where('LOWER(category.name) = LOWER(:name)', { name: normalizedName })
        .andWhere('category.id != :id', { id: category.id })
        .getOne();

      if (duplicate) {
        throw new ConflictException('Category name already exists');
      }

      category.name = normalizedName;
    }

    if (typeof dto.difficulty === 'number') {
      category.difficulty = dto.difficulty;
    }

    if (typeof dto.emoji === 'string') {
      category.emoji = this.normalizeEmoji(dto.emoji);
    }

    if (typeof dto.enabled === 'boolean') {
      category.enabled = dto.enabled;
    }

    const saved = await this.categoryRepo.save(category);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.category.update',
      targetType: 'category',
      targetId: String(saved.id),
      reason: dto.reason ?? null,
      beforeState,
      afterState: {
        id: saved.id,
        name: saved.name,
        difficulty: saved.difficulty,
        emoji: saved.emoji,
        enabled: saved.enabled,
      },
    });

    return saved;
  }

  async setCategoryEnabled(
    actor: AdminActor,
    categoryId: number,
    dto: SetCategoryEnabledDto,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const beforeState = { enabled: category.enabled };
    category.enabled = dto.enabled;
    const saved = await this.categoryRepo.save(category);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.category.enabled.update',
      targetType: 'category',
      targetId: String(saved.id),
      reason: dto.reason,
      beforeState,
      afterState: { enabled: saved.enabled },
    });

    return saved;
  }

  async listAnswers(categoryId: number, query: ListAnswersQueryDto) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.answerRepo
      .createQueryBuilder('answer')
      .where('answer.categoryId = :categoryId', { categoryId })
      .orderBy('answer.letter', 'ASC')
      .addOrderBy('answer.answer', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (query.letter) {
      qb.andWhere('answer.letter = :letter', {
        letter: query.letter.toUpperCase(),
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      category: {
        id: category.id,
        name: category.name,
        enabled: category.enabled,
      },
      page,
      limit,
      total,
      data,
    };
  }

  async createAnswer(
    actor: AdminActor,
    categoryId: number,
    dto: CreateAnswerDto,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const letter = this.normalizeLetter(dto.letter);
    const answer = this.normalizeAnswerText(dto.answer);
    this.ensureStartsWithLetter(answer, letter);

    const duplicate = await this.answerRepo
      .createQueryBuilder('answer')
      .where('answer.categoryId = :categoryId', { categoryId })
      .andWhere('answer.letter = :letter', { letter })
      .andWhere('LOWER(TRIM(answer.answer)) = LOWER(TRIM(:answer))', { answer })
      .getOne();

    if (duplicate) {
      throw new ConflictException(
        'Answer already exists for this category and letter',
      );
    }

    const entity = this.answerRepo.create({ categoryId, letter, answer });
    const saved = await this.answerRepo.save(entity);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.answer.create',
      targetType: 'answer',
      targetId: String(saved.id),
      reason: dto.reason,
      beforeState: null,
      afterState: {
        id: saved.id,
        categoryId: saved.categoryId,
        letter: saved.letter,
        answer: saved.answer,
      },
    });

    return saved;
  }

  async updateAnswer(
    actor: AdminActor,
    answerId: number,
    dto: UpdateAnswerDto,
  ) {
    const row = await this.answerRepo.findOne({ where: { id: answerId } });
    if (!row) {
      throw new NotFoundException('Answer not found');
    }

    const beforeState = {
      id: row.id,
      categoryId: row.categoryId,
      letter: row.letter,
      answer: row.answer,
    };

    const nextLetter = dto.letter
      ? this.normalizeLetter(dto.letter)
      : row.letter;
    const nextAnswer = dto.answer
      ? this.normalizeAnswerText(dto.answer)
      : row.answer;
    this.ensureStartsWithLetter(nextAnswer, nextLetter);

    const duplicate = await this.answerRepo
      .createQueryBuilder('answer')
      .where('answer.categoryId = :categoryId', { categoryId: row.categoryId })
      .andWhere('answer.letter = :letter', { letter: nextLetter })
      .andWhere('LOWER(TRIM(answer.answer)) = LOWER(TRIM(:answer))', {
        answer: nextAnswer,
      })
      .andWhere('answer.id != :id', { id: row.id })
      .getOne();

    if (duplicate) {
      throw new ConflictException(
        'Answer already exists for this category and letter',
      );
    }

    row.letter = nextLetter;
    row.answer = nextAnswer;
    const saved = await this.answerRepo.save(row);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.answer.update',
      targetType: 'answer',
      targetId: String(saved.id),
      reason: dto.reason ?? null,
      beforeState,
      afterState: {
        id: saved.id,
        categoryId: saved.categoryId,
        letter: saved.letter,
        answer: saved.answer,
      },
    });

    return saved;
  }

  async deleteAnswer(
    actor: AdminActor,
    answerId: number,
    dto: DeleteAnswerDto,
  ) {
    const row = await this.answerRepo.findOne({ where: { id: answerId } });
    if (!row) {
      throw new NotFoundException('Answer not found');
    }

    const beforeState = {
      id: row.id,
      categoryId: row.categoryId,
      letter: row.letter,
      answer: row.answer,
    };

    await this.answerRepo.remove(row);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.answer.delete',
      targetType: 'answer',
      targetId: String(answerId),
      reason: dto.reason,
      beforeState,
      afterState: null,
    });

    return { deleted: true, id: answerId };
  }

  private async getNextCategoryId(): Promise<number> {
    const last = await this.categoryRepo
      .createQueryBuilder('category')
      .orderBy('category.id', 'DESC')
      .limit(1)
      .getOne();

    return (last?.id ?? 0) + 1;
  }

  private normalizeSpaces(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      throw new BadRequestException('Value cannot be empty');
    }

    return normalized;
  }

  private normalizeEmoji(value: string | undefined): string {
    const normalized = this.normalizeSpaces(value ?? '📝');
    return normalized.slice(0, 16);
  }

  private normalizeLetter(letter: string): string {
    const normalized = letter.trim().toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) {
      throw new BadRequestException(
        'Letter must be a single alphabet character',
      );
    }

    return normalized;
  }

  private normalizeAnswerText(answer: string): string {
    const normalized = this.normalizeSpaces(answer);
    if (normalized.length > 200) {
      throw new BadRequestException('Answer exceeds 200 characters');
    }

    return normalized;
  }

  private ensureStartsWithLetter(answer: string, letter: string): void {
    const firstChar = answer.trim().charAt(0).toUpperCase();
    if (firstChar !== letter) {
      throw new BadRequestException(`Answer must start with letter ${letter}`);
    }
  }
}
