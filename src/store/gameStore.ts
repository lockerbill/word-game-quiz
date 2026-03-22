// Game State Store (Zustand) - manages active game session
import { create } from 'zustand';
import { GameSession, createGameSession, submitAnswer, endGame } from '../engine/GameEngine';
import { ValidationResult } from '../engine/AnswerValidator';
import { ScoreResult } from '../engine/Scoring';
import { GameMode } from '../theme/theme';
import { submitGameApi } from '../api/gameApi';

interface GameState {
  session: GameSession | null;
  serverGameId: string | null; // gameId from server (if online)
  timeRemaining: number;
  isPlaying: boolean;
  isFinished: boolean;

  // Actions
  startGame: (mode: GameMode) => void;
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
  timeRemaining: 0,
  isPlaying: false,
  isFinished: false,

  startGame: (mode: GameMode) => {
    const session = createGameSession(mode);
    set({
      session,
      serverGameId: null,
      timeRemaining: session.timerDuration,
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
    set({ session: { ...session }, isPlaying: false, isFinished: true });

    // Submit to server in background (fire-and-forget, offline-safe)
    if (serverGameId) {
      const answers = session.categories.map((cat) => ({
        categoryId: cat.id,
        answer: session.answers[cat.id] || '',
      }));
      submitGameApi(serverGameId, answers, timeUsed).catch(() => {
        // Server unreachable — score is already recorded locally
      });
    }

    return score;
  },

  resetGame: () => {
    set({
      session: null,
      serverGameId: null,
      timeRemaining: 0,
      isPlaying: false,
      isFinished: false,
    });
  },
}));
