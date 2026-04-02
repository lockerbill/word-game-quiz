// Scoring System

export interface ScoreResult {
  correctCount: number;
  totalQuestions: number;
  rawScore: number;
  multiplier: number;
  finalScore: number;
  xpEarned: number;
  timeBonus: number;
  perfectBonus: boolean;
}

// XP Level Thresholds
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,       // 1-10
  4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300, // 11-20
  19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800, // 21-30
  43700, 46700, 49800, 53000, 56300, 59700, 63200, 66800, 70500, 74300, // 31-40
  78200, 82200, 86300, 90500, 94800, 99200, 103700, 108300, 113000, 117800, // 41-50
];

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPProgress(xp: number): { current: number; required: number; percentage: number } {
  const level = getLevelFromXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000;
  const current = xp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  return { current, required, percentage: Math.min(current / required, 1) };
}
