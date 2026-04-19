import { createDailyRandom, shuffleWithRandom } from './daily-rng';

describe('daily-rng', () => {
  it('returns deterministic random sequence for the same UTC day', () => {
    const day = new Date(Date.UTC(2026, 3, 19, 1, 0, 0));

    const randA = createDailyRandom(day);
    const randB = createDailyRandom(new Date(Date.UTC(2026, 3, 19, 23, 59, 59)));

    const sequenceA = Array.from({ length: 5 }, () => randA());
    const sequenceB = Array.from({ length: 5 }, () => randB());

    expect(sequenceA).toEqual(sequenceB);
  });

  it('varies daily letters across different UTC dates', () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const sampledLetters = new Set<string>();

    for (let i = 0; i < 60; i++) {
      const date = new Date(Date.UTC(2026, 0, i + 1));
      const rand = createDailyRandom(date);
      const letter = letters[Math.floor(rand() * letters.length)];
      sampledLetters.add(letter);
    }

    expect(sampledLetters.size).toBeGreaterThan(10);
  });

  it('shuffles deterministically when using the same day seed', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const day = new Date(Date.UTC(2026, 3, 19));

    const shuffleA = shuffleWithRandom(items, createDailyRandom(day));
    const shuffleB = shuffleWithRandom(items, createDailyRandom(day));

    expect(shuffleA).toEqual(shuffleB);
    expect(shuffleA).not.toEqual(items);
  });
});
