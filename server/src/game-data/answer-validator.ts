// Server-side answer validation logic
import stringSimilarity from 'string-similarity';

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  matchedAnswer: string | null;
  reason: 'exact_match' | 'fuzzy_match' | 'no_match' | 'wrong_letter' | 'empty';
}

const FUZZY_THRESHOLD = 0.75;

export function validateAnswer(
  letter: string,
  userAnswer: string,
  knownAnswers: string[],
): ValidationResult {
  const trimmed = userAnswer.trim();

  // Empty check
  if (!trimmed) {
    return { valid: false, confidence: 0, matchedAnswer: null, reason: 'empty' };
  }

  // Letter check
  if (!trimmed.toUpperCase().startsWith(letter.toUpperCase())) {
    return {
      valid: false,
      confidence: 0,
      matchedAnswer: null,
      reason: 'wrong_letter',
    };
  }

  // Exact match (case-insensitive)
  const exactMatch = knownAnswers.find(
    (a) => a.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exactMatch) {
    return {
      valid: true,
      confidence: 1.0,
      matchedAnswer: exactMatch,
      reason: 'exact_match',
    };
  }

  // Fuzzy match
  if (knownAnswers.length > 0) {
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
      trimmed.toLowerCase(),
      knownAnswers.map((a) => a.toLowerCase()),
    );

    if (bestMatch.rating >= FUZZY_THRESHOLD) {
      return {
        valid: true,
        confidence: bestMatch.rating,
        matchedAnswer: knownAnswers[bestMatchIndex],
        reason: 'fuzzy_match',
      };
    }
  }

  // If we don't have answers for this category, be lenient
  if (knownAnswers.length === 0) {
    return {
      valid: true,
      confidence: 0.5,
      matchedAnswer: trimmed,
      reason: 'fuzzy_match',
    };
  }

  return { valid: false, confidence: 0, matchedAnswer: null, reason: 'no_match' };
}
