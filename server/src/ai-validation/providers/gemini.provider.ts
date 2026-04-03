import { Injectable } from '@nestjs/common';
import type {
  AiProviderResult,
  AiValidationRequest,
} from '../ai-validation.types.js';
import {
  extractFirstJsonObject,
  normalizeModelOutput,
  type AiValidationProvider,
} from './ai-validation-provider.js';

@Injectable()
export class GeminiValidationProvider implements AiValidationProvider {
  readonly name = 'gemini' as const;

  getModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async validate(request: AiValidationRequest): Promise<AiProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const baseUrl =
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com';
    const model = this.getModel();
    const prompt = this.buildPrompt(request);
    const response = await fetch(
      `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(
        (part): part is string => typeof part === 'string' && part.length > 0,
      )
      .join('\n');

    if (!text) {
      throw new Error('Gemini response missing text content');
    }

    const jsonText = extractFirstJsonObject(text);
    const parsed = JSON.parse(jsonText) as unknown;
    return normalizeModelOutput(parsed);
  }

  private buildPrompt(request: AiValidationRequest): string {
    const known =
      request.knownAnswers.length > 0
        ? request.knownAnswers.slice(0, 20).join(', ')
        : '(none)';

    return [
      'You are an answer validation engine for a word quiz.',
      `Target starting letter: ${request.letter.toUpperCase()}`,
      `Category: ${request.categoryName}`,
      `Player answer: ${request.answer}`,
      `Known examples in this category: ${known}`,
      'Rules:',
      '1) valid=true only if answer belongs to category and starts with target letter.',
      '2) If uncertain, set valid=false and confidence below 0.5.',
      '3) Return JSON only with keys valid, confidence.',
      '4) Confidence must be a number from 0 to 1.',
    ].join('\n');
  }
}
