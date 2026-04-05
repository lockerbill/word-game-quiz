import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Game } from '../entities/game.entity.js';
import { getLevelFromXP, LEVEL_THRESHOLDS } from '../game-data/scoring.js';

interface AverageScoreRow {
  avg: string | null;
}

interface ModeStatsRow {
  mode: string;
  count: string;
  best: string;
  avg: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isGuest: user.isGuest,
      role: user.role,
      accountStatus: user.accountStatus,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      gamesPlayed: user.gamesPlayed,
      bestScore: user.bestScore,
      totalScore: user.totalScore,
      perfectGames: user.perfectGames,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      createdAt: user.createdAt,
    };
  }

  async getStats(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const level = getLevelFromXP(user.xp);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000;
    const xpInLevel = user.xp - currentThreshold;
    const xpRequired = nextThreshold - currentThreshold;

    // Calculate average score
    const avgResult = await this.gameRepo
      .createQueryBuilder('game')
      .select('AVG(game.score)', 'avg')
      .where('game.userId = :userId', { userId })
      .getRawOne<AverageScoreRow>();

    // Mode breakdown
    const modeStats = await this.gameRepo
      .createQueryBuilder('game')
      .select('game.mode', 'mode')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(game.score)', 'best')
      .addSelect('AVG(game.score)', 'avg')
      .where('game.userId = :userId', { userId })
      .groupBy('game.mode')
      .getRawMany<ModeStatsRow>();

    return {
      level: user.level,
      xp: user.xp,
      xpInLevel,
      xpRequired,
      xpProgress: Math.min(xpInLevel / xpRequired, 1),
      gamesPlayed: user.gamesPlayed,
      totalScore: user.totalScore,
      bestScore: user.bestScore,
      averageScore: Math.round(parseFloat(avgResult?.avg || '0')),
      perfectGames: user.perfectGames,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      modeStats: modeStats.map((m) => ({
        mode: m.mode,
        gamesPlayed: Number.parseInt(m.count, 10),
        bestScore: Number.parseInt(m.best, 10),
        averageScore: Math.round(parseFloat(m.avg || '0')),
      })),
    };
  }

  async getHistory(userId: string, limit = 20) {
    const games = await this.gameRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['answers'],
    });

    return games.map((g) => ({
      id: g.id,
      mode: g.mode,
      letter: g.letter,
      score: g.score,
      correctCount: g.correctCount,
      multiplier: g.multiplier,
      timeUsed: g.timeUsed,
      xpEarned: g.xpEarned,
      date: g.createdAt.toISOString(),
      answers: g.answers.map((a) => ({
        categoryId: a.categoryId,
        answer: a.answer,
        valid: a.valid,
        confidence: a.confidence,
      })),
    }));
  }
}
