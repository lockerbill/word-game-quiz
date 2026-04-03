import { Module } from '@nestjs/common';
import { AiValidationService } from './ai-validation.service.js';
import { OpenAiValidationProvider } from './providers/openai.provider.js';
import { OllamaValidationProvider } from './providers/ollama.provider.js';
import { GeminiValidationProvider } from './providers/gemini.provider.js';

@Module({
  providers: [
    AiValidationService,
    OpenAiValidationProvider,
    OllamaValidationProvider,
    GeminiValidationProvider,
  ],
  exports: [AiValidationService],
})
export class AiValidationModule {}
