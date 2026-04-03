export type ValidationReason =
  | 'exact_match'
  | 'fuzzy_match'
  | 'no_match'
  | 'wrong_letter'
  | 'empty'
  | 'ai_validated'
  | 'ai_rejected'
  | 'ai_error';

export interface AiValidationRequest {
  letter: string;
  categoryName: string;
  answer: string;
  knownAnswers: string[];
}

export interface AiProviderResult {
  valid: boolean;
  confidence: number;
}

export interface AiValidationResult {
  valid: boolean;
  confidence: number;
  reason: ValidationReason;
  provider: string | null;
  model: string | null;
}
