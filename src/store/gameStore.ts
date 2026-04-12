// Game State Store (Zustand) - manages active game session
import { create } from 'zustand';
import type { ValidationResult } from '../engine/AnswerValidator';
import type { ScoreResult } from '../engine/Scoring';
import { GameMode } from '../theme/theme';
import { GameStartResponse, submitGameApi } from '../api/gameApi';
import { useUserStore } from './userStore';

interface SessionCategory {
  id: number;
  name: string;
  emoji: string;
  difficulty: 1 | 2 | 3;
}

interface GameSession {
  id: string;
  mode: GameMode;
  letter: string;
  categories: SessionCategory[];
  answers: Record<number, string>;
  validations: Record<number, ValidationResult>;
  timerDuration: number;
  timeUsed: number;
  startedAt: number;
  endedAt: number | null;
  score: ScoreResult | null;
}

interface GameState {
  session: GameSession | null;
  serverGameId: string | null; // gameId from server (if online)
  submissionStatus: 'idle' | 'submitting' | 'submitted' | 'failed';
  timeRemaining: number;
  isPlaying: boolean;
  isFinished: boolean;

  // Actions
  startGameFromServer: (mode: GameMode, payload: GameStartResponse) => void;
  setServerGameId: (id: string) => void;
  setAnswer: (categoryId: number, answer: string) => void;
  tick: () => void;
  finishGame: () => Promise<ScoreResult | null>;
  resetGame: () => void;
  setTimeRemaining: (t: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  serverGameId: null,
  submissionStatus: 'idle',
  timeRemaining: 0,
  isPlaying: false,
  isFinished: false,

  startGameFromServer: (mode: GameMode, payload: GameStartResponse) => {
    const categories: SessionCategory[] = payload.categories.map((category) => ({
      id: category.id,
      name: category.name,
      emoji: category.emoji,
      difficulty: category.difficulty === 3 ? 3 : category.difficulty === 2 ? 2 : 1,
    }));

    const session: GameSession = {
      id: payload.gameId,
      mode,
      letter: payload.letter,
      categories,
      answers: {},
      validations: {},
      timerDuration: payload.timerDuration,
      timeUsed: 0,
      startedAt: Date.now(),
      endedAt: null,
      score: null,
    };

    set({
      session,
      serverGameId: payload.gameId,
      submissionStatus: 'idle',
      timeRemaining: payload.timerDuration,
      isPlaying: true,
      isFinished: false,
    });
  },

  setServerGameId: (id: string) => {
    set({ serverGameId: id });
  },

  setAnswer: (categoryId: number, answer: string) => {
    const { session } = get();
    if (!session || get().isFinished) return;

    const nextSession: GameSession = {
      ...session,
      answers: {
        ...session.answers,
        [categoryId]: answer,
      },
    };
    set({ session: nextSession });
  },

  tick: () => {
    const { timeRemaining, session } = get();
    if (!session || session.timerDuration === 0) return; // no timer in relax
    if (timeRemaining <= 1) {
      void get().finishGame();
    } else {
      set({ timeRemaining: timeRemaining - 1 });
    }
  },

  setTimeRemaining: (t: number) => set({ timeRemaining: t }),

  finishGame: async () => {
    const { session, timeRemaining, serverGameId } = get();
    if (!session || !serverGameId) return null;
    const timeUsed = session.timerDuration > 0
      ? session.timerDuration - timeRemaining
      : Math.round((Date.now() - session.startedAt) / 1000);

    const answers = session.categories.map((cat) => ({
      categoryId: cat.id,
      answer: session.answers[cat.id] || '',
    }));

    set({
      isPlaying: false,
      isFinished: false,
      submissionStatus: 'submitting',
    });

    const applySubmission = (response: Awaited<ReturnType<typeof submitGameApi>>) => {
      const currentSession = get().session;
      if (!currentSession || currentSession.id !== session.id) {
        return null;
      }

      const nextSession: GameSession = {
        ...currentSession,
        timeUsed,
        endedAt: Date.now(),
        score: response.score,
        validations: response.validations.reduce((acc, item) => {
          acc[item.categoryId] = {
            valid: item.valid,
            confidence: item.confidence,
            matchedAnswer: item.matchedAnswer ?? null,
            correctAnswers: item.correctAnswers ?? [],
            provider: item.provider ?? null,
            reason: item.reason || (item.valid ? 'fuzzy_match' : 'no_match'),
          };
          return acc;
        }, {} as Record<number, ValidationResult>),
      };

      set({
        session: nextSession,
        isFinished: true,
        submissionStatus: 'submitted',
      });

      return response.score;
    };

    try {
      const response = await submitGameApi(serverGameId, answers, timeUsed);
      return applySubmission(response);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        const userState = useUserStore.getState();

        if (userState.isGuest) {
          try {
            await userState.recoverGuestSession();
            const response = await submitGameApi(serverGameId, answers, timeUsed);
            return applySubmission(response);
          } catch {
            // Fall through to failed submission state below.
          }
        } else {
          await userState.expireSession();
        }
      }

      const currentSession = get().session;
      if (!currentSession || currentSession.id !== session.id) return null;
      set({ submissionStatus: 'failed' });
      return null;
    }
  },

  resetGame: () => {
    set({
      session: null,
      serverGameId: null,
      submissionStatus: 'idle',
      timeRemaining: 0,
      isPlaying: false,
      isFinished: false,
    });
  },
}));
