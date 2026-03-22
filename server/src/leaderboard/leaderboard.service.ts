import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Game } from '../entities/game.entity.js';
import { User } from '../entities/user.entity.js';
import { RedisService } from '../redis/redis.service.js';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  level: number;
  score: number;
  mode: string;
  letter: string;
  date: string;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private redis: RedisService,
  ) {}

  async getGlobal(limit = 100): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:global:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const entries = await this.queryLeaderboard(undefined, limit);
    await this.redis.set(cacheKey, JSON.stringify(entries), 60);
    return entries;
  }

  async getWeekly(limit = 100): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:weekly:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const entries = await this.queryLeaderboard(weekAgo, limit);
    await this.redis.set(cacheKey, JSON.stringify(entries), 60);
    return entries;
  }

  async getDaily(limit = 100): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:daily:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const entries = await this.queryLeaderboard(todayStart, limit, 'daily');
    await this.redis.set(cacheKey, JSON.stringify(entries), 30); // shorter TTL for daily
    return entries;
  }

  private async queryLeaderboard(
    since?: Date,
    limit = 100,
    mode?: string,
  ): Promise<LeaderboardEntry[]> {
    const qb = this.gameRepo
      .createQueryBuilder('game')
      .innerJoin('game.user', 'user')
      .select([
        'game.id',
        'game.userId',
        'game.score',
        'game.mode',
        'game.letter',
        'game.createdAt',
        'user.username',
        'user.avatar',
        'user.level',
        'user.isGuest',
      ])
      // Only show registered users on leaderboard
      .where('user.isGuest = :isGuest', { isGuest: false })
      .orderBy('game.score', 'DESC')
      .limit(limit);

    if (since) {
      qb.andWhere('game.createdAt >= :since', { since });
    }

    if (mode) {
      qb.andWhere('game.mode = :mode', { mode });
    }

    const games = await qb.getMany();

    return games.map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      username: g.user.username,
      avatar: g.user.avatar,
      level: g.user.level,
      score: g.score,
      mode: g.mode,
      letter: g.letter,
      date: g.createdAt.toISOString(),
    }));
  }
}
