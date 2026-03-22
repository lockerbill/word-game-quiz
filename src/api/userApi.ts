// User API calls
import api from './apiClient';

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  isGuest: boolean;
  avatar: string;
  level: number;
  xp: number;
  gamesPlayed: number;
  bestScore: number;
  totalScore: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

export interface UserStats {
  level: number;
  xp: number;
  xpInLevel: number;
  xpRequired: number;
  xpProgress: number;
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  averageScore: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  modeStats: {
    mode: string;
    gamesPlayed: number;
    bestScore: number;
    averageScore: number;
  }[];
}

export async function getProfileApi(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/user/profile');
  return data;
}

export async function getStatsApi(): Promise<UserStats> {
  const { data } = await api.get<UserStats>('/user/stats');
  return data;
}

export async function getHistoryApi(
  limit = 20,
): Promise<any[]> {
  const { data } = await api.get('/user/history', { params: { limit } });
  return data;
}
