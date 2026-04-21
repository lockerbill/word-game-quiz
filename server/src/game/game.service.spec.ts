import type { Repository } from 'typeorm';
import type { AdminSettingsService } from '../admin-settings/admin-settings.service';
import type { Category } from '../entities/category.entity';
import type { Game } from '../entities/game.entity';
import type { GameAnswer } from '../entities/game-answer.entity';
import type { User } from '../entities/user.entity';
import type { Answer } from '../entities/answer.entity';
import type { AiValidationService } from '../ai-validation/ai-validation.service';
import { GameService } from './game.service';

describe('GameService daily challenge', () => {
  const buildCategory = (
    id: number,
  ): Pick<Category, 'id' | 'name' | 'difficulty' | 'emoji'> => ({
    id,
    name: `Category ${id}`,
    difficulty: id % 2 === 0 ? 'easy' : 'medium',
    emoji: 'target',
  });

  const buildCategoryRepo = (
    categories: Pick<Category, 'id' | 'name' | 'difficulty' | 'emoji'>[],
  ) => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(categories),
    };

    return {
      repo: {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      } as unknown as Repository<Category>,
      qb,
    };
  };

  const buildService = (categoriesPerGame = 10) => {
    const categories = Array.from({ length: 20 }, (_, i) =>
      buildCategory(i + 1),
    );
    const { repo: categoryRepo } = buildCategoryRepo(categories);

    const adminSettingsService = {
      getRuntimeSettings: jest.fn().mockResolvedValue({
        game: {
          categoriesPerGame,
          timerSecondsByMode: {
            practice: 60,
            ranked: 45,
            daily: 30,
            relax: 90,
            hardcore: 20,
          },
        },
      }),
    } as unknown as AdminSettingsService;

    const aiValidationService = {
      validateUnknownAnswer: jest.fn(),
    } as unknown as AiValidationService;

    const service = new GameService(
      {} as Repository<Game>,
      {} as Repository<GameAnswer>,
      {} as Repository<User>,
      categoryRepo,
      {} as Repository<Answer>,
      adminSettingsService,
      aiValidationService,
    );

    return { service };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the same daily challenge for repeated calls on the same UTC day', async () => {
    const { service } = buildService();
    jest.setSystemTime(new Date(Date.UTC(2026, 3, 19, 10, 0, 0)));

    const first = await service.getDaily();
    const second = await service.getDaily();

    expect(first.letter).toBe(second.letter);
    expect(first.categories).toEqual(second.categories);
    expect(first.date).toBe('2026-04-19');
    expect(first.categories).toHaveLength(10);
  });

  it('changes daily letter across UTC days', async () => {
    const { service } = buildService();
    const letters = new Set<string>();

    for (let day = 0; day < 30; day++) {
      jest.setSystemTime(new Date(Date.UTC(2026, 0, 1 + day, 12, 0, 0)));
      const daily = await service.getDaily();
      letters.add(daily.letter);
    }

    expect(letters.size).toBeGreaterThan(10);
  });
});
