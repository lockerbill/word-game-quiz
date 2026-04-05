import { Module } from '@nestjs/common';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module.js';
import { AiValidationService } from './ai-validation.service.js';
import { OpenAiValidationProvider } from './providers/openai.provider.js';
import { OllamaValidationProvider } from './providers/ollama.provider.js';
import { GeminiValidationProvider } from './providers/gemini.provider.js';

@Module({
  imports: [AdminSettingsModule],
  providers: [
    AiValidationService,
    OpenAiValidationProvider,
    OllamaValidationProvider,
    GeminiValidationProvider,
  ],
  exports: [AiValidationService],
})
export class AiValidationModule {}
