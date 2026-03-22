// Auth API calls
import api, { storeToken } from './apiClient';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    isGuest: boolean;
    avatar: string;
    level: number;
    xp: number;
    gamesPlayed: number;
    bestScore: number;
  };
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  await storeToken(data.access_token);
  return data;
}

export async function registerApi(
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    username,
    email,
    password,
  });
  await storeToken(data.access_token);
  return data;
}

export async function guestApi(): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/guest');
  await storeToken(data.access_token);
  return data;
}

export async function upgradeGuestApi(
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/upgrade', {
    username,
    email,
    password,
  });
  await storeToken(data.access_token);
  return data;
}
