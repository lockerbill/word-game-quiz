import type {
  AiProviderResult,
  AiValidationRequest,
} from '../ai-validation.types.js';

export interface AiValidationProvider {
  readonly name: 'openai' | 'ollama';
  getModel(): string;
  validate(request: AiValidationRequest): Promise<AiProviderResult>;
}

export function extractFirstJsonObject(raw: string): string {
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON object found in model response');
  }

  return raw.slice(first, last + 1);
}

export function normalizeModelOutput(payload: unknown): AiProviderResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Model response is not an object');
  }

  const valid = (payload as { valid?: unknown }).valid;
  const confidence = (payload as { confidence?: unknown }).confidence;

  if (typeof valid !== 'boolean') {
    throw new Error('Model response missing boolean "valid"');
  }

  let parsedConfidence: number;
  if (typeof confidence === 'number') {
    parsedConfidence = confidence;
  } else if (typeof confidence === 'string') {
    parsedConfidence = Number(confidence);
  } else {
    throw new Error('Model response missing numeric "confidence"');
  }

  if (!Number.isFinite(parsedConfidence)) {
    throw new Error('Model response confidence is not finite');
  }

  const clamped = Math.max(0, Math.min(1, parsedConfidence));
  return { valid, confidence: clamped };
}
