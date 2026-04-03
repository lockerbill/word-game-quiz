// Game API calls
import api from './apiClient';

export interface GameStartResponse {
  gameId: string;
  letter: string;
  categories: {
    id: number;
    name: string;
    emoji: string;
    difficulty: number;
  }[];
  timerDuration: number;
}

export interface GameSubmitResponse {
  gameId: string;
  score: {
    correctCount: number;
    totalQuestions: number;
    rawScore: number;
    multiplier: number;
    finalScore: number;
    xpEarned: number;
    timeBonus: number;
    perfectBonus: boolean;
  };
  validations: {
    categoryId: number;
    categoryName: string;
    answer: string;
    valid: boolean;
    confidence: number;
    reason?:
      | 'exact_match'
      | 'fuzzy_match'
      | 'no_match'
      | 'wrong_letter'
      | 'empty'
      | 'ai_validated'
      | 'ai_rejected'
      | 'ai_error';
    provider?: string | null;
  }[];
}

export interface DailyChallengeResponse {
  letter: string;
  categories: {
    id: number;
    name: string;
    emoji: string;
    difficulty: number;
  }[];
  date: string;
}

export async function startGameApi(
  mode: string,
): Promise<GameStartResponse> {
  const { data } = await api.post<GameStartResponse>('/game/start', { mode });
  return data;
}

export async function submitGameApi(
  gameId: string,
  answers: { categoryId: number; answer: string }[],
  timeUsed: number,
): Promise<GameSubmitResponse> {
  const { data } = await api.post<GameSubmitResponse>('/game/submit', {
    gameId,
    answers,
    timeUsed,
  });
  return data;
}

export async function getDailyApi(): Promise<DailyChallengeResponse> {
  const { data } = await api.get<DailyChallengeResponse>('/game/daily');
  return data;
}
