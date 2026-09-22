export const ANALYSIS_PROVIDER = Symbol('ANALYSIS_PROVIDER');

export interface AnalysisInput {
  title: string;
  description: string;
}

// Providers return raw, untrusted output. AnalysisService owns validation.
export interface AnalysisProvider {
  readonly model: string;
  analyse(input: AnalysisInput, signal: AbortSignal): Promise<unknown>;
}

export class InvalidOutputError extends Error {
  constructor(
    message: string,
    readonly raw?: string,
  ) {
    super(message);
  }
}
