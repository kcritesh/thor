import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { ANALYSIS_PROVIDER } from './analysis-provider.js';
import { AnalysisService } from './analysis.service.js';
import { MockProvider } from './providers/mock.provider.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';

@Module({
  providers: [
    AnalysisService,
    {
      provide: ANALYSIS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('AI_PROVIDER', { infer: true }) === 'openrouter'
          ? new OpenRouterProvider(
              config.get('OPENROUTER_API_KEY', { infer: true })!,
              config.get('OPENROUTER_MODEL', { infer: true }),
            )
          : new MockProvider(config.get('MOCK_MODE', { infer: true })),
    },
  ],
  exports: [AnalysisService, ANALYSIS_PROVIDER],
})
export class AnalysisModule {}
