import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity.js';
import { Answer } from '../entities/answer.entity.js';
import { CATEGORIES } from '../game-data/categories.js';
import { ANSWERS } from '../game-data/answers.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedCategories();
    await this.seedAnswers();
  }

  private async seedCategories() {
    const existing = await this.categoryRepo.count();
    if (existing >= CATEGORIES.length) {
      this.logger.log(
        `Categories already seeded (${existing} rows). Skipping.`,
      );
      return;
    }

    this.logger.log(`Seeding ${CATEGORIES.length} categories...`);

    // Upsert each category with its explicit ID
    for (const cat of CATEGORIES) {
      await this.categoryRepo
        .createQueryBuilder()
        .insert()
        .into(Category)
        .values({
          id: cat.id,
          name: cat.name,
          difficulty: cat.difficulty,
          emoji: cat.emoji,
          enabled: true,
        })
        .orIgnore() // skip if already exists (ON CONFLICT DO NOTHING)
        .execute();
    }

    const count = await this.categoryRepo.count();
    this.logger.log(`Categories seeded: ${count} rows.`);
  }

  private async seedAnswers() {
    const existing = await this.answerRepo.count();
    if (existing > 0) {
      this.logger.log(`Answers already seeded (${existing} rows). Skipping.`);
      return;
    }

    this.logger.log('Seeding answers...');

    // Build a map of category name -> category ID
    const categoryMap = new Map<string, number>();
    for (const cat of CATEGORIES) {
      categoryMap.set(cat.name, cat.id);
    }

    // Batch insert answers per category
    let totalInserted = 0;
    for (const [categoryName, letterMap] of Object.entries(ANSWERS)) {
      const categoryId = categoryMap.get(categoryName);
      if (!categoryId) continue;

      const rows: { categoryId: number; letter: string; answer: string }[] = [];
      for (const [letter, answers] of Object.entries(letterMap)) {
        for (const answer of answers) {
          rows.push({ categoryId, letter: letter.toUpperCase(), answer });
        }
      }

      if (rows.length === 0) continue;

      // Insert in chunks of 500 to avoid query size limits
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await this.answerRepo
          .createQueryBuilder()
          .insert()
          .into(Answer)
          .values(chunk)
          .orIgnore()
          .execute();
      }

      totalInserted += rows.length;
    }

    this.logger.log(`Answers seeded: ${totalInserted} rows.`);
  }
}
