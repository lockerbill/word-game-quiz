import { apiClient } from './client';
import type { AdminSession, AuthResponse } from '../types/admin';

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  });

  return data;
}

export async function getAdminSessionApi(): Promise<AdminSession> {
  const { data } = await apiClient.get<AdminSession>('/admin/me');
  return data;
}
