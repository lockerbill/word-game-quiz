export interface PaginatedResult<T> {
  page: number;
  limit: number;
  total: number;
  data: T[];
}

export interface Category {
  id: number;
  name: string;
  difficulty: number;
  emoji: string;
  enabled: boolean;
  createdAt: string;
  answerCount: number;
}

export interface ListCategoriesQuery {
  search?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateCategoryPayload {
  name: string;
  difficulty?: number;
  emoji?: string;
  enabled?: boolean;
  reason: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  difficulty?: number;
  emoji?: string;
  enabled?: boolean;
  reason?: string;
}

export interface SetCategoryEnabledPayload {
  enabled: boolean;
  reason: string;
}

export interface Answer {
  id: number;
  categoryId: number;
  letter: string;
  answer: string;
}

export interface ListAnswersQuery {
  letter?: string;
  page?: number;
  limit?: number;
}

export interface ListAnswersResponse extends PaginatedResult<Answer> {
  category: {
    id: number;
    name: string;
    enabled: boolean;
  };
}

export interface CreateAnswerPayload {
  letter: string;
  answer: string;
  reason: string;
}

export interface UpdateAnswerPayload {
  letter?: string;
  answer?: string;
  reason?: string;
}

export interface DeleteAnswerPayload {
  reason: string;
}

export type ContentImportJobStatus =
  | 'validated'
  | 'failed_validation'
  | 'applied';

export interface ContentImportIssue {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ContentImportJob {
  id: string;
  createdByUserId: string | null;
  status: ContentImportJobStatus;
  format: 'csv' | 'json';
  dryRun: boolean;
  reason: string | null;
  sourcePayload: string;
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
  };
  validationErrors: ContentImportIssue[] | null;
  validationWarnings: ContentImportIssue[] | null;
  applyResult: Record<string, unknown> | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListImportJobsQuery {
  status?: ContentImportJobStatus;
  page?: number;
  limit?: number;
}

export interface CreateImportJobPayload {
  format: 'csv' | 'json';
  payload: string;
  dryRun?: boolean;
  reason: string;
}

export interface CreateImportJobCsvUploadPayload {
  file: File;
  dryRun?: boolean;
  reason: string;
}

export interface ApplyImportJobPayload {
  reason: string;
}
