import { apiClient } from './client';
import type {
  ListModerationSessionsQuery,
  ModerationMetrics,
  PaginatedModerationSessions,
  ReviewSessionPayload,
  SessionModerationDetail,
} from '../types/adminSessionModeration';

export async function getModerationMetricsApi(): Promise<ModerationMetrics> {
  const { data } = await apiClient.get<ModerationMetrics>('/admin/sessions/metrics');

  return data;
}

export async function listModerationSessionsApi(
  query: ListModerationSessionsQuery,
): Promise<PaginatedModerationSessions> {
  const { data } = await apiClient.get<PaginatedModerationSessions>(
    '/admin/sessions',
    {
      params: query,
    },
  );

  return data;
}

export async function getModerationSessionDetailApi(
  sessionId: string,
): Promise<SessionModerationDetail> {
  const { data } = await apiClient.get<SessionModerationDetail>(
    `/admin/sessions/${sessionId}`,
  );

  return data;
}

export async function reviewModerationSessionApi(
  sessionId: string,
  payload: ReviewSessionPayload,
) {
  const { data } = await apiClient.post(
    `/admin/sessions/${sessionId}/review`,
    payload,
  );

  return data;
}
