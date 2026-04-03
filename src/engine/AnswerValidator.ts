// Shared validation result type for server response rendering

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  matchedAnswer: string | null;
  provider?: string | null;
  reason:
    | 'exact_match'
    | 'fuzzy_match'
    | 'no_match'
    | 'wrong_letter'
    | 'empty'
    | 'ai_validated'
    | 'ai_rejected'
    | 'ai_error';
}
