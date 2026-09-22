import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { AnalysisErrorType } from '../generated/prisma/enums.js';
import {
  ANALYSIS_PROVIDER,
  type AnalysisInput,
  type AnalysisProvider,
  InvalidOutputError,
} from './analysis-provider.js';
import {
  type AnalysisResult,
  analysisResultSchema,
} from './analysis.schema.js';

const MAX_STORED = 4000;

export interface AnalysisAttemptData {
  success: boolean;
  errorType: AnalysisErrorType | null;
  errorMessage: string | null;
  rawOutput: string | null;
  model: string;
  latencyMs: number;
}

export interface AnalysisOutcome {
  result: AnalysisResult | null;
  attempt: AnalysisAttemptData;
}

const toText = (value: unknown) =>
  (typeof value === 'string' ? value : (JSON.stringify(value) ?? '')).slice(
    0,
    MAX_STORED,
  );

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly timeoutMs: number;

  constructor(
    @Inject(ANALYSIS_PROVIDER) private readonly provider: AnalysisProvider,
    config: ConfigService<Env, true>,
  ) {
    this.timeoutMs = config.get('AI_TIMEOUT_MS', { infer: true });
  }

  // Never throws: every provider failure becomes a recorded, typed outcome.
  async analyse(input: AnalysisInput): Promise<AnalysisOutcome> {
    const startedAt = Date.now();
    const signal = AbortSignal.timeout(this.timeoutMs);
    const attempt = (data: Partial<AnalysisAttemptData>) => ({
      success: false,
      errorType: null,
      errorMessage: null,
      rawOutput: null,
      model: this.provider.model,
      latencyMs: Date.now() - startedAt,
      ...data,
    });
    const fail = (
      errorType: AnalysisErrorType,
      errorMessage: string,
      raw?: unknown,
    ): AnalysisOutcome => {
      this.logger.warn(`Analysis failed (${errorType}): ${errorMessage}`);
      return {
        result: null,
        attempt: attempt({
          errorType,
          errorMessage: errorMessage.slice(0, MAX_STORED),
          rawOutput: raw === undefined ? null : toText(raw),
        }),
      };
    };

    let raw: unknown;
    try {
      // Race against the signal so a provider that ignores abort still times out.
      raw = await Promise.race([
        this.provider.analyse(input, signal),
        new Promise<never>((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          }),
        ),
      ]);
    } catch (error) {
      if (signal.aborted) {
        return fail(
          AnalysisErrorType.TIMEOUT,
          `AI provider did not respond within ${this.timeoutMs}ms`,
        );
      }
      if (error instanceof InvalidOutputError) {
        return fail(AnalysisErrorType.INVALID_OUTPUT, error.message, error.raw);
      }
      return fail(
        AnalysisErrorType.PROVIDER_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    }

    const parsed = analysisResultSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = [
        ...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'root')),
      ];
      return fail(
        AnalysisErrorType.INVALID_OUTPUT,
        `AI returned an invalid result (${fields.join(', ')})`,
        raw,
      );
    }
    return {
      result: parsed.data,
      attempt: attempt({ success: true, rawOutput: toText(parsed.data) }),
    };
  }
}
