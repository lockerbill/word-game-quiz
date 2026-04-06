import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  getCurrentSettingsApi,
  getSettingsRevisionApi,
  listSettingsRevisionsApi,
  rollbackSettingsApi,
  updateSettingsApi,
} from '../api/adminSettingsApi';
import type {
  AdminRuntimeSettings,
  AdminSettingsRevision,
  PaginatedSettingsRevisions,
} from '../types/adminSettings';

const settingsRevisionLimit = 20;

interface SettingsFormState {
  categoriesPerGame: string;
  practice: string;
  ranked: string;
  daily: string;
  relax: string;
  hardcore: string;
  aiEnabled: boolean;
  aiProvider: 'openai' | 'ollama' | 'gemini';
  aiTimeoutMs: string;
  aiMinConfidence: string;
  aiCacheTtlSeconds: string;
  featuresJson: string;
  reason: string;
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

function toFormState(settings: AdminRuntimeSettings): SettingsFormState {
  return {
    categoriesPerGame: String(settings.game.categoriesPerGame),
    practice: String(settings.game.timerSecondsByMode.practice),
    ranked: String(settings.game.timerSecondsByMode.ranked),
    daily: String(settings.game.timerSecondsByMode.daily),
    relax: String(settings.game.timerSecondsByMode.relax),
    hardcore: String(settings.game.timerSecondsByMode.hardcore),
    aiEnabled: settings.aiValidation.enabled,
    aiProvider: settings.aiValidation.provider,
    aiTimeoutMs: String(settings.aiValidation.timeoutMs),
    aiMinConfidence: String(settings.aiValidation.minConfidence),
    aiCacheTtlSeconds: String(settings.aiValidation.cacheTtlSeconds),
    featuresJson: JSON.stringify(settings.features, null, 2),
    reason: '',
  };
}

function parseInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return parsed;
}

function parseFloatNumber(value: string, fieldName: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return parsed;
}

function parseFeatureFlags(featuresJson: string): Record<string, boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(featuresJson);
  } catch {
    throw new Error('Features JSON must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Features JSON must be an object of key/boolean pairs.');
  }

  const record = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'boolean') {
      throw new Error(`Feature flag ${key} must be true or false.`);
    }
  }

  return record as Record<string, boolean>;
}

export function SettingsPage() {
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [revisions, setRevisions] = useState<PaginatedSettingsRevisions>({
    page: 1,
    limit: settingsRevisionLimit,
    total: 0,
    data: [],
  });
  const [revisionsPage, setRevisionsPage] = useState(1);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);

  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] =
    useState<AdminSettingsRevision | null>(null);
  const [selectedRevisionLoading, setSelectedRevisionLoading] = useState(false);
  const [selectedRevisionError, setSelectedRevisionError] = useState<string | null>(
    null,
  );

  const [publishBusy, setPublishBusy] = useState(false);
  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');

  const loadCurrentSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const current = await getCurrentSettingsApi();
      setCurrentVersion(current.version);
      setSettingsForm(toFormState(current.settings));
    } catch (error) {
      setSettingsError(
        extractApiError(error, 'Unable to load current runtime settings.'),
      );
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadRevisions = useCallback(async () => {
    setRevisionsLoading(true);
    setRevisionsError(null);

    try {
      const response = await listSettingsRevisionsApi({
        page: revisionsPage,
        limit: settingsRevisionLimit,
      });
      setRevisions(response);
    } catch (error) {
      setRevisionsError(
        extractApiError(error, 'Unable to load settings revisions.'),
      );
    } finally {
      setRevisionsLoading(false);
    }
  }, [revisionsPage]);

  const loadSelectedRevision = useCallback(async () => {
    if (!selectedRevisionId) {
      setSelectedRevision(null);
      setSelectedRevisionError(null);
      return;
    }

    setSelectedRevisionLoading(true);
    setSelectedRevisionError(null);

    try {
      const response = await getSettingsRevisionApi(selectedRevisionId);
      setSelectedRevision(response);
    } catch (error) {
      setSelectedRevisionError(
        extractApiError(error, 'Unable to load selected revision details.'),
      );
    } finally {
      setSelectedRevisionLoading(false);
    }
  }, [selectedRevisionId]);

  useEffect(() => {
    void loadCurrentSettings();
  }, [loadCurrentSettings]);

  useEffect(() => {
    void loadRevisions();
  }, [loadRevisions]);

  useEffect(() => {
    if (!selectedRevisionId && revisions.data.length > 0) {
      setSelectedRevisionId(revisions.data[0].id);
    }
  }, [revisions.data, selectedRevisionId]);

  useEffect(() => {
    void loadSelectedRevision();
  }, [loadSelectedRevision]);

  const revisionsPageCount = useMemo(
    () => Math.max(1, Math.ceil(revisions.total / revisions.limit)),
    [revisions.limit, revisions.total],
  );

  async function handlePublishSubmit(event: FormEvent) {
    event.preventDefault();
    if (!settingsForm || currentVersion === null) {
      return;
    }

    setPublishBusy(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        expectedVersion: currentVersion,
        reason: settingsForm.reason,
        settings: {
          game: {
            categoriesPerGame: parseInteger(
              settingsForm.categoriesPerGame,
              'categoriesPerGame',
            ),
            timerSecondsByMode: {
              practice: parseInteger(settingsForm.practice, 'practice timer'),
              ranked: parseInteger(settingsForm.ranked, 'ranked timer'),
              daily: parseInteger(settingsForm.daily, 'daily timer'),
              relax: parseInteger(settingsForm.relax, 'relax timer'),
              hardcore: parseInteger(settingsForm.hardcore, 'hardcore timer'),
            },
          },
          aiValidation: {
            enabled: settingsForm.aiEnabled,
            provider: settingsForm.aiProvider,
            timeoutMs: parseInteger(settingsForm.aiTimeoutMs, 'AI timeout'),
            minConfidence: parseFloatNumber(
              settingsForm.aiMinConfidence,
              'AI min confidence',
            ),
            cacheTtlSeconds: parseInteger(
              settingsForm.aiCacheTtlSeconds,
              'AI cache TTL seconds',
            ),
          },
          features: parseFeatureFlags(settingsForm.featuresJson),
        },
      };

      const response = await updateSettingsApi(payload);

      setCurrentVersion(response.version);
      setSettingsForm((current) =>
        current
          ? {
              ...current,
              reason: '',
            }
          : current,
      );
      setActionSuccess(`Settings published as version ${response.version}.`);

      await loadCurrentSettings();
      await loadRevisions();
      setSelectedRevisionId(response.revisionId);
    } catch (error) {
      if (error instanceof Error && !('isAxiosError' in error)) {
        setActionError(error.message);
      } else {
        setActionError(
          extractApiError(error, 'Unable to publish runtime settings.'),
        );
      }
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleRollbackSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedRevisionId || currentVersion === null) {
      return;
    }

    setRollbackBusy(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await rollbackSettingsApi({
        targetRevisionId: selectedRevisionId,
        expectedVersion: currentVersion,
        reason: rollbackReason,
      });

      setRollbackReason('');
      setActionSuccess(
        `Rollback applied. New version is ${response.appliedRevision.version}.`,
      );

      await loadCurrentSettings();
      await loadRevisions();
      setSelectedRevisionId(response.appliedRevision.id);
    } catch (error) {
      setActionError(extractApiError(error, 'Unable to rollback settings.'));
    } finally {
      setRollbackBusy(false);
    }
  }

  return (
    <section className="panel content-panel">
      <header className="content-header">
        <div>
          <h2>Runtime Settings</h2>
          <p className="muted">
            Publish setting revisions and rollback from <code>/api/admin/settings</code>.
          </p>
        </div>
      </header>

      {settingsError ? <p className="error-text">{settingsError}</p> : null}
      {actionError ? <p className="error-text">{actionError}</p> : null}
      {actionSuccess ? <p className="notice-text">{actionSuccess}</p> : null}

      <div className="content-grid">
        <article className="panel-subsection">
          <h3>Current settings</h3>
          <p className="muted">
            Active version:{' '}
            <strong>{currentVersion === null ? 'Loading...' : currentVersion}</strong>
          </p>

          {settingsLoading || !settingsForm ? (
            <p className="muted">Loading settings editor...</p>
          ) : (
            <form className="stack-form" onSubmit={handlePublishSubmit}>
              <h4>Game</h4>
              <label>
                Categories per game
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={settingsForm.categoriesPerGame}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? { ...current, categoriesPerGame: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <div className="settings-grid-2">
                <label>
                  Practice timer
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={settingsForm.practice}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current ? { ...current, practice: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label>
                  Ranked timer
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={settingsForm.ranked}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current ? { ...current, ranked: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label>
                  Daily timer
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={settingsForm.daily}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current ? { ...current, daily: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label>
                  Relax timer
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={settingsForm.relax}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current ? { ...current, relax: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label>
                  Hardcore timer
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={settingsForm.hardcore}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current ? { ...current, hardcore: event.target.value } : current,
                      )
                    }
                  />
                </label>
              </div>

              <h4>AI validation</h4>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settingsForm.aiEnabled}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current ? { ...current, aiEnabled: event.target.checked } : current,
                    )
                  }
                />
                AI validation enabled
              </label>
              <label>
                Provider
                <select
                  value={settingsForm.aiProvider}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            aiProvider: event.target.value as
                              | 'openai'
                              | 'ollama'
                              | 'gemini',
                          }
                        : current,
                    )
                  }
                >
                  <option value="openai">openai</option>
                  <option value="ollama">ollama</option>
                  <option value="gemini">gemini</option>
                </select>
              </label>
              <div className="settings-grid-2">
                <label>
                  Timeout ms
                  <input
                    type="number"
                    min={100}
                    max={60000}
                    value={settingsForm.aiTimeoutMs}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current ? { ...current, aiTimeoutMs: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label>
                  Min confidence
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step="0.01"
                    value={settingsForm.aiMinConfidence}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current
                          ? { ...current, aiMinConfidence: event.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label>
                  Cache TTL seconds
                  <input
                    type="number"
                    min={1}
                    max={2592000}
                    value={settingsForm.aiCacheTtlSeconds}
                    onChange={(event) =>
                      setSettingsForm((current) =>
                        current
                          ? { ...current, aiCacheTtlSeconds: event.target.value }
                          : current,
                      )
                    }
                  />
                </label>
              </div>

              <h4>Features</h4>
              <label>
                Feature flags JSON
                <textarea
                  className="payload-input"
                  value={settingsForm.featuresJson}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            featuresJson: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                Publish reason
                <textarea
                  value={settingsForm.reason}
                  minLength={5}
                  maxLength={500}
                  required
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current ? { ...current, reason: event.target.value } : current,
                    )
                  }
                />
              </label>

              <button type="submit" disabled={publishBusy}>
                {publishBusy ? 'Publishing...' : 'Publish settings'}
              </button>
            </form>
          )}
        </article>

        <article className="panel-subsection">
          <h3>Revision history</h3>
          {revisionsError ? <p className="error-text">{revisionsError}</p> : null}
          {revisionsLoading ? (
            <p className="muted">Loading revisions...</p>
          ) : null}

          {revisions.data.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Revision ID</th>
                    <th>Published</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.data.map((revision) => (
                    <tr key={revision.id}>
                      <td>{revision.version}</td>
                      <td className="monospace-cell">{revision.id.slice(0, 8)}</td>
                      <td>{new Date(revision.publishedAt).toLocaleString()}</td>
                      <td>{revision.reason}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setSelectedRevisionId(revision.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="pagination-row">
            <p className="muted">
              Page {revisions.page} of {revisionsPageCount}
            </p>
            <div className="row-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={revisionsPage <= 1 || revisionsLoading}
                onClick={() => setRevisionsPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={revisionsPage >= revisionsPageCount || revisionsLoading}
                onClick={() => setRevisionsPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>

          <div className="job-detail">
            <h4>Selected revision details</h4>
            {selectedRevisionLoading ? (
              <p className="muted">Loading revision details...</p>
            ) : null}
            {selectedRevisionError ? (
              <p className="error-text">{selectedRevisionError}</p>
            ) : null}
            {selectedRevision ? (
              <>
                <p>
                  Version <strong>{selectedRevision.version}</strong> ({selectedRevision.id})
                </p>
                <pre className="json-pre">
                  {JSON.stringify(selectedRevision.settings, null, 2)}
                </pre>

                <form className="stack-form" onSubmit={handleRollbackSubmit}>
                  <label>
                    Rollback reason
                    <textarea
                      value={rollbackReason}
                      minLength={5}
                      maxLength={500}
                      required
                      onChange={(event) => setRollbackReason(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={rollbackBusy || currentVersion === null}
                  >
                    {rollbackBusy
                      ? 'Applying rollback...'
                      : `Rollback to v${selectedRevision.version}`}
                  </button>
                </form>
              </>
            ) : (
              <p className="muted">Select a revision to inspect and rollback.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
