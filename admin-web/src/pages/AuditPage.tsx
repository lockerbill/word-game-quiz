import { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { listAdminAuditLogsApi } from '../api/adminAuditApi';
import type { AdminAuditLog } from '../types/adminAudit';

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

export function AuditPage() {
  const [limit, setLimit] = useState(50);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listAdminAuditLogsApi(limit);
      setLogs(response);
    } catch (error) {
      setError(extractApiError(error, 'Unable to load audit logs right now.'));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <section className="panel content-panel">
      <header className="content-header">
        <div>
          <h2>Audit Logs</h2>
          <p className="muted">
            Explore recent admin mutations from <code>/api/admin/audit-logs</code>.
          </p>
        </div>
      </header>

      <article className="panel-subsection">
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            void loadLogs();
          }}
        >
          <select
            value={limit}
            onChange={(event) => setLimit(Number.parseInt(event.target.value, 10))}
          >
            <option value={25}>25 recent logs</option>
            <option value={50}>50 recent logs</option>
            <option value={100}>100 recent logs</option>
            <option value={200}>200 recent logs</option>
          </select>
          <button type="submit">Refresh</button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <p className="muted">Loading audit logs...</p> : null}

        {!loading && logs.length === 0 ? (
          <p className="muted">No audit logs found.</p>
        ) : null}

        {logs.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Reason</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td className="monospace-cell">{log.actorUserId?.slice(0, 8) ?? '-'}</td>
                    <td>
                      {log.targetType}
                      {log.targetId ? (
                        <span className="monospace-cell"> ({log.targetId.slice(0, 8)})</span>
                      ) : null}
                    </td>
                    <td>{log.reason ?? '-'}</td>
                    <td>
                      <details>
                        <summary>JSON</summary>
                        <div className="audit-json-stack">
                          <p className="muted">Before state</p>
                          <pre className="json-pre">{JSON.stringify(log.beforeState, null, 2)}</pre>
                          <p className="muted">After state</p>
                          <pre className="json-pre">{JSON.stringify(log.afterState, null, 2)}</pre>
                          <p className="muted">Metadata</p>
                          <pre className="json-pre">{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
