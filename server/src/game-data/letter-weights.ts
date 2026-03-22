// Letter difficulty weights and score multipliers
// Mirrors frontend src/data/letterWeights.ts

export interface LetterConfig {
  letter: string;
  weight: number;
  multiplier: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const LETTER_CONFIG: Record<string, LetterConfig> = {
  A: { letter: 'A', weight: 10, multiplier: 1.0, difficulty: 'easy' },
  B: { letter: 'B', weight: 10, multiplier: 1.0, difficulty: 'easy' },
  C: { letter: 'C', weight: 10, multiplier: 1.0, difficulty: 'easy' },
  D: { letter: 'D', weight: 8, multiplier: 1.1, difficulty: 'easy' },
  E: { letter: 'E', weight: 8, multiplier: 1.1, difficulty: 'easy' },
  F: { letter: 'F', weight: 7, multiplier: 1.2, difficulty: 'easy' },
  G: { letter: 'G', weight: 7, multiplier: 1.2, difficulty: 'easy' },
  H: { letter: 'H', weight: 6, multiplier: 1.3, difficulty: 'medium' },
  I: { letter: 'I', weight: 5, multiplier: 1.3, difficulty: 'medium' },
  J: { letter: 'J', weight: 4, multiplier: 1.5, difficulty: 'medium' },
  K: { letter: 'K', weight: 4, multiplier: 1.5, difficulty: 'medium' },
  L: { letter: 'L', weight: 7, multiplier: 1.2, difficulty: 'easy' },
  M: { letter: 'M', weight: 8, multiplier: 1.1, difficulty: 'easy' },
  N: { letter: 'N', weight: 6, multiplier: 1.3, difficulty: 'medium' },
  O: { letter: 'O', weight: 5, multiplier: 1.4, difficulty: 'medium' },
  P: { letter: 'P', weight: 8, multiplier: 1.1, difficulty: 'easy' },
  Q: { letter: 'Q', weight: 2, multiplier: 2.0, difficulty: 'hard' },
  R: { letter: 'R', weight: 7, multiplier: 1.2, difficulty: 'easy' },
  S: { letter: 'S', weight: 10, multiplier: 1.0, difficulty: 'easy' },
  T: { letter: 'T', weight: 8, multiplier: 1.1, difficulty: 'easy' },
  U: { letter: 'U', weight: 3, multiplier: 1.8, difficulty: 'hard' },
  V: { letter: 'V', weight: 3, multiplier: 1.8, difficulty: 'hard' },
  W: { letter: 'W', weight: 4, multiplier: 1.5, difficulty: 'medium' },
  X: { letter: 'X', weight: 2, multiplier: 2.5, difficulty: 'hard' },
  Y: { letter: 'Y', weight: 3, multiplier: 1.8, difficulty: 'hard' },
  Z: { letter: 'Z', weight: 2, multiplier: 2.0, difficulty: 'hard' },
};

export const ALL_LETTERS = Object.keys(LETTER_CONFIG);

export const HARDCORE_LETTERS = ALL_LETTERS.filter(
  (l) => LETTER_CONFIG[l].difficulty === 'hard',
);

export function selectWeightedLetter(hardcoreMode = false): string {
  const letters = hardcoreMode ? HARDCORE_LETTERS : ALL_LETTERS;
  const weights = letters.map((l) => LETTER_CONFIG[l].weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let random = Math.random() * totalWeight;
  for (let i = 0; i < letters.length; i++) {
    random -= weights[i];
    if (random <= 0) return letters[i];
  }

  return letters[letters.length - 1];
}

export function getLetterMultiplier(letter: string): number {
  return LETTER_CONFIG[letter.toUpperCase()]?.multiplier ?? 1.0;
}
