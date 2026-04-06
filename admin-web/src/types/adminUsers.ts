import type { UserRole } from './admin';

export type UserAccountStatus = 'active' | 'suspended';

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  isGuest: boolean;
  avatar: string;
  role: UserRole;
  accountStatus: UserAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListAdminUsersQuery {
  search?: string;
  role?: UserRole;
  accountStatus?: UserAccountStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedAdminUsers {
  page: number;
  limit: number;
  total: number;
  data: AdminUser[];
}

export interface UpdateUserRolePayload {
  role: UserRole;
  reason: string;
}

export interface UpdateUserStatusPayload {
  accountStatus: UserAccountStatus;
  reason: string;
}

export interface UpdateUserPasswordPayload {
  password: string;
  reason: string;
}
