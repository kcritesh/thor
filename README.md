# Thor - AI-Assisted Work Intake System

An operations tool that receives work items from an external system, analyses them with an LLM, and lets an ops user review and complete them.

- **Backend:** TypeScript, NestJS, Prisma, PostgreSQL
- **AI:** Vercel AI SDK + OpenRouter (`deepseek/deepseek-v4-flash`), with a built-in mock provider
- **Frontend:** React + Vite, TanStack Query, Tailwind + shadcn/ui, Hugeicons
- **Tests:** Vitest + Supertest against a real Postgres database

## Setup

### Everything in Docker

```bash
cp .env.example .env          # optional: set AI_PROVIDER=openrouter and OPENROUTER_API_KEY
docker compose up --build
```

Open http://localhost:8080. The API is proxied at http://localhost:8080/api.
Without a key the app uses the mock AI provider, so it runs out of the box.

### Local development

Requires Node 24 and pnpm 11.

```bash
cp .env.example .env
docker compose up -d db                       # Postgres on localhost:5433

cd api
pnpm install
pnpm db:deploy                                # apply migrations
pnpm start:dev                                # http://localhost:3000/api

cd ../web
pnpm install
pnpm dev                                      # http://localhost:5173 (proxies /api)
```

### Tests

```bash
cd api
pnpm test        # unit: workflow rules, AnalysisService timeout/validation
pnpm test:e2e    # HTTP + real Postgres (creates and migrates the thor_test database)
```

E2E tests use `postgresql://thor:thor@127.0.0.1:5433/thor_test` by default. Override with `TEST_DATABASE_URL`.

### Try it with curl

```bash
curl -X POST localhost:8080/api/work-items -H 'content-type: application/json' \
  -d '{"externalId":"CRM-12345","title":"Missing income document","description":"The applicant has not provided their latest payslip."}'
# 201 the first time, 200 with the same item on repeats
```

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | – | Postgres connection string |
| `AI_PROVIDER` | `mock` | `openrouter` or `mock` |
| `OPENROUTER_API_KEY` | – | Required when `AI_PROVIDER=openrouter` |
| `OPENROUTER_MODEL` | `deepseek/deepseek-v4-flash` | Any OpenRouter model with structured output |
| `AI_TIMEOUT_MS` | `20000` | Hard timeout per analysis call |
| `MOCK_MODE` | `success` | `success`, `malformed`, `invalid`, `timeout`, `error` |

Environment variables are validated with Zod at startup, so a missing key fails fast instead of at the first request.

## API

| Method | Path | Result |
|---|---|---|
| `POST` | `/api/work-items` | `201` created, `200` if `externalId` already exists (returns the existing item) |
| `GET` | `/api/work-items?status=FAILED` | List, newest first, optional status filter |
| `GET` | `/api/work-items/:id` | Item with its analysis attempts |
| `POST` | `/api/work-items/:id/analyse` | `RECEIVED → ANALYSING → READY_FOR_REVIEW \| FAILED` |
| `POST` | `/api/work-items/:id/retry` | Same as analyse, only from `FAILED` |
| `PATCH` | `/api/work-items/:id/status` | Body `{ "status": "COMPLETED" }`, only from `READY_FOR_REVIEW` |

Errors: `400` for invalid input or a status that can't be set by hand, `404` for an unknown item, `409` when the item is not in a status that allows the action (for example, completing an item that was never analysed).

## Architecture

```
web (React)  ──HTTP──▶  WorkItemsController ── DTO validation (class-validator)
                              │
                        WorkItemsService ── workflow.ts (transition map, pure)
                              │     └────── AnalysisService ── timeout, Zod validation, error typing
                              │                    └── AnalysisProvider: OpenRouterProvider | MockProvider
                        PrismaService ──▶ PostgreSQL (work_items, analysis_attempts)
```

```
api/src
  work-items/   controller, service, DTOs, workflow.ts (all transition rules)
  analysis/     AnalysisService, Zod schema, provider interface, OpenRouter + mock providers
  prisma/       PrismaService
  config/       env schema
web/src
  hooks/        TanStack Query hooks (list, detail, actions)
  components/   queue list, status filter, detail panel, next-step bar, create dialog
  lib/          typed API client, status metadata
```

- **Controllers** only handle HTTP concerns: validation, status codes.
- **`WorkItemsService`** owns persistence and state changes. Every status change goes through one `transition()` helper.
- **`workflow.ts`** is a pure transition map. Both the service and the unit tests use it, and `PATCH` derives its allowed sources from it.
- **`AnalysisService`** turns any provider behaviour into a typed outcome and never throws. Providers return raw, untrusted output.
- **The frontend** derives the available action from the item's status, so the UI can't offer an action the API would reject.

### Workflow

| From | To | Trigger |
|---|---|---|
| `RECEIVED` | `ANALYSING` | analyse |
| `ANALYSING` | `READY_FOR_REVIEW` | valid AI result |
| `ANALYSING` | `FAILED` | timeout, invalid output, provider error |
| `FAILED` | `ANALYSING` | retry |
| `READY_FOR_REVIEW` | `COMPLETED` | ops user |
| `COMPLETED` | – | terminal |

## Assumptions

- `externalId` identifies an item in the source system. A repeated POST is a redelivery, so the original item is returned unchanged even if the title or description differ. Updating items from the source system is out of scope.
- Only `COMPLETED` is a human decision. `ANALYSING`, `READY_FOR_REVIEW` and `FAILED` are set by the system, so `PATCH /status` rejects them.
- Retry is allowed only from `FAILED`. Re-analysing an item that is ready for review or completed is not supported, because it would overwrite a result someone may already be acting on.
- Analysis is triggered by an ops user, not automatically on intake. That keeps LLM cost under human control, and it is what the frontend requirements describe.
- A failed analysis is a normal outcome, not a server error: `analyse` and `retry` return `200` with the item in `FAILED` and a readable `lastError`. HTTP errors are reserved for requests that were invalid or not allowed.
- No authentication, pagination or multi-tenant separation. Assumed a small internal tool for this exercise (see production considerations).

## Technical decisions

**1. The database enforces integrity, not application code.**
Duplicate protection is a unique index on `external_id`. Concurrent POSTs race on the insert; the loser gets Prisma `P2002` and reads back the winner's row. No locks or pre-checks, which would have a check-then-insert race anyway. Status changes use compare-and-set: `UPDATE ... WHERE id = ? AND status IN (allowed sources) RETURNING *`. If two users click analyse at the same time, exactly one claims `ANALYSING` and calls the LLM; the other gets `409`. Both behaviours have concurrent e2e tests.

**2. LLM output is treated as untrusted input.**
The OpenRouter provider asks for structured output with a JSON schema, but `AnalysisService` validates again with Zod no matter which provider ran. The provider call also races against an abort signal, so a provider that ignores cancellation still times out. Each failure becomes a typed attempt (`TIMEOUT`, `INVALID_OUTPUT`, `PROVIDER_ERROR`) with latency, model and raw output stored in `analysis_attempts`. The result write is conditional on the item still being `ANALYSING`, and a failed analysis only writes `lastError`, so bad AI output can never leave a half-updated item. If saving the result itself fails, the item is moved to `FAILED` so it stays retryable.

**3. Synchronous analysis instead of a queue (trade-off).**
`POST /analyse` waits for the LLM (bounded by `AI_TIMEOUT_MS`) and returns the final item. That keeps the system to one process with no worker, queue or polling, and the UI shows a clear in-progress state. The cost: a slow model holds an HTTP request open, and if the process crashes mid-call the item stays in `ANALYSING`. For this scope that trade is worth it. The production answer is below.

## Production considerations

- **Background processing:** move analysis to a job queue (for example BullMQ or pg-boss). `analyse` claims the item and returns `202`; a worker runs the LLM call with retries and backoff. Add a reaper that moves items stuck in `ANALYSING` past a deadline to `FAILED`.
- **Auth:** service-to-service auth (API key or mTLS) on intake, and SSO for ops users with roles. Record who completed each item (`completedBy`) and keep a status history table for auditing.
- **LLM reliability and cost:** per-item attempt cap, circuit breaker and fallback model on provider outages, rate limiting, token and cost tracking per attempt, prompt versioning stored on each attempt, and an evaluation set to catch misclassification regressions. Redact PII before sending to a third-party model where required.
- **Observability:** structured logs with a request id, metrics for analysis latency, failure rate by error type and queue depth, and tracing across API, worker and provider.
- **Data:** cursor pagination and search on the list endpoint, retention policy for raw model output, and an `updated` flow if the source system can legitimately change items.
- **Security:** secrets in a secret manager, stricter CORS, request size limits, rate limiting on intake.

## AI usage

> Draft: to be reviewed and edited before submission.

- **Tools:** Claude Code (Claude Opus).
- **What for:** turning the architecture into an epic-by-epic plan, scaffolding NestJS/Prisma/Vite, writing services, tests and UI components, and checking library APIs (AI SDK v7, Prisma 7) against the installed type definitions instead of memory.
- **How it was verified:** every epic was built, linted and exercised before commit: curl smoke tests (including 8 concurrent duplicate POSTs), a real OpenRouter call, repeated e2e runs against Postgres to catch flakiness, and browser screenshots of each UI state (review, failed, analysing, empty, mobile).
- **What was changed or rejected:**
  - The first prompt let the model classify a missing payslip as `INFORMATION_REQUEST`. Added explicit category definitions.
  - Invalid-output errors first surfaced the full Zod report to ops users. Replaced with a short field list; the raw output is still kept on the attempt.
  - Rejected app-level locking or "find then create" for duplicates in favour of the unique index plus `P2002` handling.
  - Rejected auto-analysing on intake and a background queue for this scope (see decision 3).
  - Dropped React Router and monorepo tooling from the original plan as unnecessary for one screen.
