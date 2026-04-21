import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  getModerationMetricsApi,
  getModerationSessionDetailApi,
  listModerationSessionsApi,
  reviewModerationSessionApi,
} from '../api/adminSessionModerationApi';
import type {
  ModerationMetrics,
  PaginatedModerationSessions,
  SessionModerationDetail,
  SessionModerationQueueFilter,
} from '../types/adminSessionModeration';

const moderationSessionsLimit = 20;

interface QueueFiltersState {
  search: string;
  mode: '' | 'practice' | 'ranked' | 'daily' | 'relax' | 'hardcore';
  decision: '' | SessionModerationQueueFilter;
  minScore: string;
  maxScore: string;
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

function toPositiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function labelIndicator(indicator: string): string {
  return indicator
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ModerationPage() {
  const [metrics, setMetrics] = useState<ModerationMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [sessionsResponse, setSessionsResponse] =
    useState<PaginatedModerationSessions>({
      page: 1,
      limit: moderationSessionsLimit,
      total: 0,
      data: [],
    });
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [filtersInput, setFiltersInput] = useState<QueueFiltersState>({
    search: '',
    mode: '',
    decision: '',
    minScore: '',
    maxScore: '',
  });
  const [filters, setFilters] = useState<QueueFiltersState>({
    search: '',
    mode: '',
    decision: '',
    minScore: '',
    maxScore: '',
  });
  const [page, setPage] = useState(1);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] =
    useState<SessionModerationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);

    try {
      const response = await getModerationMetricsApi();
      setMetrics(response);
    } catch (error) {
      setMetricsError(
        extractApiError(error, 'Unable to load moderation metrics right now.'),
      );
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);

    try {
      const response = await listModerationSessionsApi({
        search: filters.search || undefined,
        mode: filters.mode || undefined,
        decision: filters.decision || undefined,
        minScore: toPositiveInt(filters.minScore),
        maxScore: toPositiveInt(filters.maxScore),
        page,
        limit: moderationSessionsLimit,
      });

      setSessionsResponse(response);
    } catch (error) {
      setQueueError(
        extractApiError(error, 'Unable to load moderation queue right now.'),
      );
    } finally {
      setQueueLoading(false);
    }
  }, [filters.decision, filters.maxScore, filters.minScore, filters.mode, filters.search, page]);

  const loadSessionDetail = useCallback(async () => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      setDetailError(null);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const response = await getModerationSessionDetailApi(selectedSessionId);
      setSessionDetail(response);
    } catch (error) {
      setDetailError(
        extractApiError(error, 'Unable to load selected session detail.'),
      );
    } finally {
      setDetailLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (!selectedSessionId && sessionsResponse.data.length > 0) {
      setSelectedSessionId(sessionsResponse.data[0].id);
    }
  }, [selectedSessionId, sessionsResponse.data]);

  useEffect(() => {
    if (selectedSessionId) {
      const stillVisible = sessionsResponse.data.some(
        (session) => session.id === selectedSessionId,
      );
      if (!stillVisible && sessionsResponse.data.length > 0) {
        setSelectedSessionId(sessionsResponse.data[0].id);
      }
    }
  }, [selectedSessionId, sessionsResponse.data]);

  useEffect(() => {
    void loadSessionDetail();
  }, [loadSessionDetail]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(sessionsResponse.total / sessionsResponse.limit)),
    [sessionsResponse.limit, sessionsResponse.total],
  );

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters({
      search: filtersInput.search.trim(),
      mode: filtersInput.mode,
      decision: filtersInput.decision,
      minScore: filtersInput.minScore.trim(),
      maxScore: filtersInput.maxScore.trim(),
    });
  }

  async function handleReviewAction(decision: 'reviewed' | 'flagged') {
    if (!selectedSessionId) {
      return;
    }

    const reason = window.prompt(
      decision === 'reviewed'
        ? 'Reason for marking this session as reviewed?'
        : 'Reason for flagging this session?',
    );
    if (!reason) {
      return;
    }

    setActionBusy(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await reviewModerationSessionApi(selectedSessionId, {
        decision,
        reason,
      });
      setActionSuccess(
        decision === 'reviewed'
          ? 'Session marked as reviewed.'
          : 'Session flagged for follow-up.',
      );
      await Promise.all([loadQueue(), loadSessionDetail(), loadMetrics()]);
    } catch (error) {
      setActionError(
        extractApiError(error, 'Unable to save moderation decision.'),
      );
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <section className="panel content-panel">
      <header className="content-header">
        <div>
          <h2>Session Moderation</h2>
          <p className="muted">
            Review played sessions from <code>/api/admin/sessions</code> and append
            non-destructive review decisions.
          </p>
        </div>
      </header>

      <article className="panel-subsection">
        <div className="moderation-metrics-header">
          <h3>24h Queue Health</h3>
          {metrics ? (
            <p className="muted">Updated {formatDate(metrics.computedAt)}</p>
          ) : null}
        </div>

        {metricsError ? <p className="error-text">{metricsError}</p> : null}
        {metricsLoading ? <p className="muted">Loading moderation metrics...</p> : null}

        {metrics ? (
          <div className="moderation-metrics-grid">
            <div className="metric-card">
              <p className="metric-label">Unreviewed Queue</p>
              <p className="metric-value">{metrics.queueUnreviewedTotal}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Flagged (Latest)</p>
              <p className="metric-value">{metrics.queueFlaggedTotal}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Reviews in 24h</p>
              <p className="metric-value">{metrics.reviewedLast24h}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Stale Unreviewed &gt;24h</p>
              <p className="metric-value">{metrics.staleUnreviewed24h}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Median First Review</p>
              <p className="metric-value">
                {metrics.medianFirstReviewMinutes === null
                  ? '-'
                  : `${Math.round(metrics.medianFirstReviewMinutes)}m`}
              </p>
            </div>
          </div>
        ) : null}
      </article>

      <article className="panel-subsection">
        <form className="toolbar moderation-toolbar" onSubmit={handleFilterSubmit}>
          <input
            placeholder="Search username, email, or session id"
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
            value={filtersInput.mode}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                mode: event.target.value as QueueFiltersState['mode'],
              }))
            }
          >
            <option value="">All modes</option>
            <option value="practice">practice</option>
            <option value="ranked">ranked</option>
            <option value="daily">daily</option>
            <option value="relax">relax</option>
            <option value="hardcore">hardcore</option>
          </select>

          <select
            value={filtersInput.decision}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                decision: event.target.value as QueueFiltersState['decision'],
              }))
            }
          >
            <option value="">All moderation states</option>
            <option value="unreviewed">unreviewed</option>
            <option value="reviewed">reviewed</option>
            <option value="flagged">flagged</option>
          </select>

          <input
            placeholder="Min score"
            inputMode="numeric"
            value={filtersInput.minScore}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                minScore: event.target.value,
              }))
            }
          />

          <input
            placeholder="Max score"
            inputMode="numeric"
            value={filtersInput.maxScore}
            onChange={(event) =>
              setFiltersInput((current) => ({
                ...current,
                maxScore: event.target.value,
              }))
            }
          />

          <button type="submit">Apply</button>
        </form>

        {queueError ? <p className="error-text">{queueError}</p> : null}
      </article>

      <div className="content-grid moderation-grid">
        <article className="panel-subsection">
          <h3>Moderation Queue</h3>
          {queueLoading ? <p className="muted">Loading session queue...</p> : null}
          {!queueLoading && sessionsResponse.data.length === 0 ? (
            <p className="muted">No sessions found for current filters.</p>
          ) : null}

          {sessionsResponse.data.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Mode</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsResponse.data.map((session) => {
                    const isSelected = selectedSessionId === session.id;
                    return (
                      <tr
                        key={session.id}
                        className={isSelected ? 'table-row-selected' : undefined}
                        onClick={() => setSelectedSessionId(session.id)}
                      >
                        <td className="user-cell">
                          <span>{session.player.username}</span>
                          <span className="muted monospace-cell">
                            {session.id.slice(0, 8)}
                          </span>
                        </td>
                        <td>{session.mode}</td>
                        <td>{session.score}</td>
                        <td>{session.timeUsed}s</td>
                        <td>
                          {session.latestModeration ? (
                            <span
                              className={
                                session.latestModeration.decision === 'flagged'
                                  ? 'status-pill off'
                                  : 'status-pill ok'
                              }
                            >
                              {session.latestModeration.decision}
                            </span>
                          ) : (
                            <span className="status-pill">unreviewed</span>
                          )}
                        </td>
                        <td>{formatDate(session.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="pagination-row">
            <p className="muted">
              Page {sessionsResponse.page} of {pageCount} ({sessionsResponse.total}{' '}
              sessions)
            </p>
            <div className="row-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || queueLoading}
              >
                Previous
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page >= pageCount || queueLoading}
              >
                Next
              </button>
            </div>
          </div>
        </article>

        <article className="panel-subsection">
          <h3>Session Detail</h3>
          {detailError ? <p className="error-text">{detailError}</p> : null}
          {actionError ? <p className="error-text">{actionError}</p> : null}
          {actionSuccess ? <p className="notice-text">{actionSuccess}</p> : null}
          {detailLoading ? <p className="muted">Loading session detail...</p> : null}

          {!detailLoading && !sessionDetail ? (
            <p className="muted">Select a session from the queue to review details.</p>
          ) : null}

          {sessionDetail ? (
            <>
              <div className="moderation-summary-grid">
                <p>
                  <strong>Player:</strong> {sessionDetail.player.username}
                </p>
                <p>
                  <strong>Mode:</strong> {sessionDetail.mode}
                </p>
                <p>
                  <strong>Letter:</strong> {sessionDetail.letter}
                </p>
                <p>
                  <strong>Score:</strong> {sessionDetail.score}
                </p>
                <p>
                  <strong>Correct:</strong> {sessionDetail.correctCount}
                </p>
                <p>
                  <strong>Time:</strong> {sessionDetail.timeUsed}s
                </p>
                <p>
                  <strong>Created:</strong> {formatDate(sessionDetail.createdAt)}
                </p>
              </div>

              <div>
                <p className="muted">Suspicion indicators</p>
                {sessionDetail.suspicionIndicators.length === 0 ? (
                  <p className="muted">No automated indicators on this session.</p>
                ) : (
                  <div className="row-actions">
                    {sessionDetail.suspicionIndicators.map((indicator) => (
                      <span key={indicator} className="status-pill off">
                        {labelIndicator(indicator)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="row-actions">
                <button
                  type="button"
                  onClick={() => void handleReviewAction('reviewed')}
                  disabled={actionBusy}
                >
                  Mark Reviewed
                </button>
                <button
                  type="button"
                  className="ghost-button danger"
                  onClick={() => void handleReviewAction('flagged')}
                  disabled={actionBusy}
                >
                  Flag Session
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Answer</th>
                      <th>Valid</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionDetail.answers.map((answer) => (
                      <tr key={answer.id}>
                        <td>{answer.categoryName ?? `Category ${answer.categoryId}`}</td>
                        <td>{answer.answer || '-'}</td>
                        <td>{answer.valid ? 'yes' : 'no'}</td>
                        <td>{answer.confidence.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4>Moderation History</h4>
                {sessionDetail.moderationHistory.length === 0 ? (
                  <p className="muted">No moderation decisions yet.</p>
                ) : (
                  <ul className="issue-list">
                    {sessionDetail.moderationHistory.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.decision}</strong> by {entry.reviewer.username} at{' '}
                        {formatDate(entry.createdAt)} — {entry.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
