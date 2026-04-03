import { Injectable } from '@nestjs/common';
import type {
  AiProviderResult,
  AiValidationRequest,
} from '../ai-validation.types.js';
import {
  normalizeModelOutput,
  type AiValidationProvider,
} from './ai-validation-provider.js';

@Injectable()
export class OllamaValidationProvider implements AiValidationProvider {
  readonly name = 'ollama' as const;

  getModel(): string {
    return process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  async validate(request: AiValidationRequest): Promise<AiProviderResult> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = this.getModel();

    const prompt = this.buildPrompt(request);
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { response?: string };
    if (!data.response) {
      throw new Error('Ollama response missing "response" field');
    }

    const parsed = JSON.parse(data.response) as unknown;
    return normalizeModelOutput(parsed);
  }

  private buildPrompt(request: AiValidationRequest): string {
    const known =
      request.knownAnswers.length > 0
        ? request.knownAnswers.slice(0, 20).join(', ')
        : '(none)';

    return [
      'Validate one answer for a letter-based category quiz.',
      `Target starting letter: ${request.letter.toUpperCase()}`,
      `Category: ${request.categoryName}`,
      `Player answer: ${request.answer}`,
      `Known examples in this category: ${known}`,
      'Return strict JSON only with this shape:',
      '{"valid": boolean, "confidence": number}',
      'Rules: valid=true only when category fit and starting letter fit. Confidence from 0 to 1.',
    ].join('\n');
  }
}
