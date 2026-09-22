import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ANALYSIS_PROVIDER } from '../src/analysis/analysis-provider.js';
import { MockProvider } from '../src/analysis/providers/mock.provider.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Work items API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mock: MockProvider;

  const api = () => request(app.getHttpServer());
  const create = (externalId = 'CRM-12345') =>
    api().post('/api/work-items').send({
      externalId,
      title: 'Missing income document',
      description: 'The applicant has not provided their latest payslip.',
    });
  const createId = async () => (await create().expect(201)).body.id as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    prisma = app.get(PrismaService);
    mock = app.get(ANALYSIS_PROVIDER);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE work_items CASCADE`;
    mock.mode = 'success';
    mock.delayMs = 50;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('intake', () => {
    it('returns the existing item for a repeated externalId', async () => {
      const first = await create().expect(201);
      const second = await create().expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(await prisma.workItem.count()).toBe(1);
    });

    it('creates exactly one item under concurrent duplicate requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () => create('CRM-RACE')),
      );

      const statuses = responses.map((r) => r.status).sort((a, b) => a - b);
      expect(statuses).toEqual([
        200, 200, 200, 200, 200, 200, 200, 200, 200, 201,
      ]);
      expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
      expect(await prisma.workItem.count()).toBe(1);
    });

    it('rejects invalid payloads', async () => {
      await api()
        .post('/api/work-items')
        .send({ externalId: '  ', title: 'x', unexpected: true })
        .expect(400);
      expect(await prisma.workItem.count()).toBe(0);
    });
  });

  describe('workflow', () => {
    it('runs the happy path and makes COMPLETED terminal', async () => {
      const id = await createId();

      const analysed = await api()
        .post(`/api/work-items/${id}/analyse`)
        .expect(200);
      expect(analysed.body).toMatchObject({
        status: 'READY_FOR_REVIEW',
        category: 'DOCUMENT_REQUEST',
      });

      await api()
        .patch(`/api/work-items/${id}/status`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      await api().post(`/api/work-items/${id}/analyse`).expect(409);
      await api().post(`/api/work-items/${id}/retry`).expect(409);
      await api()
        .patch(`/api/work-items/${id}/status`)
        .send({ status: 'COMPLETED' })
        .expect(409);
    });

    it('rejects skipping analysis and setting system-managed statuses', async () => {
      const id = await createId();

      await api()
        .patch(`/api/work-items/${id}/status`)
        .send({ status: 'COMPLETED' })
        .expect(409);
      await api()
        .patch(`/api/work-items/${id}/status`)
        .send({ status: 'READY_FOR_REVIEW' })
        .expect(400);
      await api().post(`/api/work-items/${id}/retry`).expect(409);

      const item = await prisma.workItem.findUniqueOrThrow({ where: { id } });
      expect(item.status).toBe('RECEIVED');
    });

    it('lets only one of two concurrent analyse requests run', async () => {
      const id = await createId();

      const responses = await Promise.all([
        api().post(`/api/work-items/${id}/analyse`),
        api().post(`/api/work-items/${id}/analyse`),
      ]);

      expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        200, 409,
      ]);
      expect(await prisma.analysisAttempt.count()).toBe(1);
    });

    it('returns 404 for unknown items', async () => {
      await api()
        .post('/api/work-items/00000000-0000-4000-8000-000000000000/analyse')
        .expect(404);
    });
  });

  describe('AI failures', () => {
    it.each([
      ['malformed', 'INVALID_OUTPUT'],
      ['invalid', 'INVALID_OUTPUT'],
      ['timeout', 'TIMEOUT'],
      ['error', 'PROVIDER_ERROR'],
    ] as const)(
      '%s output marks the item FAILED without corrupting it, and retry recovers',
      async (mode, errorType) => {
        const id = await createId();
        mock.mode = mode;

        const failed = await api()
          .post(`/api/work-items/${id}/analyse`)
          .expect(200);
        expect(failed.body).toMatchObject({
          status: 'FAILED',
          category: null,
          priority: null,
          summary: null,
          recommendedAction: null,
          analysedAt: null,
        });
        expect(failed.body.lastError).toEqual(expect.any(String));
        expect(failed.body.attempts).toEqual([
          expect.objectContaining({ success: false, errorType }),
        ]);

        mock.mode = 'success';
        const retried = await api()
          .post(`/api/work-items/${id}/retry`)
          .expect(200);
        expect(retried.body).toMatchObject({
          status: 'READY_FOR_REVIEW',
          lastError: null,
        });
        expect(retried.body.attempts).toHaveLength(2);
      },
    );
  });
});
