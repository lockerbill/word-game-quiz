import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  applyImportJobApi,
  createAnswerApi,
  createCategoryApi,
  createImportJobApi,
  deleteAnswerApi,
  getImportJobApi,
  listAnswersApi,
  listCategoriesApi,
  listImportJobsApi,
  setCategoryEnabledApi,
  updateAnswerApi,
  updateCategoryApi,
} from '../api/adminContentApi';
import type {
  Answer,
  Category,
  ContentImportJob,
  ContentImportJobStatus,
  ListAnswersResponse,
  PaginatedResult,
} from '../types/adminContent';

type ContentTab = 'categories' | 'answers' | 'imports';

interface CategoryFormState {
  name: string;
  difficulty: string;
  emoji: string;
  enabled: boolean;
  reason: string;
}

interface AnswerFormState {
  letter: string;
  answer: string;
  reason: string;
}

interface ImportFormState {
  format: 'csv' | 'json';
  payload: string;
  dryRun: boolean;
  reason: string;
}

const categoriesLimit = 20;
const answersLimit = 50;
const importJobsLimit = 20;

const csvTemplate = [
  'categoryName,difficulty,emoji,enabled,letter,answer',
  'Board Games,2,🎲,true,B,Bingo',
  'Board Games,2,🎲,true,B,Backgammon',
].join('\n');

const jsonTemplate = JSON.stringify(
  [
    {
      categoryName: 'Board Games',
      difficulty: 2,
      emoji: '🎲',
      enabled: true,
      letter: 'B',
      answer: 'Bingo',
    },
  ],
  null,
  2,
);

function extractApiError(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  const status = error.response?.status;
  const responseMessage = error.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ');
  }

  if (typeof responseMessage === 'string') {
    return responseMessage;
  }

  if (status) {
    return `${fallback} (HTTP ${status})`;
  }

  return fallback;
}

function toPositiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export function ContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('categories');

  const [categories, setCategories] = useState<PaginatedResult<Category>>({
    page: 1,
    limit: categoriesLimit,
    total: 0,
    data: [],
  });
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesSearchInput, setCategoriesSearchInput] = useState('');
  const [categoriesSearch, setCategoriesSearch] = useState('');
  const [categoriesEnabledFilter, setCategoriesEnabledFilter] = useState<
    'all' | 'enabled' | 'disabled'
  >('all');
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoryMutationBusy, setCategoryMutationBusy] = useState(false);
  const [categoryMutationError, setCategoryMutationError] = useState<
    string | null
  >(null);

  const [createCategoryForm, setCreateCategoryForm] =
    useState<CategoryFormState>({
      name: '',
      difficulty: '1',
      emoji: '📝',
      enabled: true,
      reason: '',
    });

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<CategoryFormState>({
    name: '',
    difficulty: '1',
    emoji: '📝',
    enabled: true,
    reason: '',
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [answers, setAnswers] = useState<ListAnswersResponse | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [answersPage, setAnswersPage] = useState(1);
  const [answersLetterFilter, setAnswersLetterFilter] = useState('');
  const [answerMutationBusy, setAnswerMutationBusy] = useState(false);
  const [answerMutationError, setAnswerMutationError] = useState<string | null>(
    null,
  );

  const [createAnswerForm, setCreateAnswerForm] = useState<AnswerFormState>({
    letter: '',
    answer: '',
    reason: '',
  });

  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [editAnswerForm, setEditAnswerForm] = useState<AnswerFormState>({
    letter: '',
    answer: '',
    reason: '',
  });

  const [importForm, setImportForm] = useState<ImportFormState>({
    format: 'csv',
    payload: csvTemplate,
    dryRun: true,
    reason: '',
  });
  const [importJobs, setImportJobs] = useState<PaginatedResult<ContentImportJob>>(
    {
      page: 1,
      limit: importJobsLimit,
      total: 0,
      data: [],
    },
  );
  const [importJobsPage, setImportJobsPage] = useState(1);
  const [importJobsStatusFilter, setImportJobsStatusFilter] = useState<
    'all' | ContentImportJobStatus
  >('all');
  const [importJobsLoading, setImportJobsLoading] = useState(false);
  const [importJobsError, setImportJobsError] = useState<string | null>(null);
  const [importMutationBusy, setImportMutationBusy] = useState(false);
  const [importMutationError, setImportMutationError] = useState<string | null>(
    null,
  );
  const [selectedImportJobId, setSelectedImportJobId] = useState<string | null>(
    null,
  );
  const [selectedImportJob, setSelectedImportJob] =
    useState<ContentImportJob | null>(null);
  const [selectedImportJobLoading, setSelectedImportJobLoading] =
    useState(false);
  const [selectedImportJobError, setSelectedImportJobError] = useState<
    string | null
  >(null);
  const [applyImportReason, setApplyImportReason] = useState('');

  const selectedCategory = useMemo(
    () => categories.data.find((category) => category.id === selectedCategoryId),
    [categories.data, selectedCategoryId],
  );

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const response = await listCategoriesApi({
        search: categoriesSearch || undefined,
        enabled:
          categoriesEnabledFilter === 'all'
            ? undefined
            : categoriesEnabledFilter === 'enabled',
        page: categoriesPage,
        limit: categoriesLimit,
      });

      setCategories(response);
    } catch (error) {
      setCategoriesError(
        extractApiError(error, 'Unable to load categories right now.'),
      );
    } finally {
      setCategoriesLoading(false);
    }
  }, [categoriesEnabledFilter, categoriesPage, categoriesSearch]);

  const loadAnswers = useCallback(async () => {
    if (!selectedCategoryId) {
      setAnswers(null);
      return;
    }

    setAnswersLoading(true);
    setAnswersError(null);

    try {
      const response = await listAnswersApi(selectedCategoryId, {
        letter: answersLetterFilter || undefined,
        page: answersPage,
        limit: answersLimit,
      });
      setAnswers(response);
    } catch (error) {
      setAnswersError(extractApiError(error, 'Unable to load answers.'));
    } finally {
      setAnswersLoading(false);
    }
  }, [answersLetterFilter, answersPage, selectedCategoryId]);

  const loadImportJobs = useCallback(async () => {
    setImportJobsLoading(true);
    setImportJobsError(null);

    try {
      const response = await listImportJobsApi({
        status:
          importJobsStatusFilter === 'all' ? undefined : importJobsStatusFilter,
        page: importJobsPage,
        limit: importJobsLimit,
      });

      setImportJobs(response);
    } catch (error) {
      setImportJobsError(
        extractApiError(error, 'Unable to load import jobs right now.'),
      );
    } finally {
      setImportJobsLoading(false);
    }
  }, [importJobsPage, importJobsStatusFilter]);

  const loadImportJobDetail = useCallback(async () => {
    if (!selectedImportJobId) {
      setSelectedImportJob(null);
      setSelectedImportJobError(null);
      return;
    }

    setSelectedImportJobLoading(true);
    setSelectedImportJobError(null);

    try {
      const response = await getImportJobApi(selectedImportJobId);
      setSelectedImportJob(response);
    } catch (error) {
      setSelectedImportJobError(
        extractApiError(error, 'Unable to load import job details.'),
      );
    } finally {
      setSelectedImportJobLoading(false);
    }
  }, [selectedImportJobId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!selectedCategoryId && categories.data.length > 0) {
      setSelectedCategoryId(categories.data[0].id);
    }
  }, [categories.data, selectedCategoryId]);

  useEffect(() => {
    if (selectedCategoryId) {
      const stillExists = categories.data.some(
        (category) => category.id === selectedCategoryId,
      );
      if (!stillExists && categories.data.length > 0) {
        setSelectedCategoryId(categories.data[0].id);
      }
    }
  }, [categories.data, selectedCategoryId]);

  useEffect(() => {
    void loadAnswers();
  }, [loadAnswers]);

  useEffect(() => {
    void loadImportJobs();
  }, [loadImportJobs]);

  useEffect(() => {
    void loadImportJobDetail();
  }, [loadImportJobDetail]);

  async function handleCreateCategorySubmit(event: FormEvent) {
    event.preventDefault();
    setCategoryMutationBusy(true);
    setCategoryMutationError(null);

    try {
      await createCategoryApi({
        name: createCategoryForm.name,
        difficulty: toPositiveInt(createCategoryForm.difficulty),
        emoji: createCategoryForm.emoji,
        enabled: createCategoryForm.enabled,
        reason: createCategoryForm.reason,
      });

      setCreateCategoryForm({
        name: '',
        difficulty: '1',
        emoji: '📝',
        enabled: true,
        reason: '',
      });
      await loadCategories();
    } catch (error) {
      setCategoryMutationError(
        extractApiError(error, 'Unable to create category.'),
      );
    } finally {
      setCategoryMutationBusy(false);
    }
  }

  function beginEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditCategoryForm({
      name: category.name,
      difficulty: String(category.difficulty),
      emoji: category.emoji,
      enabled: category.enabled,
      reason: '',
    });
  }

  async function submitEditCategory(event: FormEvent) {
    event.preventDefault();

    if (!editingCategoryId) {
      return;
    }

    setCategoryMutationBusy(true);
    setCategoryMutationError(null);

    try {
      await updateCategoryApi(editingCategoryId, {
        name: editCategoryForm.name,
        difficulty: toPositiveInt(editCategoryForm.difficulty),
        emoji: editCategoryForm.emoji,
        enabled: editCategoryForm.enabled,
        reason: editCategoryForm.reason || undefined,
      });

      setEditingCategoryId(null);
      setEditCategoryForm({
        name: '',
        difficulty: '1',
        emoji: '📝',
        enabled: true,
        reason: '',
      });
      await loadCategories();
      await loadAnswers();
    } catch (error) {
      setCategoryMutationError(
        extractApiError(error, 'Unable to update category.'),
      );
    } finally {
      setCategoryMutationBusy(false);
    }
  }

  async function toggleCategoryEnabled(category: Category) {
    const reason = window.prompt(
      category.enabled
        ? 'Reason for disabling this category?'
        : 'Reason for enabling this category?',
    );

    if (!reason) {
      return;
    }

    setCategoryMutationBusy(true);
    setCategoryMutationError(null);

    try {
      await setCategoryEnabledApi(category.id, {
        enabled: !category.enabled,
        reason,
      });

      await loadCategories();
      await loadAnswers();
    } catch (error) {
      setCategoryMutationError(
        extractApiError(error, 'Unable to update category status.'),
      );
    } finally {
      setCategoryMutationBusy(false);
    }
  }

  async function handleCreateAnswerSubmit(event: FormEvent) {
    event.preventDefault();

    if (!selectedCategoryId) {
      setAnswerMutationError('Select a category before creating answers.');
      return;
    }

    setAnswerMutationBusy(true);
    setAnswerMutationError(null);

    try {
      await createAnswerApi(selectedCategoryId, {
        letter: createAnswerForm.letter.toUpperCase().trim(),
        answer: createAnswerForm.answer,
        reason: createAnswerForm.reason,
      });

      setCreateAnswerForm({ letter: '', answer: '', reason: '' });
      await loadAnswers();
      await loadCategories();
    } catch (error) {
      setAnswerMutationError(extractApiError(error, 'Unable to create answer.'));
    } finally {
      setAnswerMutationBusy(false);
    }
  }

  function beginEditAnswer(answer: Answer) {
    setEditingAnswerId(answer.id);
    setEditAnswerForm({
      letter: answer.letter,
      answer: answer.answer,
      reason: '',
    });
  }

  async function submitEditAnswer(event: FormEvent) {
    event.preventDefault();
    if (!editingAnswerId) {
      return;
    }

    setAnswerMutationBusy(true);
    setAnswerMutationError(null);

    try {
      await updateAnswerApi(editingAnswerId, {
        letter: editAnswerForm.letter.toUpperCase().trim(),
        answer: editAnswerForm.answer,
        reason: editAnswerForm.reason || undefined,
      });

      setEditingAnswerId(null);
      setEditAnswerForm({ letter: '', answer: '', reason: '' });
      await loadAnswers();
    } catch (error) {
      setAnswerMutationError(extractApiError(error, 'Unable to update answer.'));
    } finally {
      setAnswerMutationBusy(false);
    }
  }

  async function handleDeleteAnswer(answer: Answer) {
    const reason = window.prompt(
      `Reason for deleting "${answer.answer}" from ${selectedCategory?.name ?? 'this category'}?`,
    );

    if (!reason) {
      return;
    }

    setAnswerMutationBusy(true);
    setAnswerMutationError(null);

    try {
      await deleteAnswerApi(answer.id, { reason });
      await loadAnswers();
      await loadCategories();
    } catch (error) {
      setAnswerMutationError(extractApiError(error, 'Unable to delete answer.'));
    } finally {
      setAnswerMutationBusy(false);
    }
  }

  async function handleCreateImportJobSubmit(event: FormEvent) {
    event.preventDefault();
    setImportMutationBusy(true);
    setImportMutationError(null);

    try {
      const created = await createImportJobApi({
        format: importForm.format,
        payload: importForm.payload,
        dryRun: importForm.dryRun,
        reason: importForm.reason,
      });

      setImportForm((current) => ({
        ...current,
        reason: '',
      }));
      setSelectedImportJobId(created.id);
      await loadImportJobs();
      await loadImportJobDetail();
    } catch (error) {
      setImportMutationError(
        extractApiError(error, 'Unable to create import validation job.'),
      );
    } finally {
      setImportMutationBusy(false);
    }
  }

  async function handleApplyImportJob() {
    if (!selectedImportJob) {
      return;
    }

    setImportMutationBusy(true);
    setImportMutationError(null);

    try {
      const updated = await applyImportJobApi(selectedImportJob.id, {
        reason: applyImportReason,
      });
      setSelectedImportJob(updated);
      setApplyImportReason('');
      await loadImportJobs();
      await loadCategories();
      await loadAnswers();
    } catch (error) {
      setImportMutationError(
        extractApiError(error, 'Unable to apply import job.'),
      );
    } finally {
      setImportMutationBusy(false);
    }
  }

  return (
    <section className="panel content-panel">
      <header className="content-header">
        <div>
          <h2>Content Management</h2>
          <p className="muted">
            Manage categories, answers, and bulk import jobs from{' '}
            <code>/api/admin/content/*</code>.
          </p>
        </div>
      </header>

      <div className="content-tabs" role="tablist" aria-label="Content sections">
        <button
          type="button"
          className={activeTab === 'categories' ? 'tab-active' : undefined}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          type="button"
          className={activeTab === 'answers' ? 'tab-active' : undefined}
          onClick={() => setActiveTab('answers')}
        >
          Answers
        </button>
        <button
          type="button"
          className={activeTab === 'imports' ? 'tab-active' : undefined}
          onClick={() => setActiveTab('imports')}
        >
          Bulk Import
        </button>
      </div>

      {activeTab === 'categories' ? (
        <div className="content-grid">
          <article className="panel-subsection">
            <h3>Create category</h3>
            <form className="stack-form" onSubmit={handleCreateCategorySubmit}>
              <label>
                Name
                <input
                  value={createCategoryForm.name}
                  onChange={(event) =>
                    setCreateCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Difficulty (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={createCategoryForm.difficulty}
                  onChange={(event) =>
                    setCreateCategoryForm((current) => ({
                      ...current,
                      difficulty: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Emoji
                <input
                  value={createCategoryForm.emoji}
                  maxLength={16}
                  onChange={(event) =>
                    setCreateCategoryForm((current) => ({
                      ...current,
                      emoji: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={createCategoryForm.enabled}
                  onChange={(event) =>
                    setCreateCategoryForm((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                />
                Enabled
              </label>
              <label>
                Reason
                <textarea
                  value={createCategoryForm.reason}
                  onChange={(event) =>
                    setCreateCategoryForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <button type="submit" disabled={categoryMutationBusy}>
                {categoryMutationBusy ? 'Saving...' : 'Create category'}
              </button>
            </form>

            {editingCategoryId ? (
              <form className="stack-form editing-form" onSubmit={submitEditCategory}>
                <h4>Edit category #{editingCategoryId}</h4>
                <label>
                  Name
                  <input
                    value={editCategoryForm.name}
                    onChange={(event) =>
                      setEditCategoryForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Difficulty (1-5)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editCategoryForm.difficulty}
                    onChange={(event) =>
                      setEditCategoryForm((current) => ({
                        ...current,
                        difficulty: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Emoji
                  <input
                    value={editCategoryForm.emoji}
                    maxLength={16}
                    onChange={(event) =>
                      setEditCategoryForm((current) => ({
                        ...current,
                        emoji: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={editCategoryForm.enabled}
                    onChange={(event) =>
                      setEditCategoryForm((current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                  Enabled
                </label>
                <label>
                  Reason (optional)
                  <textarea
                    value={editCategoryForm.reason}
                    onChange={(event) =>
                      setEditCategoryForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    minLength={5}
                    maxLength={500}
                  />
                </label>
                <div className="row-actions">
                  <button type="submit" disabled={categoryMutationBusy}>
                    {categoryMutationBusy ? 'Updating...' : 'Save updates'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setEditingCategoryId(null)}
                    disabled={categoryMutationBusy}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {categoryMutationError ? (
              <p className="error-text">{categoryMutationError}</p>
            ) : null}
          </article>

          <article className="panel-subsection">
            <h3>Categories</h3>
            <form
              className="toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                setCategoriesPage(1);
                setCategoriesSearch(categoriesSearchInput.trim());
              }}
            >
              <input
                placeholder="Search category name"
                value={categoriesSearchInput}
                onChange={(event) => setCategoriesSearchInput(event.target.value)}
              />
              <select
                value={categoriesEnabledFilter}
                onChange={(event) => {
                  setCategoriesEnabledFilter(
                    event.target.value as 'all' | 'enabled' | 'disabled',
                  );
                  setCategoriesPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <button type="submit">Apply</button>
            </form>

            {categoriesError ? <p className="error-text">{categoriesError}</p> : null}
            {categoriesLoading ? <p className="muted">Loading categories...</p> : null}

            {!categoriesLoading && categories.data.length === 0 ? (
              <p className="muted">No categories found for current filters.</p>
            ) : null}

            {categories.data.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Difficulty</th>
                      <th>Answers</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.data.map((category) => (
                      <tr key={category.id}>
                        <td>{category.id}</td>
                        <td>
                          <span className="category-label">
                            <span>{category.emoji}</span>
                            <span>{category.name}</span>
                          </span>
                        </td>
                        <td>{category.difficulty}</td>
                        <td>{category.answerCount}</td>
                        <td>
                          <span
                            className={
                              category.enabled ? 'status-pill ok' : 'status-pill off'
                            }
                          >
                            {category.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => beginEditCategory(category)}
                            disabled={categoryMutationBusy}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void toggleCategoryEnabled(category)}
                            disabled={categoryMutationBusy}
                          >
                            {category.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              setSelectedCategoryId(category.id);
                              setActiveTab('answers');
                            }}
                          >
                            View answers
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
                Page {categories.page} of{' '}
                {Math.max(1, Math.ceil(categories.total / categories.limit))}
              </p>
              <div className="row-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={categoriesPage <= 1 || categoriesLoading}
                  onClick={() => setCategoriesPage((current) => current - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={
                    categoriesPage >=
                      Math.max(1, Math.ceil(categories.total / categories.limit)) ||
                    categoriesLoading
                  }
                  onClick={() => setCategoriesPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === 'answers' ? (
        <div className="content-grid">
          <article className="panel-subsection">
            <h3>Create answer</h3>
            <label>
              Category
              <select
                value={selectedCategoryId ?? ''}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setSelectedCategoryId(Number.isFinite(next) ? next : null);
                  setAnswersPage(1);
                }}
              >
                {categories.data.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.id} - {category.name}
                  </option>
                ))}
              </select>
            </label>

            <form className="stack-form" onSubmit={handleCreateAnswerSubmit}>
              <label>
                Letter
                <input
                  value={createAnswerForm.letter}
                  onChange={(event) =>
                    setCreateAnswerForm((current) => ({
                      ...current,
                      letter: event.target.value.toUpperCase().slice(0, 1),
                    }))
                  }
                  minLength={1}
                  maxLength={1}
                  required
                />
              </label>
              <label>
                Answer
                <input
                  value={createAnswerForm.answer}
                  onChange={(event) =>
                    setCreateAnswerForm((current) => ({
                      ...current,
                      answer: event.target.value,
                    }))
                  }
                  minLength={1}
                  maxLength={200}
                  required
                />
              </label>
              <label>
                Reason
                <textarea
                  value={createAnswerForm.reason}
                  onChange={(event) =>
                    setCreateAnswerForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <button type="submit" disabled={answerMutationBusy || !selectedCategoryId}>
                {answerMutationBusy ? 'Saving...' : 'Create answer'}
              </button>
            </form>

            {editingAnswerId ? (
              <form className="stack-form editing-form" onSubmit={submitEditAnswer}>
                <h4>Edit answer #{editingAnswerId}</h4>
                <label>
                  Letter
                  <input
                    value={editAnswerForm.letter}
                    onChange={(event) =>
                      setEditAnswerForm((current) => ({
                        ...current,
                        letter: event.target.value.toUpperCase().slice(0, 1),
                      }))
                    }
                    minLength={1}
                    maxLength={1}
                    required
                  />
                </label>
                <label>
                  Answer
                  <input
                    value={editAnswerForm.answer}
                    onChange={(event) =>
                      setEditAnswerForm((current) => ({
                        ...current,
                        answer: event.target.value,
                      }))
                    }
                    minLength={1}
                    maxLength={200}
                    required
                  />
                </label>
                <label>
                  Reason (optional)
                  <textarea
                    value={editAnswerForm.reason}
                    onChange={(event) =>
                      setEditAnswerForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    minLength={5}
                    maxLength={500}
                  />
                </label>
                <div className="row-actions">
                  <button type="submit" disabled={answerMutationBusy}>
                    {answerMutationBusy ? 'Updating...' : 'Save updates'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setEditingAnswerId(null)}
                    disabled={answerMutationBusy}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {answerMutationError ? <p className="error-text">{answerMutationError}</p> : null}
          </article>

          <article className="panel-subsection">
            <h3>Answers</h3>
            <form
              className="toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                setAnswersPage(1);
                void loadAnswers();
              }}
            >
              <select
                value={selectedCategoryId ?? ''}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setSelectedCategoryId(Number.isFinite(next) ? next : null);
                  setAnswersPage(1);
                }}
              >
                {categories.data.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.id} - {category.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Letter filter (A-Z)"
                value={answersLetterFilter}
                maxLength={1}
                onChange={(event) => {
                  setAnswersLetterFilter(event.target.value.toUpperCase());
                  setAnswersPage(1);
                }}
              />
              <button type="submit">Apply</button>
            </form>

            {answersError ? <p className="error-text">{answersError}</p> : null}
            {answersLoading ? <p className="muted">Loading answers...</p> : null}

            {!answersLoading && answers && answers.data.length === 0 ? (
              <p className="muted">
                No answers for {answers.category.name} with current filters.
              </p>
            ) : null}

            {answers && answers.data.length > 0 ? (
              <>
                <p className="muted">
                  Category: <strong>{answers.category.name}</strong>
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Letter</th>
                        <th>Answer</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answers.data.map((answer) => (
                        <tr key={answer.id}>
                          <td>{answer.id}</td>
                          <td>{answer.letter}</td>
                          <td>{answer.answer}</td>
                          <td className="row-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => beginEditAnswer(answer)}
                              disabled={answerMutationBusy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ghost-button danger"
                              onClick={() => void handleDeleteAnswer(answer)}
                              disabled={answerMutationBusy}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-row">
                  <p className="muted">
                    Page {answers.page} of{' '}
                    {Math.max(1, Math.ceil(answers.total / answers.limit))}
                  </p>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={answers.page <= 1 || answersLoading}
                      onClick={() => setAnswersPage((current) => current - 1)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={
                        answers.page >=
                          Math.max(1, Math.ceil(answers.total / answers.limit)) ||
                        answersLoading
                      }
                      onClick={() => setAnswersPage((current) => current + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </article>
        </div>
      ) : null}

      {activeTab === 'imports' ? (
        <div className="content-grid">
          <article className="panel-subsection">
            <h3>Create import job</h3>
            <form className="stack-form" onSubmit={handleCreateImportJobSubmit}>
              <label>
                Format
                <select
                  value={importForm.format}
                  onChange={(event) => {
                    const format = event.target.value as 'csv' | 'json';
                    setImportForm((current) => ({
                      ...current,
                      format,
                      payload: format === 'csv' ? csvTemplate : jsonTemplate,
                    }));
                  }}
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={importForm.dryRun}
                  onChange={(event) =>
                    setImportForm((current) => ({
                      ...current,
                      dryRun: event.target.checked,
                    }))
                  }
                />
                Dry run
              </label>
              <label>
                Payload
                <textarea
                  className="payload-input"
                  value={importForm.payload}
                  onChange={(event) =>
                    setImportForm((current) => ({
                      ...current,
                      payload: event.target.value,
                    }))
                  }
                  minLength={2}
                  required
                />
              </label>
              <label>
                Reason
                <textarea
                  value={importForm.reason}
                  onChange={(event) =>
                    setImportForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <button type="submit" disabled={importMutationBusy}>
                {importMutationBusy ? 'Validating...' : 'Create validation job'}
              </button>
            </form>

            {selectedImportJob ? (
              <div className="job-detail">
                <h4>Selected job details</h4>
                {selectedImportJobLoading ? (
                  <p className="muted">Loading job details...</p>
                ) : null}
                {selectedImportJobError ? (
                  <p className="error-text">{selectedImportJobError}</p>
                ) : null}
                {!selectedImportJobLoading ? (
                  <>
                    <p>
                      <strong>Status:</strong> {selectedImportJob.status}
                    </p>
                    <p>
                      <strong>Rows:</strong> {selectedImportJob.summary.totalRows} total,{' '}
                      {selectedImportJob.summary.validRows} valid
                    </p>
                    <p>
                      <strong>Errors:</strong> {selectedImportJob.summary.errorCount} |{' '}
                      <strong>Warnings:</strong> {selectedImportJob.summary.warningCount}
                    </p>

                    {selectedImportJob.validationErrors?.length ? (
                      <details>
                        <summary>Validation errors</summary>
                        <ul className="issue-list">
                          {selectedImportJob.validationErrors.map((issue, index) => (
                            <li key={`error-${index}`}>
                              Row {issue.rowNumber} ({issue.field}): {issue.message}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}

                    {selectedImportJob.validationWarnings?.length ? (
                      <details>
                        <summary>Validation warnings</summary>
                        <ul className="issue-list">
                          {selectedImportJob.validationWarnings.map(
                            (issue, index) => (
                              <li key={`warning-${index}`}>
                                Row {issue.rowNumber} ({issue.field}): {issue.message}
                              </li>
                            ),
                          )}
                        </ul>
                      </details>
                    ) : null}

                    {selectedImportJob.status === 'validated' ? (
                      <div className="apply-box">
                        <label>
                          Apply reason
                          <textarea
                            value={applyImportReason}
                            onChange={(event) =>
                              setApplyImportReason(event.target.value)
                            }
                            minLength={5}
                            maxLength={500}
                            required
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleApplyImportJob()}
                          disabled={
                            importMutationBusy || applyImportReason.trim().length < 5
                          }
                        >
                          {importMutationBusy ? 'Applying...' : 'Apply import'}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {importMutationError ? <p className="error-text">{importMutationError}</p> : null}
          </article>

          <article className="panel-subsection">
            <h3>Import jobs</h3>
            <form
              className="toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                setImportJobsPage(1);
                void loadImportJobs();
              }}
            >
              <select
                value={importJobsStatusFilter}
                onChange={(event) => {
                  setImportJobsStatusFilter(
                    event.target.value as 'all' | ContentImportJobStatus,
                  );
                  setImportJobsPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="validated">Validated</option>
                <option value="failed_validation">Failed validation</option>
                <option value="applied">Applied</option>
              </select>
              <button type="submit">Apply</button>
            </form>

            {importJobsError ? <p className="error-text">{importJobsError}</p> : null}
            {importJobsLoading ? <p className="muted">Loading import jobs...</p> : null}

            {!importJobsLoading && importJobs.data.length === 0 ? (
              <p className="muted">No import jobs found for current filters.</p>
            ) : null}

            {importJobs.data.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Status</th>
                      <th>Format</th>
                      <th>Summary</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importJobs.data.map((job) => (
                      <tr key={job.id}>
                        <td className="monospace-cell">{job.id.slice(0, 8)}</td>
                        <td>
                          <span className="status-pill">{job.status}</span>
                        </td>
                        <td>{job.format.toUpperCase()}</td>
                        <td>
                          {job.summary.validRows}/{job.summary.totalRows} valid,{' '}
                          {job.summary.errorCount} errors,{' '}
                          {job.summary.warningCount} warnings
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => setSelectedImportJobId(job.id)}
                          >
                            View details
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
                Page {importJobs.page} of{' '}
                {Math.max(1, Math.ceil(importJobs.total / importJobs.limit))}
              </p>
              <div className="row-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={importJobsPage <= 1 || importJobsLoading}
                  onClick={() => setImportJobsPage((current) => current - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={
                    importJobsPage >=
                      Math.max(1, Math.ceil(importJobs.total / importJobs.limit)) ||
                    importJobsLoading
                  }
                  onClick={() => setImportJobsPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
