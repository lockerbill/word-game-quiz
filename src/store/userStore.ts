// User State Store (Zustand) - manages profile, XP, achievements, history, auth
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLevelFromXP, getXPProgress } from '../engine/Scoring';
import { checkAchievements, PlayerStats, Achievement, ACHIEVEMENTS } from '../gamification/Achievements';
import { ScoreResult } from '../engine/Scoring';
import { GameMode } from '../theme/theme';
import { guestApi, loginApi, registerApi, upgradeGuestApi, AuthResponse } from '../api/authApi';
import { getToken, clearToken } from '../api/apiClient';
import { getProfileApi } from '../api/userApi';

export interface GameRecord {
  id: string;
  mode: GameMode;
  letter: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  timeUsed: number;
  date: string;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

interface UserState {
  // Auth state
  token: string | null;
  serverId: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  email: string | null;

  // Profile state
  username: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  fastestGame: number;
  uniqueLettersPlayed: string[];
  hardcoreGamesWon: number;
  dailyChallengesCompleted: number;
  unlockedAchievements: string[];
  newAchievements: Achievement[];
  gameHistory: GameRecord[];
  leaderboard: LeaderboardEntry[];
  dailyPlayedDate: string | null;
  isLoaded: boolean;

  // Actions
  initAuth: () => Promise<void>;
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  setUsername: (name: string) => void;
  recordGame: (record: GameRecord, score: ScoreResult, mode: GameMode, letter: string) => void;
  clearNewAchievements: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  upgradeGuest: (username: string, email: string, password: string) => Promise<void>;
  recoverGuestSession: () => Promise<void>;
  expireSession: () => Promise<void>;
  logout: () => Promise<void>;
  syncFromServer: () => Promise<void>;
}

const STORAGE_KEY = '@alpha_bucks_user';

function applyAuthResponse(set: any, data: AuthResponse) {
  set({
    token: data.access_token,
    serverId: data.user.id,
    isAuthenticated: true,
    isGuest: data.user.isGuest,
    email: data.user.email,
    username: data.user.username,
    level: data.user.level,
    xp: data.user.xp,
    gamesPlayed: data.user.gamesPlayed,
    bestScore: data.user.bestScore,
  });
}

export const useUserStore = create<UserState>((set, get) => ({
  // Auth defaults
  token: null,
  serverId: null,
  isAuthenticated: false,
  isGuest: true,
  email: null,

  // Profile defaults
  username: 'Player',
  xp: 0,
  level: 1,
  gamesPlayed: 0,
  totalScore: 0,
  bestScore: 0,
  perfectGames: 0,
  currentStreak: 0,
  longestStreak: 0,
  fastestGame: 0,
  uniqueLettersPlayed: [],
  hardcoreGamesWon: 0,
  dailyChallengesCompleted: 0,
  unlockedAchievements: [],
  newAchievements: [],
  gameHistory: [],
  leaderboard: [],
  dailyPlayedDate: null,
  isLoaded: false,

  // Initialize auth: load local data, then try to authenticate with server
  initAuth: async () => {
    // Step 1: Load cached data first for fast startup
    await get().loadData();

    // Step 2: Check if we have an existing token
    try {
      const existingToken = await getToken();
      if (existingToken) {
        // We have a token — try to sync profile from server
        set({ token: existingToken, isAuthenticated: true });
        try {
          await get().syncFromServer();
        } catch {
          // Server unreachable — continue with cached data
        }
        return;
      }

      // Step 3: No token — create guest account silently
      const data = await guestApi();
      applyAuthResponse(set, data);
      get().saveData();
    } catch {
      // Server unreachable on first launch — app works locally
      set({ isAuthenticated: false });
    }
  },

  loadData: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({ ...parsed, isLoaded: true, newAchievements: [] });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  saveData: async () => {
    try {
      const state = get();
      const toSave = {
        username: state.username,
        email: state.email,
        serverId: state.serverId,
        isGuest: state.isGuest,
        xp: state.xp,
        level: state.level,
        gamesPlayed: state.gamesPlayed,
        totalScore: state.totalScore,
        bestScore: state.bestScore,
        perfectGames: state.perfectGames,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        fastestGame: state.fastestGame,
        uniqueLettersPlayed: state.uniqueLettersPlayed,
        hardcoreGamesWon: state.hardcoreGamesWon,
        dailyChallengesCompleted: state.dailyChallengesCompleted,
        unlockedAchievements: state.unlockedAchievements,
        gameHistory: state.gameHistory.slice(0, 100), // keep last 100
        leaderboard: state.leaderboard,
        dailyPlayedDate: state.dailyPlayedDate,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  },

  setUsername: (name: string) => {
    set({ username: name });
    get().saveData();
  },

  recordGame: (record: GameRecord, score: ScoreResult, mode: GameMode, letter: string) => {
    const state = get();
    const isWin = score.correctCount >= 7; // 7+ correct = win
    const newXP = state.xp + score.xpEarned;
    const newLevel = getLevelFromXP(newXP);
    const newStreak = isWin ? state.currentStreak + 1 : 0;
    const newLetters = state.uniqueLettersPlayed.includes(letter)
      ? state.uniqueLettersPlayed
      : [...state.uniqueLettersPlayed, letter];

    const updates: Partial<UserState> = {
      xp: newXP,
      level: newLevel,
      gamesPlayed: state.gamesPlayed + 1,
      totalScore: state.totalScore + score.finalScore,
      bestScore: Math.max(state.bestScore, score.finalScore),
      perfectGames: state.perfectGames + (score.perfectBonus ? 1 : 0),
      currentStreak: newStreak,
      longestStreak: Math.max(state.longestStreak, newStreak),
      fastestGame: state.fastestGame === 0
        ? record.timeUsed
        : Math.min(state.fastestGame, record.timeUsed),
      uniqueLettersPlayed: newLetters,
      hardcoreGamesWon: state.hardcoreGamesWon + (mode === 'hardcore' && isWin ? 1 : 0),
      dailyChallengesCompleted: state.dailyChallengesCompleted + (mode === 'daily' ? 1 : 0),
      gameHistory: [record, ...state.gameHistory].slice(0, 100),
    };

    if (mode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      updates.dailyPlayedDate = today;
    }

    // Check new achievements
    const stats: PlayerStats = {
      gamesPlayed: updates.gamesPlayed!,
      totalScore: updates.totalScore!,
      bestScore: updates.bestScore!,
      perfectGames: updates.perfectGames!,
      currentStreak: updates.currentStreak!,
      longestStreak: updates.longestStreak!,
      fastestGame: updates.fastestGame!,
      totalXP: updates.xp!,
      level: updates.level!,
      uniqueLettersPlayed: updates.uniqueLettersPlayed!,
      hardcoreGamesWon: updates.hardcoreGamesWon!,
      dailyChallengesCompleted: updates.dailyChallengesCompleted!,
    };

    const newlyUnlocked = checkAchievements(stats, state.unlockedAchievements);
    if (newlyUnlocked.length > 0) {
      updates.unlockedAchievements = [
        ...state.unlockedAchievements,
        ...newlyUnlocked.map(a => a.id),
      ];
      updates.newAchievements = newlyUnlocked;
    }

    // Update local leaderboard
    const entry: LeaderboardEntry = {
      name: state.username,
      score: score.finalScore,
      level: updates.level!,
      date: new Date().toISOString(),
    };
    updates.leaderboard = [entry, ...(state.leaderboard || [])].slice(0, 50);

    set(updates as any);
    get().saveData();
  },

  clearNewAchievements: () => set({ newAchievements: [] }),

  login: async (email: string, password: string) => {
    const data = await loginApi(email, password);
    applyAuthResponse(set, data);
    await get().syncFromServer();
    get().saveData();
  },

  register: async (username: string, email: string, password: string) => {
    const data = await registerApi(username, email, password);
    applyAuthResponse(set, data);
    get().saveData();
  },

  upgradeGuest: async (username: string, email: string, password: string) => {
    const data = await upgradeGuestApi(username, email, password);
    applyAuthResponse(set, data);
    get().saveData();
  },

  recoverGuestSession: async () => {
    const data = await guestApi();
    applyAuthResponse(set, data);
    await get().saveData();
  },

  expireSession: async () => {
    await clearToken();
    set({
      token: null,
      isAuthenticated: false,
    });
    await get().saveData();
  },

  logout: async () => {
    await clearToken();
    set({
      token: null,
      serverId: null,
      isAuthenticated: false,
      isGuest: true,
      email: null,
    });
    get().saveData();
  },

  syncFromServer: async () => {
    try {
      const profile = await getProfileApi();
      set({
        serverId: profile.id,
        isGuest: profile.isGuest,
        email: profile.email,
        username: profile.username,
        level: profile.level,
        xp: profile.xp,
        gamesPlayed: profile.gamesPlayed,
        bestScore: profile.bestScore,
        totalScore: profile.totalScore,
        perfectGames: profile.perfectGames,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
      });
    } catch {
      // Server unreachable — keep local data
    }
  },
}));
