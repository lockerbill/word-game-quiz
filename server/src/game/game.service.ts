import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../entities/game.entity.js';
import { GameAnswer } from '../entities/game-answer.entity.js';
import { User } from '../entities/user.entity.js';
import { StartGameDto, SubmitGameDto } from './dto/game.dto.js';
import {
  CATEGORIES,
  getCategoryById,
  type CategoryData,
} from '../game-data/categories.js';
import {
  LETTER_CONFIG,
  selectWeightedLetter,
} from '../game-data/letter-weights.js';
import { getCategoriesWithAnswers } from '../game-data/answers.js';
import { validateAnswer } from '../game-data/answer-validator.js';
import {
  calculateScore,
  getLevelFromXP,
  type ScoreResult,
} from '../game-data/scoring.js';

// In-memory pending games (could be Redis for multi-server)
interface PendingGame {
  gameId: string;
  userId: string;
  mode: string;
  letter: string;
  categories: CategoryData[];
  timerDuration: number;
  createdAt: number;
}

const pendingGames = new Map<string, PendingGame>();

// Clean up expired pending games (older than 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [id, game] of pendingGames) {
    if (now - game.createdAt > 5 * 60 * 1000) {
      pendingGames.delete(id);
    }
  }
}, 60_000);

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    @InjectRepository(GameAnswer)
    private gameAnswerRepo: Repository<GameAnswer>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async startGame(userId: string, dto: StartGameDto) {
    const { mode } = dto;

    let letter: string;
    let categories: CategoryData[];

    if (mode === 'daily') {
      const daily = this.getDailyChallenge();
      letter = daily.letter;
      categories = daily.categories;
    } else {
      letter = selectWeightedLetter(mode === 'hardcore');
      categories = this.selectCategoriesForGame();
    }

    const timerDuration = this.getTimerDuration(mode);
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
    }[] = [];

    for (const cat of pending.categories) {
      const submitted = dto.answers.find((a) => a.categoryId === cat.id);
      const userAnswer = submitted?.answer ?? '';

      const result = validateAnswer(cat.name, pending.letter, userAnswer);
      validations.push({
        categoryId: cat.id,
        categoryName: cat.name,
        answer: userAnswer,
        valid: result.valid,
        confidence: result.confidence,
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
    await this.updateUserStats(userId, score, pending.mode);

    return {
      gameId: savedGame.id,
      score,
      validations: validations.map((v) => ({
        categoryId: v.categoryId,
        categoryName: v.categoryName,
        answer: v.answer,
        valid: v.valid,
        confidence: v.confidence,
      })),
    };
  }

  async getDaily() {
    const daily = this.getDailyChallenge();
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

  private getTimerDuration(mode: string): number {
    switch (mode) {
      case 'practice':
        return 30;
      case 'ranked':
        return 30;
      case 'daily':
        return 30;
      case 'relax':
        return 0;
      case 'hardcore':
        return 20;
      default:
        return 30;
    }
  }

  private selectCategoriesForGame(): CategoryData[] {
    const categoriesWithAnswers = getCategoriesWithAnswers();
    const eligible = CATEGORIES.filter((c) =>
      categoriesWithAnswers.includes(c.name),
    );

    if (eligible.length >= 10) {
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 10);
    }

    // Fallback: random from all categories
    const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }

  private getDailyChallenge(): {
    letter: string;
    categories: CategoryData[];
  } {
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();
    const rand = this.seededRandom(seed);

    const letters = Object.keys(LETTER_CONFIG);
    const letterIdx = Math.floor(rand() * letters.length);
    const letter = letters[letterIdx];

    const categoriesWithAnswers = getCategoriesWithAnswers();
    const eligible = CATEGORIES.filter((c) =>
      categoriesWithAnswers.includes(c.name),
    );
    const shuffled = [...eligible].sort(() => rand() - 0.5);
    const categories = shuffled.slice(0, 10);

    return { letter, categories };
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  private generateId(): string {
    return (
      Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
    );
  }

  private async updateUserStats(
    userId: string,
    score: ScoreResult,
    mode: string,
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
