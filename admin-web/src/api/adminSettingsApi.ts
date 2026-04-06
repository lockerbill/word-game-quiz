import { apiClient } from './client';
import type {
  AdminSettingsRevision,
  PaginatedSettingsRevisions,
  RollbackAdminSettingsPayload,
  RollbackAdminSettingsResponse,
  RuntimeSettingsSnapshot,
  UpdateAdminSettingsPayload,
  UpdateAdminSettingsResponse,
} from '../types/adminSettings';

export async function getCurrentSettingsApi(): Promise<RuntimeSettingsSnapshot> {
  const { data } = await apiClient.get<RuntimeSettingsSnapshot>(
    '/admin/settings/current',
  );

  return data;
}

export async function listSettingsRevisionsApi(query: {
  page?: number;
  limit?: number;
}): Promise<PaginatedSettingsRevisions> {
  const { data } = await apiClient.get<PaginatedSettingsRevisions>(
    '/admin/settings/revisions',
    { params: query },
  );

  return data;
}

export async function getSettingsRevisionApi(
  revisionId: string,
): Promise<AdminSettingsRevision> {
  const { data } = await apiClient.get<AdminSettingsRevision>(
    `/admin/settings/revisions/${revisionId}`,
  );

  return data;
}

export async function updateSettingsApi(
  payload: UpdateAdminSettingsPayload,
): Promise<UpdateAdminSettingsResponse> {
  const { data } = await apiClient.patch<UpdateAdminSettingsResponse>(
    '/admin/settings',
    payload,
  );

  return data;
}

export async function rollbackSettingsApi(
  payload: RollbackAdminSettingsPayload,
): Promise<RollbackAdminSettingsResponse> {
  const { data } = await apiClient.post<RollbackAdminSettingsResponse>(
    '/admin/settings/rollback',
    payload,
  );

  return data;
}
