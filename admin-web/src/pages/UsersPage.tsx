import { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  listAdminUsersApi,
  updateUserPasswordApi,
  updateUserRoleApi,
  updateUserStatusApi,
} from '../api/adminUsersApi';
import { useAuth } from '../auth/useAuth';
import type {
  AdminUser,
  PaginatedAdminUsers,
  UserAccountStatus,
} from '../types/adminUsers';
import type { UserRole } from '../types/admin';

const roleOptions: UserRole[] = ['player', 'moderator', 'admin', 'super_admin'];
const accountStatusOptions: UserAccountStatus[] = ['active', 'suspended'];
const usersPageLimit = 20;

interface FilterState {
  search: string;
  role: '' | UserRole;
  accountStatus: '' | UserAccountStatus;
}

function extractApiError(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  const responseMessage = error.response?.data?.message;
  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ');
  }

  if (typeof responseMessage === 'string') {
    return responseMessage;
  }

  const status = error.response?.status;
  if (status) {
    return `${fallback} (HTTP ${status})`;
  }

  return fallback;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString();
}

export function UsersPage() {
  const { session } = useAuth();

  const [usersResponse, setUsersResponse] = useState<PaginatedAdminUsers>({
    page: 1,
    limit: usersPageLimit,
    total: 0,
    data: [],
  });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationBusyUserId, setMutationBusyUserId] = useState<string | null>(null);

  const [filtersInput, setFiltersInput] = useState<FilterState>({
    search: '',
    role: '',
    accountStatus: '',
  });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: '',
    accountStatus: '',
  });
  const [page, setPage] = useState(1);

  const [pendingRoleByUserId, setPendingRoleByUserId] = useState<
    Record<string, UserRole>
  >({});
  const [pendingStatusByUserId, setPendingStatusByUserId] = useState<
    Record<string, UserAccountStatus>
  >({});

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await listAdminUsersApi({
        search: filters.search || undefined,
        role: filters.role || undefined,
        accountStatus: filters.accountStatus || undefined,
        page,
        limit: usersPageLimit,
      });

      setUsersResponse(response);

      setPendingRoleByUserId((current) => {
        const next = { ...current };
        for (const user of response.data) {
          next[user.id] = next[user.id] ?? user.role;
        }

        return next;
      });

      setPendingStatusByUserId((current) => {
        const next = { ...current };
        for (const user of response.data) {
          next[user.id] = next[user.id] ?? user.accountStatus;
        }

        return next;
      });
    } catch (error) {
      setUsersError(extractApiError(error, 'Unable to load users right now.'));
    } finally {
      setUsersLoading(false);
    }
  }, [filters.accountStatus, filters.role, filters.search, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleUpdateRole(user: AdminUser) {
    const nextRole = pendingRoleByUserId[user.id] ?? user.role;
    if (nextRole === user.role) {
      return;
    }

    const reason = window.prompt(`Reason for changing ${user.username}'s role?`);
    if (!reason) {
      return;
    }

    setMutationError(null);
    setMutationBusyUserId(user.id);

    try {
      await updateUserRoleApi(user.id, {
        role: nextRole,
        reason,
      });

      await loadUsers();
    } catch (error) {
      setMutationError(extractApiError(error, 'Unable to update user role.'));
    } finally {
      setMutationBusyUserId(null);
    }
  }

  async function handleUpdateStatus(user: AdminUser) {
    const nextStatus = pendingStatusByUserId[user.id] ?? user.accountStatus;
    if (nextStatus === user.accountStatus) {
      return;
    }

    const reason = window.prompt(
      `Reason for changing ${user.username}'s account status?`,
    );
    if (!reason) {
      return;
    }

    setMutationError(null);
    setMutationBusyUserId(user.id);

    try {
      await updateUserStatusApi(user.id, {
        accountStatus: nextStatus,
        reason,
      });

      await loadUsers();
    } catch (error) {
      setMutationError(
        extractApiError(error, 'Unable to update user account status.'),
      );
    } finally {
      setMutationBusyUserId(null);
    }
  }

  async function handleResetPassword(user: AdminUser) {
    const password = window.prompt(`Enter a new password for ${user.username}:`);
    if (!password) {
      return;
    }

    if (password.length < 6) {
      setMutationError('Password must be at least 6 characters long.');
      return;
    }

    const reason = window.prompt(`Reason for resetting ${user.username}'s password?`);
    if (!reason) {
      return;
    }

    setMutationError(null);
    setMutationBusyUserId(user.id);

    try {
      await updateUserPasswordApi(user.id, {
        password,
        reason,
      });

      await loadUsers();
    } catch (error) {
      setMutationError(extractApiError(error, 'Unable to reset user password.'));
    } finally {
      setMutationBusyUserId(null);
    }
  }

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters({
      search: filtersInput.search.trim(),
      role: filtersInput.role,
      accountStatus: filtersInput.accountStatus,
    });
  }

  const pageCount = Math.max(1, Math.ceil(usersResponse.total / usersResponse.limit));

  return (
    <section className="panel content-panel">
      <header className="content-header">
        <div>
          <h2>User Management</h2>
          <p className="muted">
            Search users and update role/status via <code>/api/admin/users</code>.
          </p>
        </div>
      </header>

      <article className="panel-subsection">
        <form className="toolbar users-toolbar" onSubmit={handleFilterSubmit}>
          <input
            placeholder="Search username or email"
            value={filtersInput.search}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            maxLength={100}
          />

          <select
            value={filtersInput.role}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                role: event.target.value as '' | UserRole,
              }))
            }
          >
            <option value="">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            value={filtersInput.accountStatus}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                accountStatus: event.target.value as '' | UserAccountStatus,
              }))
            }
          >
            <option value="">All statuses</option>
            {accountStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button type="submit">Apply</button>
        </form>

        {usersError ? <p className="error-text">{usersError}</p> : null}
        {mutationError ? <p className="error-text">{mutationError}</p> : null}
        {usersLoading ? <p className="muted">Loading users...</p> : null}

        {!usersLoading && usersResponse.data.length === 0 ? (
          <p className="muted">No users found for current filters.</p>
        ) : null}

        {usersResponse.data.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersResponse.data.map((user) => {
                  const isBusy = mutationBusyUserId === user.id;
                  const selectedRole = pendingRoleByUserId[user.id] ?? user.role;
                  const selectedStatus =
                    pendingStatusByUserId[user.id] ?? user.accountStatus;
                  const isSelf = session?.id === user.id;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <strong>{user.username}</strong>
                          <span className="muted">{user.email ?? 'No email'}</span>
                          <code>{user.id.slice(0, 8)}</code>
                        </div>
                      </td>
                      <td>
                        <select
                          value={selectedRole}
                          onChange={(event) =>
                            setPendingRoleByUserId((current) => ({
                              ...current,
                              [user.id]: event.target.value as UserRole,
                            }))
                          }
                          disabled={isBusy}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={selectedStatus}
                          onChange={(event) =>
                            setPendingStatusByUserId((current) => ({
                              ...current,
                              [user.id]: event.target.value as UserAccountStatus,
                            }))
                          }
                          disabled={isBusy}
                        >
                          {accountStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{user.isGuest ? 'Guest' : 'Registered'}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{formatDate(user.updatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void handleUpdateRole(user)}
                            disabled={isBusy || selectedRole === user.role}
                          >
                            {isBusy ? 'Saving...' : 'Save role'}
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void handleUpdateStatus(user)}
                            disabled={isBusy || selectedStatus === user.accountStatus}
                          >
                            {isBusy ? 'Saving...' : 'Save status'}
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void handleResetPassword(user)}
                            disabled={isBusy}
                          >
                            {isBusy ? 'Saving...' : 'Reset password'}
                          </button>
                        </div>
                        {isSelf ? (
                          <p className="muted tiny-note">
                            You are viewing your own account.
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="pagination-row">
          <p className="muted">
            Page {usersResponse.page} of {pageCount}
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={page <= 1 || usersLoading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={page >= pageCount || usersLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
