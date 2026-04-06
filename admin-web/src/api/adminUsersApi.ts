import { apiClient } from './client';
import type {
  ListAdminUsersQuery,
  PaginatedAdminUsers,
  UpdateUserPasswordPayload,
  UpdateUserRolePayload,
  UpdateUserStatusPayload,
} from '../types/adminUsers';

export async function listAdminUsersApi(
  query: ListAdminUsersQuery,
): Promise<PaginatedAdminUsers> {
  const { data } = await apiClient.get<PaginatedAdminUsers>('/admin/users', {
    params: query,
  });

  return data;
}

export async function updateUserRoleApi(
  userId: string,
  payload: UpdateUserRolePayload,
) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/role`, payload);
  return data;
}

export async function updateUserStatusApi(
  userId: string,
  payload: UpdateUserStatusPayload,
) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/status`, payload);
  return data;
}

export async function updateUserPasswordApi(
  userId: string,
  payload: UpdateUserPasswordPayload,
) {
  const { data } = await apiClient.patch(
    `/admin/users/${userId}/password`,
    payload,
  );
  return data;
}
