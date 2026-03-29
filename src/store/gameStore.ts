// Game State Store (Zustand) - manages active game session
import { create } from 'zustand';
import { GameSession, createGameSession, submitAnswer, endGame } from '../engine/GameEngine';
import { ValidationResult } from '../engine/AnswerValidator';
import { ScoreResult } from '../engine/Scoring';
import { GameMode } from '../theme/theme';
import { GameStartResponse, submitGameApi } from '../api/gameApi';
import { Category } from '../data/categories';

interface GameState {
  session: GameSession | null;
  serverGameId: string | null; // gameId from server (if online)
  submissionStatus: 'idle' | 'submitting' | 'submitted' | 'failed';
  timeRemaining: number;
  isPlaying: boolean;
  isFinished: boolean;

  // Actions
  startGame: (mode: GameMode) => void;
  startGameFromServer: (mode: GameMode, payload: GameStartResponse) => void;
  setServerGameId: (id: string) => void;
  setAnswer: (categoryId: number, answer: string) => ValidationResult | null;
  tick: () => void;
  finishGame: () => ScoreResult | null;
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

  startGame: (mode: GameMode) => {
    const session = createGameSession(mode);
    set({
      session,
      serverGameId: null,
      submissionStatus: 'idle',
      timeRemaining: session.timerDuration,
      isPlaying: true,
      isFinished: false,
    });
  },

  startGameFromServer: (mode: GameMode, payload: GameStartResponse) => {
    const categories: Category[] = payload.categories.map((category) => ({
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
    if (!session || get().isFinished) return null;
    const result = submitAnswer(session, categoryId, answer);
    set({ session: { ...session } }); // trigger re-render
    return result;
  },

  tick: () => {
    const { timeRemaining, session } = get();
    if (!session || session.timerDuration === 0) return; // no timer in relax
    if (timeRemaining <= 1) {
      get().finishGame();
    } else {
      set({ timeRemaining: timeRemaining - 1 });
    }
  },

  setTimeRemaining: (t: number) => set({ timeRemaining: t }),

  finishGame: () => {
    const { session, timeRemaining, serverGameId } = get();
    if (!session) return null;
    const timeUsed = session.timerDuration > 0
      ? session.timerDuration - timeRemaining
      : Math.round((Date.now() - session.startedAt) / 1000);
    const score = endGame(session, timeUsed);
    set({
      session: { ...session },
      isPlaying: false,
      isFinished: true,
      submissionStatus: serverGameId ? 'submitting' : 'failed',
    });

    // Submit to server in background, then replace local score/validations with server truth
    if (serverGameId) {
      const answers = session.categories.map((cat) => ({
        categoryId: cat.id,
        answer: session.answers[cat.id] || '',
      }));
      submitGameApi(serverGameId, answers, timeUsed)
        .then((response) => {
          const currentSession = get().session;
          if (!currentSession || currentSession.id !== session.id) return;

          const nextSession: GameSession = {
            ...currentSession,
            score: response.score,
            validations: response.validations.reduce((acc, item) => {
              acc[item.categoryId] = {
                valid: item.valid,
                confidence: item.confidence,
                matchedAnswer: null,
                reason: item.valid ? 'fuzzy_match' : 'no_match',
              };
              return acc;
            }, {} as Record<number, ValidationResult>),
          };

          set({
            session: nextSession,
            submissionStatus: 'submitted',
          });
        })
        .catch(() => {
          const currentSession = get().session;
          if (!currentSession || currentSession.id !== session.id) return;
          set({ submissionStatus: 'failed' });
        });
    }

    return score;
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
