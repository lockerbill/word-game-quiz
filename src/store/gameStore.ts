// Game State Store (Zustand) - manages active game session
import { create } from 'zustand';
import { GameSession, createGameSession, submitAnswer, endGame } from '../engine/GameEngine';
import { ValidationResult } from '../engine/AnswerValidator';
import { ScoreResult } from '../engine/Scoring';
import { GameMode } from '../theme/theme';

interface GameState {
  session: GameSession | null;
  timeRemaining: number;
  isPlaying: boolean;
  isFinished: boolean;

  // Actions
  startGame: (mode: GameMode) => void;
  setAnswer: (categoryId: number, answer: string) => ValidationResult | null;
  tick: () => void;
  finishGame: () => ScoreResult | null;
  resetGame: () => void;
  setTimeRemaining: (t: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  timeRemaining: 0,
  isPlaying: false,
  isFinished: false,

  startGame: (mode: GameMode) => {
    const session = createGameSession(mode);
    set({
      session,
      timeRemaining: session.timerDuration,
      isPlaying: true,
      isFinished: false,
    });
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
    const { session, timeRemaining } = get();
    if (!session) return null;
    const timeUsed = session.timerDuration > 0
      ? session.timerDuration - timeRemaining
      : Math.round((Date.now() - session.startedAt) / 1000);
    const score = endGame(session, timeUsed);
    set({ session: { ...session }, isPlaying: false, isFinished: true });
    return score;
  },

  resetGame: () => {
    set({ session: null, timeRemaining: 0, isPlaying: false, isFinished: false });
  },
}));
