import { apiClient } from './client';
import type { AdminAuditLog } from '../types/adminAudit';

export async function listAdminAuditLogsApi(
  limit: number,
): Promise<AdminAuditLog[]> {
  const { data } = await apiClient.get<AdminAuditLog[]>('/admin/audit-logs', {
    params: { limit },
  });

  return data;
}
