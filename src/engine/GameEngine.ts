// Core Game Engine
import { Category, selectRandomCategories, CATEGORIES } from '../data/categories';
import { selectWeightedLetter, LETTER_CONFIG } from '../data/letterWeights';
import { validateAnswer, ValidationResult } from './AnswerValidator';
import { calculateScore, ScoreResult } from './Scoring';
import { GameMode } from '../theme/theme';
import { getCategoriesWithAnswers } from '../data/answers';

export interface GameSession {
  id: string;
  mode: GameMode;
  letter: string;
  categories: Category[];
  answers: Record<number, string>;           // categoryId -> user answer
  validations: Record<number, ValidationResult>; // categoryId -> validation
  timerDuration: number;  // 0 for relax
  timeUsed: number;
  startedAt: number;
  endedAt: number | null;
  score: ScoreResult | null;
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Get timer duration for game mode
function getTimerDuration(mode: GameMode): number {
  switch (mode) {
    case 'practice': return 30;
    case 'ranked': return 30;
    case 'daily': return 30;
    case 'relax': return 0;
    case 'hardcore': return 20;
    default: return 30;
  }
}

// Select letter based on mode
function selectLetterForMode(mode: GameMode): string {
  if (mode === 'hardcore') {
    return selectWeightedLetter(true); // hard letters only
  }
  return selectWeightedLetter(false);
}

// Select categories, preferring ones that have answers in our database
function selectCategoriesForGame(): Category[] {
  const categoriesWithAnswers = getCategoriesWithAnswers();
  const eligible = CATEGORIES.filter(c =>
    categoriesWithAnswers.includes(c.name)
  );
  
  if (eligible.length >= 10) {
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }
  
  return selectRandomCategories(10);
}

// Daily challenge: deterministic based on date
function getDailySeed(): number {
  const today = new Date();
  return today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getDailyChallenge(): { letter: string; categories: Category[] } {
  const seed = getDailySeed();
  const rand = seededRandom(seed);

  // Select letter deterministically
  const letters = Object.keys(LETTER_CONFIG);
  const letterIdx = Math.floor(rand() * letters.length);
  const letter = letters[letterIdx];

  // Select categories deterministically
  const categoriesWithAnswers = getCategoriesWithAnswers();
  const eligible = CATEGORIES.filter(c => categoriesWithAnswers.includes(c.name));
  const shuffled = [...eligible].sort(() => rand() - 0.5);
  const categories = shuffled.slice(0, 10);

  return { letter, categories };
}

// Start a new game
export function createGameSession(mode: GameMode): GameSession {
  let letter: string;
  let categories: Category[];

  if (mode === 'daily') {
    const daily = getDailyChallenge();
    letter = daily.letter;
    categories = daily.categories;
  } else {
    letter = selectLetterForMode(mode);
    categories = selectCategoriesForGame();
  }

  return {
    id: generateId(),
    mode,
    letter,
    categories,
    answers: {},
    validations: {},
    timerDuration: getTimerDuration(mode),
    timeUsed: 0,
    startedAt: Date.now(),
    endedAt: null,
    score: null,
  };
}

// Submit an answer for a category
export function submitAnswer(
  session: GameSession,
  categoryId: number,
  answer: string
): ValidationResult {
  const category = session.categories.find(c => c.id === categoryId);
  if (!category) {
    return { valid: false, confidence: 0, matchedAnswer: null, reason: 'no_match' };
  }

  const result = validateAnswer(category.name, session.letter, answer);
  session.answers[categoryId] = answer;
  session.validations[categoryId] = result;
  return result;
}

// End the game and calculate score
export function endGame(session: GameSession, timeUsed: number): ScoreResult {
  session.endedAt = Date.now();
  session.timeUsed = timeUsed;

  const correctCount = Object.values(session.validations).filter(v => v.valid).length;
  const score = calculateScore(
    correctCount,
    session.categories.length,
    session.letter,
    timeUsed,
    session.timerDuration
  );

  session.score = score;
  return score;
}
