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
import {
  ContentImportJob,
  type ContentImportJobStatus,
} from '../entities/content-import-job.entity.js';
import type { User } from '../entities/user.entity.js';
import { ApplyImportJobDto } from './dto/apply-import-job.dto.js';
import { CreateImportJobDto } from './dto/create-import-job.dto.js';
import { ListImportJobsQueryDto } from './dto/list-import-jobs-query.dto.js';

interface AdminActor {
  id: string;
  role: User['role'];
}

interface ImportRow {
  rowNumber: number;
  categoryName: string;
  difficulty: number;
  emoji: string;
  enabled: boolean;
  letter: string;
  answer: string;
}

interface ImportIssue {
  rowNumber: number;
  field: string;
  message: string;
}

interface ValidationResult {
  rows: ImportRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  totalRows: number;
}

@Injectable()
export class AdminContentImportService {
  constructor(
    @InjectRepository(ContentImportJob)
    private importJobRepo: Repository<ContentImportJob>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    private adminAuditLogService: AdminAuditLogService,
  ) {}

  async createImportJob(actor: AdminActor, dto: CreateImportJobDto) {
    if (dto.payload.length > 2_000_000) {
      throw new BadRequestException('Import payload too large (max 2MB)');
    }

    const validation = this.validatePayload(dto.format, dto.payload);
    const status: ContentImportJobStatus =
      validation.errors.length > 0 ? 'failed_validation' : 'validated';

    const job = new ContentImportJob();
    job.createdByUserId = actor.id;
    job.status = status;
    job.format = dto.format;
    job.dryRun = dto.dryRun ?? true;
    job.reason = dto.reason;
    job.sourcePayload = dto.payload;
    job.summary = {
      totalRows: validation.totalRows,
      validRows: validation.rows.length,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    };
    job.validationErrors = validation.errors;
    job.validationWarnings = validation.warnings;
    job.applyResult = null;
    job.appliedAt = null;

    const saved = await this.importJobRepo.save(job);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.import.validate',
      targetType: 'content_import_job',
      targetId: saved.id,
      reason: dto.reason,
      beforeState: null,
      afterState: {
        status: saved.status,
        summary: saved.summary,
      },
      metadata: {
        format: dto.format,
        dryRun: saved.dryRun,
      },
    });

    return saved;
  }

  async listImportJobs(query: ListImportJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.importJobRepo
      .createQueryBuilder('job')
      .orderBy('job.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (query.status) {
      qb.andWhere('job.status = :status', { status: query.status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async getImportJob(jobId: string) {
    const job = await this.importJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return job;
  }

  async applyImportJob(
    actor: AdminActor,
    jobId: string,
    dto: ApplyImportJobDto,
  ) {
    const job = await this.importJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    if (job.status === 'applied') {
      throw new ConflictException('Import job already applied');
    }

    if (job.status !== 'validated') {
      throw new BadRequestException('Only validated jobs can be applied');
    }

    const validation = this.validatePayload(job.format, job.sourcePayload);
    if (validation.errors.length > 0) {
      throw new BadRequestException(
        'Import payload no longer validates; create a new job',
      );
    }

    const beforeState = {
      status: job.status,
      applyResult: job.applyResult,
      appliedAt: job.appliedAt,
    };

    const result = await this.applyRows(validation.rows);
    job.status = 'applied';
    job.applyResult = result;
    job.appliedAt = new Date();
    job.reason = dto.reason;
    const saved = await this.importJobRepo.save(job);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'content.import.apply',
      targetType: 'content_import_job',
      targetId: saved.id,
      reason: dto.reason,
      beforeState,
      afterState: {
        status: saved.status,
        applyResult: saved.applyResult,
        appliedAt: saved.appliedAt,
      },
    });

    return saved;
  }

  private validatePayload(
    format: 'csv' | 'json',
    payload: string,
  ): ValidationResult {
    const rawRows =
      format === 'json'
        ? this.parseJsonRows(payload)
        : this.parseCsvRows(payload);

    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];
    const rows: ImportRow[] = [];
    const seen = new Set<string>();

    for (const raw of rawRows) {
      const rowNumber = Number(raw.rowNumber);
      try {
        const categoryName = this.normalizeSpaces(
          raw.categoryName,
          'categoryName',
        );
        const difficulty = this.parseDifficulty(raw.difficulty);
        const emoji = this.normalizeEmoji(raw.emoji);
        const enabled = this.parseEnabled(raw.enabled);
        const letter = this.normalizeLetter(raw.letter);
        const answer = this.normalizeAnswer(raw.answer);

        this.ensureStartsWithLetter(answer, letter);

        const dedupeKey = `${categoryName.toLowerCase()}|${letter}|${answer.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          warnings.push({
            rowNumber,
            field: 'answer',
            message:
              'Duplicate row in import payload; skipping duplicate entry',
          });
          continue;
        }

        seen.add(dedupeKey);
        rows.push({
          rowNumber,
          categoryName,
          difficulty,
          emoji,
          enabled,
          letter,
          answer,
        });
      } catch (error) {
        errors.push({
          rowNumber,
          field: 'row',
          message:
            error instanceof Error ? error.message : 'Unknown validation error',
        });
      }
    }

    return {
      rows,
      errors,
      warnings,
      totalRows: rawRows.length,
    };
  }

  private async applyRows(rows: ImportRow[]) {
    const categoryCache = new Map<string, Category>();
    const categoryIdCache = new Map<number, Category>();
    let categoryCreated = 0;
    let answerCreated = 0;
    let answerSkippedDuplicate = 0;

    let nextCategoryId = await this.getNextCategoryId();

    for (const row of rows) {
      const key = row.categoryName.toLowerCase();
      let category: Category | null = categoryCache.get(key) ?? null;

      if (!category) {
        category = await this.categoryRepo
          .createQueryBuilder('category')
          .where('LOWER(category.name) = LOWER(:name)', {
            name: row.categoryName,
          })
          .getOne();

        if (!category) {
          category = this.categoryRepo.create({
            id: nextCategoryId,
            name: row.categoryName,
            difficulty: row.difficulty,
            emoji: row.emoji,
            enabled: row.enabled,
          });
          category = await this.categoryRepo.save(category);
          categoryCreated += 1;
          nextCategoryId += 1;
        }

        categoryCache.set(key, category);
      }

      categoryIdCache.set(category.id, category);

      const duplicate = await this.answerRepo
        .createQueryBuilder('answer')
        .where('answer.categoryId = :categoryId', { categoryId: category.id })
        .andWhere('answer.letter = :letter', { letter: row.letter })
        .andWhere('LOWER(TRIM(answer.answer)) = LOWER(TRIM(:answer))', {
          answer: row.answer,
        })
        .getOne();

      if (duplicate) {
        answerSkippedDuplicate += 1;
        continue;
      }

      const answer = this.answerRepo.create({
        categoryId: category.id,
        letter: row.letter,
        answer: row.answer,
      });
      await this.answerRepo.save(answer);
      answerCreated += 1;
    }

    return {
      importedRows: rows.length,
      categoriesCreated: categoryCreated,
      answersCreated: answerCreated,
      answersSkippedDuplicate: answerSkippedDuplicate,
      categoriesTouched: categoryIdCache.size,
    };
  }

  private parseJsonRows(payload: string): Array<Record<string, unknown>> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON payload must be an array of rows');
    }

    return parsed.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new BadRequestException(
          `Invalid JSON row at index ${index}: row must be an object`,
        );
      }

      const obj = row as Record<string, unknown>;
      return {
        rowNumber: index + 1,
        categoryName: this.pickString(obj, [
          'categoryName',
          'category',
          'name',
        ]),
        difficulty: this.pickString(obj, ['difficulty', 'categoryDifficulty']),
        emoji: this.pickString(obj, ['emoji', 'categoryEmoji']),
        enabled: this.pickString(obj, ['enabled', 'categoryEnabled']),
        letter: this.pickString(obj, ['letter']),
        answer: this.pickString(obj, ['answer']),
      };
    });
  }

  private parseCsvRows(payload: string): Array<Record<string, unknown>> {
    const lines = payload
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV payload must include header and rows');
    }

    const headers = this.parseCsvLine(lines[0]);
    const indexByHeader = new Map<string, number>();
    headers.forEach((header, index) => {
      indexByHeader.set(header.trim(), index);
    });

    const requiredHeaders = ['categoryName', 'letter', 'answer'];
    for (const header of requiredHeaders) {
      if (!indexByHeader.has(header)) {
        throw new BadRequestException(
          `CSV header missing required field: ${header}`,
        );
      }
    }

    const rows: Array<Record<string, unknown>> = [];
    for (let i = 1; i < lines.length; i += 1) {
      const values = this.parseCsvLine(lines[i]);
      const getValue = (name: string) => {
        const index = indexByHeader.get(name);
        if (typeof index !== 'number') {
          return '';
        }

        return values[index] ?? '';
      };

      rows.push({
        rowNumber: i,
        categoryName: getValue('categoryName'),
        difficulty: getValue('difficulty'),
        emoji: getValue('emoji'),
        enabled: getValue('enabled'),
        letter: getValue('letter'),
        answer: getValue('answer'),
      });
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  private pickString(row: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return '';
  }

  private normalizeSpaces(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private normalizeLetter(value: unknown): string {
    const letter = this.normalizeSpaces(value, 'letter').toUpperCase();
    if (!/^[A-Z]$/.test(letter)) {
      throw new BadRequestException(
        'letter must be a single alphabet character',
      );
    }

    return letter;
  }

  private normalizeAnswer(value: unknown): string {
    const answer = this.normalizeSpaces(value, 'answer');
    if (answer.length > 200) {
      throw new BadRequestException('answer exceeds 200 characters');
    }

    return answer;
  }

  private parseDifficulty(value: unknown): number {
    if (typeof value === 'undefined' || value === null || value === '') {
      return 1;
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new BadRequestException(
        'difficulty must be an integer between 1 and 5',
      );
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
      throw new BadRequestException(
        'difficulty must be an integer between 1 and 5',
      );
    }

    return parsed;
  }

  private parseEnabled(value: unknown): boolean {
    if (typeof value === 'undefined' || value === null || value === '') {
      return true;
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new BadRequestException('enabled must be true/false');
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }

    throw new BadRequestException('enabled must be true/false');
  }

  private normalizeEmoji(value: unknown): string {
    if (typeof value === 'undefined' || value === null || value === '') {
      return '📝';
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new BadRequestException('emoji must be a string');
    }

    const emoji = this.normalizeSpaces(String(value), 'emoji');
    return emoji.slice(0, 16);
  }

  private ensureStartsWithLetter(answer: string, letter: string): void {
    const firstChar = answer.trim().charAt(0).toUpperCase();
    if (firstChar !== letter) {
      throw new BadRequestException(`answer must start with letter ${letter}`);
    }
  }

  private async getNextCategoryId(): Promise<number> {
    const last = await this.categoryRepo
      .createQueryBuilder('category')
      .orderBy('category.id', 'DESC')
      .limit(1)
      .getOne();

    return (last?.id ?? 0) + 1;
  }
}
