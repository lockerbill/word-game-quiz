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
export class OpenAiValidationProvider implements AiValidationProvider {
  readonly name = 'openai' as const;

  getModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async validate(request: AiValidationRequest): Promise<AiProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = this.getModel();

    const prompt = this.buildPrompt(request);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are an answer validation engine for a word quiz. Reply with JSON only: {"valid": boolean, "confidence": number}. Confidence must be 0..1.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI response missing message content');
    }

    const jsonText = extractFirstJsonObject(content);
    const parsed = JSON.parse(jsonText) as unknown;
    return normalizeModelOutput(parsed);
  }

  private buildPrompt(request: AiValidationRequest): string {
    const known =
      request.knownAnswers.length > 0
        ? request.knownAnswers.slice(0, 20).join(', ')
        : '(none)';

    return [
      `Target starting letter: ${request.letter.toUpperCase()}`,
      `Category: ${request.categoryName}`,
      `Player answer: ${request.answer}`,
      `Known examples in this category: ${known}`,
      'Rules:',
      '1) valid=true only if answer belongs to category and starts with target letter.',
      '2) If uncertain, set valid=false and confidence below 0.5.',
      '3) Return JSON only with keys valid, confidence.',
    ].join('\n');
  }
}
