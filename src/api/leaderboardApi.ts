// Leaderboard API calls
import api from './apiClient';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  level: number;
  score: number;
  mode: string;
  letter: string;
  date: string;
}

export async function getGlobalLeaderboard(
  limit = 100,
): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>('/leaderboard/global', {
    params: { limit },
  });
  return data;
}

export async function getWeeklyLeaderboard(
  limit = 100,
): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>('/leaderboard/weekly', {
    params: { limit },
  });
  return data;
}

export async function getDailyLeaderboard(
  limit = 100,
): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>('/leaderboard/daily', {
    params: { limit },
  });
  return data;
}
