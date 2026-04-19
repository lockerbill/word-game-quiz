import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminSettingsService } from '../admin-settings/admin-settings.service.js';
import { Game } from '../entities/game.entity.js';
import { GameAnswer } from '../entities/game-answer.entity.js';
import { User } from '../entities/user.entity.js';
import { Category } from '../entities/category.entity.js';
import { Answer } from '../entities/answer.entity.js';
import { StartGameDto, SubmitGameDto } from './dto/game.dto.js';
import {
  LETTER_CONFIG,
  selectWeightedLetter,
} from '../game-data/letter-weights.js';
import { validateAnswer } from '../game-data/answer-validator.js';
import {
  calculateScore,
  getLevelFromXP,
  type ScoreResult,
} from '../game-data/scoring.js';
import { AiValidationService } from '../ai-validation/ai-validation.service.js';
import type { ValidationReason } from '../ai-validation/ai-validation.types.js';
import { createDailyRandom, shuffleWithRandom } from './daily-rng.js';

// In-memory pending games (could be Redis for multi-server)
interface PendingGame {
  gameId: string;
  userId: string;
  mode: string;
  letter: string;
  categories: Pick<Category, 'id' | 'name' | 'difficulty' | 'emoji'>[];
  timerDuration: number;
  createdAt: number;
}

const pendingGames = new Map<string, PendingGame>();

// Clean up expired pending games (older than 5 minutes)
const pendingGamesCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, game] of pendingGames) {
    if (now - game.createdAt > 5 * 60 * 1000) {
      pendingGames.delete(id);
    }
  }
}, 60_000);

pendingGamesCleanupInterval.unref();

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    @InjectRepository(GameAnswer)
    private gameAnswerRepo: Repository<GameAnswer>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    private adminSettingsService: AdminSettingsService,
    private aiValidationService: AiValidationService,
  ) {}

  async startGame(userId: string, dto: StartGameDto) {
    const { mode } = dto;
    const runtimeSettings =
      await this.adminSettingsService.getRuntimeSettings();

    let letter: string;
    let categories: Pick<Category, 'id' | 'name' | 'difficulty' | 'emoji'>[];

    if (mode === 'daily') {
      const daily = await this.getDailyChallenge();
      letter = daily.letter;
      categories = daily.categories;
    } else {
      letter = selectWeightedLetter(mode === 'hardcore');
      categories = await this.selectCategoriesForGame(
        runtimeSettings.game.categoriesPerGame,
      );
    }

    const timerDuration = this.getTimerDuration(
      mode,
      runtimeSettings.game.timerSecondsByMode,
    );
    const gameId = this.generateId();

    // Store pending game
    pendingGames.set(gameId, {
      gameId,
      userId,
      mode,
      letter,
      categories,
      timerDuration,
      createdAt: Date.now(),
    });

    return {
      gameId,
      letter,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        difficulty: c.difficulty,
      })),
      timerDuration,
    };
  }

  async submitGame(userId: string, dto: SubmitGameDto) {
    const pending = pendingGames.get(dto.gameId);
    if (!pending) {
      throw new NotFoundException('Game session not found or expired');
    }
    if (pending.userId !== userId) {
      throw new BadRequestException('Game does not belong to this user');
    }

    pendingGames.delete(dto.gameId);

    // Server-side validation of each answer
    const validations: {
      categoryId: number;
      categoryName: string;
      answer: string;
      valid: boolean;
      confidence: number;
      reason: ValidationReason;
      provider: string | null;
      matchedAnswer: string | null;
      correctAnswers: string[];
    }[] = [];

    const categoryIds = pending.categories.map((c) => c.id);
    const answers = await this.answerRepo.find({
      where: {
        categoryId: In(categoryIds),
        letter: pending.letter.toUpperCase(),
      },
    });

    const answerMap = new Map<number, string[]>();
    for (const row of answers) {
      const existing = answerMap.get(row.categoryId) || [];
      existing.push(row.answer);
      answerMap.set(row.categoryId, existing);
    }

    for (const cat of pending.categories) {
      const submitted = dto.answers.find((a) => a.categoryId === cat.id);
      const userAnswer = submitted?.answer ?? '';

      const knownAnswers = answerMap.get(cat.id) || [];
      const correctAnswers = Array.from(
        new Map(
          knownAnswers.map((answer) => [answer.toLowerCase(), answer]),
        ).values(),
      ).sort((a, b) => a.localeCompare(b));
      const result = validateAnswer(pending.letter, userAnswer, knownAnswers);
      let finalValid = result.valid;
      let finalConfidence = result.confidence;
      let finalReason: ValidationReason = result.reason;
      let finalProvider: string | null = null;
      const finalMatchedAnswer: string | null = result.matchedAnswer;

      if (result.reason === 'no_match' && userAnswer.trim()) {
        const aiResult = await this.aiValidationService.validateUnknownAnswer({
          letter: pending.letter,
          categoryName: cat.name,
          answer: userAnswer,
          knownAnswers,
        });
        finalValid = aiResult.valid;
        finalConfidence = aiResult.confidence;
        finalReason = aiResult.reason;
        finalProvider = aiResult.provider;
      }

      validations.push({
        categoryId: cat.id,
        categoryName: cat.name,
        answer: userAnswer,
        valid: finalValid,
        confidence: finalConfidence,
        reason: finalReason,
        provider: finalProvider,
        matchedAnswer: finalMatchedAnswer,
        correctAnswers,
      });
    }

    const correctCount = validations.filter((v) => v.valid).length;

    // Calculate score
    const score = calculateScore(
      correctCount,
      pending.categories.length,
      pending.letter,
      dto.timeUsed,
      pending.timerDuration,
    );

    // Persist game record
    const game = this.gameRepo.create({
      userId,
      mode: pending.mode,
      letter: pending.letter,
      score: score.finalScore,
      correctCount: score.correctCount,
      multiplier: score.multiplier,
      timeUsed: dto.timeUsed,
      xpEarned: score.xpEarned,
    });
    const savedGame = await this.gameRepo.save(game);

    // Persist individual answers
    const gameAnswers = validations.map((v) =>
      this.gameAnswerRepo.create({
        gameId: savedGame.id,
        categoryId: v.categoryId,
        answer: v.answer,
        valid: v.valid,
        confidence: v.confidence,
      }),
    );
    await this.gameAnswerRepo.save(gameAnswers);

    // Update user stats
    await this.updateUserStats(userId, score);

    return {
      gameId: savedGame.id,
      score,
      validations: validations.map((v) => ({
        categoryId: v.categoryId,
        categoryName: v.categoryName,
        answer: v.answer,
        valid: v.valid,
        confidence: v.confidence,
        reason: v.reason,
        provider: v.provider,
        matchedAnswer: v.matchedAnswer,
        correctAnswers: v.correctAnswers,
      })),
    };
  }

  async getDaily() {
    const daily = await this.getDailyChallenge();
    return {
      letter: daily.letter,
      categories: daily.categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        difficulty: c.difficulty,
      })),
      date: new Date().toISOString().split('T')[0],
    };
  }

  // --- Private helpers ---

  private getTimerDuration(
    mode: string,
    timerSecondsByMode: {
      practice: number;
      ranked: number;
      daily: number;
      relax: number;
      hardcore: number;
    },
  ): number {
    switch (mode) {
      case 'practice':
        return timerSecondsByMode.practice;
      case 'ranked':
        return timerSecondsByMode.ranked;
      case 'daily':
        return timerSecondsByMode.daily;
      case 'relax':
        return timerSecondsByMode.relax;
      case 'hardcore':
        return timerSecondsByMode.hardcore;
      default:
        return timerSecondsByMode.practice;
    }
  }

  private async selectCategoriesForGame(
    categoriesPerGame: number,
  ): Promise<Pick<Category, 'id' | 'name' | 'difficulty' | 'emoji'>[]> {
    const categories = await this.categoryRepo
      .createQueryBuilder('category')
      .innerJoin('category.answers', 'answer')
      .where('category.enabled = :enabled', { enabled: true })
      .select([
        'category.id',
        'category.name',
        'category.difficulty',
        'category.emoji',
      ])
      .groupBy('category.id')
      .addGroupBy('category.name')
      .addGroupBy('category.difficulty')
      .addGroupBy('category.emoji')
      .orderBy('RANDOM()')
      .limit(categoriesPerGame)
      .getMany();

    if (categories.length < categoriesPerGame) {
      throw new NotFoundException(
        'Not enough categories with answers in database',
      );
    }

    return categories;
  }

  private async getDailyChallenge(): Promise<{
    letter: string;
    categories: Pick<Category, 'id' | 'name' | 'difficulty' | 'emoji'>[];
  }> {
    const runtimeSettings =
      await this.adminSettingsService.getRuntimeSettings();
    const categoriesPerGame = runtimeSettings.game.categoriesPerGame;

    const today = new Date();
    const rand = createDailyRandom(today);

    const letters = Object.keys(LETTER_CONFIG);
    const letterIdx = Math.floor(rand() * letters.length);
    const letter = letters[letterIdx];

    const eligible = await this.categoryRepo
      .createQueryBuilder('category')
      .innerJoin('category.answers', 'answer')
      .where('category.enabled = :enabled', { enabled: true })
      .select([
        'category.id',
        'category.name',
        'category.difficulty',
        'category.emoji',
      ])
      .distinct(true)
      .orderBy('category.id', 'ASC')
      .getMany();
    const shuffled = shuffleWithRandom(eligible, rand);
    const categories = shuffled.slice(0, categoriesPerGame);

    if (categories.length < categoriesPerGame) {
      throw new NotFoundException(
        'Not enough categories with answers in database',
      );
    }

    return { letter, categories };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private async updateUserStats(
    userId: string,
    score: ScoreResult,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const isWin = score.correctCount >= 7;

    user.xp += score.xpEarned;
    user.level = getLevelFromXP(user.xp);
    user.gamesPlayed += 1;
    user.totalScore += score.finalScore;
    user.bestScore = Math.max(user.bestScore, score.finalScore);
    user.perfectGames += score.perfectBonus ? 1 : 0;
    user.currentStreak = isWin ? user.currentStreak + 1 : 0;
    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);

    await this.userRepo.save(user);
  }
}
