// Achievements System
export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  fastestGame: number; // seconds
  totalXP: number;
  level: number;
  uniqueLettersPlayed: string[];
  hardcoreGamesWon: number;
  dailyChallengesCompleted: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_game',
    name: 'First Steps',
    description: 'Complete your first game',
    emoji: '🎯',
    condition: (s) => s.gamesPlayed >= 1,
  },
  {
    id: 'ten_games',
    name: 'Getting Started',
    description: 'Play 10 games',
    emoji: '🔟',
    condition: (s) => s.gamesPlayed >= 10,
  },
  {
    id: 'fifty_games',
    name: 'Dedicated Player',
    description: 'Play 50 games',
    emoji: '🏅',
    condition: (s) => s.gamesPlayed >= 50,
  },
  {
    id: 'hundred_games',
    name: 'Veteran',
    description: 'Play 100 games',
    emoji: '🎖️',
    condition: (s) => s.gamesPlayed >= 100,
  },
  {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Get 10/10 in a game',
    emoji: '💯',
    condition: (s) => s.perfectGames >= 1,
  },
  {
    id: 'five_perfects',
    name: 'Perfectionist',
    description: 'Get 5 perfect scores',
    emoji: '⭐',
    condition: (s) => s.perfectGames >= 5,
  },
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Win 3 games in a row',
    emoji: '🔥',
    condition: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak_10',
    name: 'Unstoppable',
    description: '10 win streak',
    emoji: '💪',
    condition: (s) => s.longestStreak >= 10,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Finish a game in under 15 seconds',
    emoji: '⚡',
    condition: (s) => s.fastestGame > 0 && s.fastestGame <= 15,
  },
  {
    id: 'word_master',
    name: 'Word Master',
    description: 'Reach level 10',
    emoji: '📚',
    condition: (s) => s.level >= 10,
  },
  {
    id: 'word_legend',
    name: 'Word Legend',
    description: 'Reach level 25',
    emoji: '👑',
    condition: (s) => s.level >= 25,
  },
  {
    id: 'alphabet_explorer',
    name: 'Alphabet Explorer',
    description: 'Play with 20 different letters',
    emoji: '🔤',
    condition: (s) => s.uniqueLettersPlayed.length >= 20,
  },
  {
    id: 'alphabet_master',
    name: 'Alphabet Master',
    description: 'Play with all 26 letters',
    emoji: '🅰️',
    condition: (s) => s.uniqueLettersPlayed.length >= 26,
  },
  {
    id: 'hardcore_hero',
    name: 'Hardcore Hero',
    description: 'Win 5 hardcore games',
    emoji: '💀',
    condition: (s) => s.hardcoreGamesWon >= 5,
  },
  {
    id: 'daily_devotee',
    name: 'Daily Devotee',
    description: 'Complete 7 daily challenges',
    emoji: '📅',
    condition: (s) => s.dailyChallengesCompleted >= 7,
  },
];

export function checkAchievements(stats: PlayerStats, unlockedIds: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(
    a => !unlockedIds.includes(a.id) && a.condition(stats)
  );
}
