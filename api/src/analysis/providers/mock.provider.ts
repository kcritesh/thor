import type { MockMode } from '../../config/env.js';
import type { AnalysisResult } from '../analysis.schema.js';
import type { AnalysisInput, AnalysisProvider } from '../analysis-provider.js';

const ACTIONS: Record<AnalysisResult['category'], string> = {
  DOCUMENT_REQUEST: 'Request the missing document from the applicant.',
  INFORMATION_REQUEST: 'Reply with the requested information.',
  COMPLAINT: 'Acknowledge the complaint and escalate to a team lead.',
  TECHNICAL_ISSUE: 'Raise a ticket with the technical support team.',
  GENERAL_INQUIRY: 'Respond to the customer inquiry.',
  OTHER: 'Review manually and route to the right team.',
};

function waitForAbort(signal: AbortSignal, ms = Infinity) {
  return new Promise<void>((resolve, reject) => {
    const timer = Number.isFinite(ms) ? setTimeout(resolve, ms) : undefined;
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

// Deterministic stand-in for an LLM. `mode` simulates each failure the real
// provider can produce so the app and tests can exercise them.
export class MockProvider implements AnalysisProvider {
  readonly model = 'mock';

  constructor(
    public mode: MockMode = 'success',
    public delayMs = 600,
  ) {}

  async analyse(input: AnalysisInput, signal: AbortSignal): Promise<unknown> {
    if (this.mode === 'timeout') return waitForAbort(signal);
    await waitForAbort(signal, this.delayMs);

    switch (this.mode) {
      case 'error':
        throw new Error('Mock provider unavailable (503)');
      case 'malformed':
        return '{"category": "DOCUMENT_REQ';
      case 'invalid':
        return { category: 'BANANA', priority: 'SOON', summary: '' };
      default:
        return this.classify(input);
    }
  }

  private classify({ title, description }: AnalysisInput): AnalysisResult {
    const text = `${title} ${description}`.toLowerCase();
    const category: AnalysisResult['category'] =
      /document|payslip|proof|statement|upload/.test(text)
        ? 'DOCUMENT_REQUEST'
        : /complain|unhappy|refund|angry/.test(text)
          ? 'COMPLAINT'
          : /error|bug|login|crash|broken/.test(text)
            ? 'TECHNICAL_ISSUE'
            : /\?|question|how|when/.test(text)
              ? 'INFORMATION_REQUEST'
              : 'GENERAL_INQUIRY';
    const priority: AnalysisResult['priority'] =
      /urgent|asap|immediately|today/.test(text)
        ? 'URGENT'
        : category === 'DOCUMENT_REQUEST' || category === 'COMPLAINT'
          ? 'HIGH'
          : 'MEDIUM';
    return {
      category,
      priority,
      summary:
        description.length > 200
          ? `${description.slice(0, 197)}...`
          : description,
      recommendedAction: ACTIONS[category],
    };
  }
}
