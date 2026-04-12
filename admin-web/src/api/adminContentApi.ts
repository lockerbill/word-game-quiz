import { apiClient } from './client';
import type {
  ApplyImportJobPayload,
  ContentImportJob,
  CreateAnswerPayload,
  CreateCategoryPayload,
  CreateImportJobPayload,
  CreateImportJobCsvUploadPayload,
  DeleteAnswerPayload,
  ListAnswersQuery,
  ListAnswersResponse,
  ListCategoriesQuery,
  ListImportJobsQuery,
  PaginatedResult,
  SetCategoryEnabledPayload,
  UpdateAnswerPayload,
  UpdateCategoryPayload,
  Category,
} from '../types/adminContent';

export async function listCategoriesApi(
  query: ListCategoriesQuery,
): Promise<PaginatedResult<Category>> {
  const { data } = await apiClient.get<PaginatedResult<Category>>(
    '/admin/content/categories',
    { params: query },
  );

  return data;
}

export async function createCategoryApi(
  payload: CreateCategoryPayload,
): Promise<Category> {
  const { data } = await apiClient.post<Category>(
    '/admin/content/categories',
    payload,
  );

  return data;
}

export async function updateCategoryApi(
  categoryId: number,
  payload: UpdateCategoryPayload,
): Promise<Category> {
  const { data } = await apiClient.patch<Category>(
    `/admin/content/categories/${categoryId}`,
    payload,
  );

  return data;
}

export async function setCategoryEnabledApi(
  categoryId: number,
  payload: SetCategoryEnabledPayload,
): Promise<Category> {
  const { data } = await apiClient.patch<Category>(
    `/admin/content/categories/${categoryId}/enabled`,
    payload,
  );

  return data;
}

export async function listAnswersApi(
  categoryId: number,
  query: ListAnswersQuery,
): Promise<ListAnswersResponse> {
  const { data } = await apiClient.get<ListAnswersResponse>(
    `/admin/content/categories/${categoryId}/answers`,
    { params: query },
  );

  return data;
}

export async function createAnswerApi(
  categoryId: number,
  payload: CreateAnswerPayload,
) {
  const { data } = await apiClient.post(
    `/admin/content/categories/${categoryId}/answers`,
    payload,
  );

  return data;
}

export async function updateAnswerApi(
  answerId: number,
  payload: UpdateAnswerPayload,
) {
  const { data } = await apiClient.patch(
    `/admin/content/answers/${answerId}`,
    payload,
  );

  return data;
}

export async function deleteAnswerApi(
  answerId: number,
  payload: DeleteAnswerPayload,
) {
  const { data } = await apiClient.delete(`/admin/content/answers/${answerId}`, {
    data: payload,
  });

  return data;
}

export async function createImportJobApi(payload: CreateImportJobPayload) {
  const { data } = await apiClient.post<ContentImportJob>(
    '/admin/content/import-jobs',
    payload,
  );

  return data;
}

export async function createImportJobFromCsvUploadApi(
  payload: CreateImportJobCsvUploadPayload,
) {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('reason', payload.reason);
  if (typeof payload.dryRun !== 'undefined') {
    formData.append('dryRun', String(payload.dryRun));
  }

  const { data } = await apiClient.post<ContentImportJob>(
    '/admin/content/import-jobs/upload-csv',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

export async function listImportJobsApi(
  query: ListImportJobsQuery,
): Promise<PaginatedResult<ContentImportJob>> {
  const { data } = await apiClient.get<PaginatedResult<ContentImportJob>>(
    '/admin/content/import-jobs',
    { params: query },
  );

  return data;
}

export async function getImportJobApi(jobId: string): Promise<ContentImportJob> {
  const { data } = await apiClient.get<ContentImportJob>(
    `/admin/content/import-jobs/${jobId}`,
  );

  return data;
}

export async function applyImportJobApi(
  jobId: string,
  payload: ApplyImportJobPayload,
): Promise<ContentImportJob> {
  const { data } = await apiClient.post<ContentImportJob>(
    `/admin/content/import-jobs/${jobId}/apply`,
    payload,
  );

  return data;
}
