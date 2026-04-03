import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  private getClient(): Redis {
    if (!this.client) {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });
      this.client.connect().catch(() => {
        // Redis is optional - leaderboard falls back to DB queries
        console.warn('Redis connection failed - caching disabled');
        this.client = null;
      });
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      return await client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      if (ttlSeconds) {
        await client.set(key, value, 'EX', ttlSeconds);
      } else {
        await client.set(key, value);
      }
    } catch {
      // Silently fail - caching is best-effort
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      await client.del(key);
    } catch {
      // Silently fail
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
