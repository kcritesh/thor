import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { AnalysisProvider } from './analysis-provider.js';
import { AnalysisService } from './analysis.service.js';

const input = { title: 'Missing payslip', description: 'Please send it.' };
const config = { get: () => 50 } as unknown as ConfigService<Env, true>;
const serviceWith = (analyse: AnalysisProvider['analyse']) =>
  new AnalysisService({ model: 'test', analyse }, config);

describe('AnalysisService', () => {
  it('times out a provider that ignores the abort signal', async () => {
    const service = serviceWith(() => new Promise(() => {}));

    const { result, attempt } = await service.analyse(input);

    expect(result).toBeNull();
    expect(attempt).toMatchObject({ success: false, errorType: 'TIMEOUT' });
  });

  it('rejects output with unexpected values and keeps the raw output', async () => {
    const raw = {
      category: 'DOCUMENT_REQUEST',
      priority: 'CRITICAL',
      summary: 'x',
      recommendedAction: 'y',
    };
    const service = serviceWith(async () => raw);

    const { result, attempt } = await service.analyse(input);

    expect(result).toBeNull();
    expect(attempt.errorType).toBe('INVALID_OUTPUT');
    expect(attempt.rawOutput).toBe(JSON.stringify(raw));
  });

  it('returns a validated result on success', async () => {
    const service = serviceWith(async () => ({
      category: 'DOCUMENT_REQUEST',
      priority: 'HIGH',
      summary: '  Needs payslip  ',
      recommendedAction: 'Request payslip',
    }));

    const { result, attempt } = await service.analyse(input);

    expect(result).toMatchObject({ summary: 'Needs payslip' });
    expect(attempt.success).toBe(true);
  });
});
