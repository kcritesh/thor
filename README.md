# Thor - AI-Assisted Work Intake System

Receives work items from an external system, analyses them with an LLM, and lets an ops user review and complete them.

- **Backend:** NestJS, Prisma, PostgreSQL
- **AI:** Vercel AI SDK + OpenRouter (`deepseek/deepseek-v4-flash`), plus a mock provider
- **Frontend:** React + Vite, TanStack Query, Tailwind + shadcn/ui, Hugeicons
- **Tests:** Vitest + Supertest against real Postgres

## Quick start

```bash
cp .env.example .env     # optional: AI_PROVIDER=openrouter + OPENROUTER_API_KEY
docker compose up --build
```

Open http://localhost:8080 (API at `/api`). No key needed: the mock provider is the default.

```bash
curl -X POST localhost:8080/api/work-items -H 'content-type: application/json' \
  -d '{"externalId":"CRM-12345","title":"Missing income document","description":"The applicant has not provided their latest payslip."}'
# 201 first time, 200 with the same item on repeats
```

### Local development

Node 24, pnpm 11. Run api and web in separate terminals from repo root.

```bash
cp .env.example .env
docker compose up -d db            # Postgres on localhost:5433
cd api && pnpm install && pnpm db:deploy && pnpm start:dev   # :3000/api
cd web && pnpm install && pnpm dev                           # :5173, proxies /api
```

### Tests

```bash
cd api
pnpm test        # unit: workflow rules, analysis timeout/validation
pnpm test:e2e    # HTTP + real Postgres (auto-creates thor_test)
```

E2E uses `postgresql://thor:thor@127.0.0.1:5433/thor_test`; override with `TEST_DATABASE_URL`.

### Configuration

Validated with Zod at startup, so bad config fails fast.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | – | Postgres connection string |
| `AI_PROVIDER` | `mock` | `openrouter` or `mock` |
| `OPENROUTER_API_KEY` | – | Required for `openrouter` |
| `OPENROUTER_MODEL` | `deepseek/deepseek-v4-flash` | Any model with structured output |
| `AI_TIMEOUT_MS` | `20000` | Timeout per analysis call |
| `MOCK_MODE` | `success` | `success`, `malformed`, `invalid`, `timeout`, `error` |

## API

| Method | Path | Result |
|---|---|---|
| `POST` | `/api/work-items` | `201` created, `200` if `externalId` exists (returns existing item) |
| `GET` | `/api/work-items?status=FAILED` | List, newest first, optional filter |
| `GET` | `/api/work-items/:id` | Item with analysis attempts |
| `POST` | `/api/work-items/:id/analyse` | `RECEIVED → ANALYSING → READY_FOR_REVIEW \| FAILED` |
| `POST` | `/api/work-items/:id/retry` | Same, only from `FAILED` |
| `PATCH` | `/api/work-items/:id/status` | `{ "status": "COMPLETED" }`, only from `READY_FOR_REVIEW` |

Errors: `400` invalid input, `404` unknown item, `409` action not allowed in current status.

## Workflow

```
RECEIVED ──analyse──▶ ANALYSING ──valid result──▶ READY_FOR_REVIEW ──ops user──▶ COMPLETED
                         │  ▲
     timeout / invalid / │  │ retry
     provider error      ▼  │
                         FAILED
```

## Architecture

```
web ──HTTP──▶ WorkItemsController   (DTO validation)
                   │
              WorkItemsService ──── workflow.ts   (transition map, pure)
                   │         └───── AnalysisService ── OpenRouterProvider | MockProvider
              PrismaService ──▶ PostgreSQL (work_items, analysis_attempts)
```

- **Controllers** handle HTTP only.
- **`WorkItemsService`** owns persistence. Every status change goes through one `transition()` helper.
- **`workflow.ts`** holds all transition rules. Service, tests and `PATCH` validation all use it.
- **`AnalysisService`** turns any provider behaviour into a typed outcome and never throws.
- **Frontend** derives the available action from status, so it never offers what the API would reject.

## Assumptions

- `externalId` identifies the source item. A repeat POST is a redelivery: the original is returned unchanged, even if the content differs.
- Only `COMPLETED` is set by a human. Other statuses are system-set, so `PATCH` rejects them.
- Retry only from `FAILED`. Re-analysing a reviewed or completed item would overwrite a result someone may be acting on.
- Analysis is triggered by an ops user, not on intake, to keep LLM cost under human control.
- A failed analysis is a normal outcome: `analyse`/`retry` return `200` with the item in `FAILED` and a readable `lastError`.
- No auth, pagination or multi-tenancy. Small internal tool for this exercise.

## Technical decisions

**1. The database enforces integrity.**
Duplicates are blocked by a unique index on `external_id`. Concurrent POSTs race on insert; the loser catches Prisma `P2002` and returns the winner's row. No locks or check-then-insert. Status changes are compare-and-set (`UPDATE ... WHERE id = ? AND status IN (...)`), so if two users click analyse, exactly one calls the LLM and the other gets `409`. Both cases have concurrent e2e tests.

**2. LLM output is untrusted.**
OpenRouter is asked for structured output, but `AnalysisService` re-validates with Zod regardless of provider, and races the call against a timeout. Each failure is stored as a typed attempt (`TIMEOUT`, `INVALID_OUTPUT`, `PROVIDER_ERROR`) with latency, model and raw output. The result write is conditional on the item still being `ANALYSING`, so bad output never leaves a half-updated item. If saving the result fails, the item moves to `FAILED` so it stays retryable.

**3. Synchronous analysis, no queue (trade-off).**
`POST /analyse` waits for the LLM (bounded by `AI_TIMEOUT_MS`). One process, no worker or polling. Cost: slow models hold a request open, and a crash mid-call leaves the item in `ANALYSING`. Fine for this scope; fix below.

## Production considerations

- **Background jobs:** queue (BullMQ / pg-boss), `analyse` returns `202`, worker retries with backoff, reaper fails items stuck in `ANALYSING`.
- **Auth & audit:** API key or mTLS on intake, SSO with roles for ops, `completedBy` and a status history table.
- **LLM:** attempt cap, fallback model, rate limits, cost tracking, prompt versioning, eval set, PII redaction.
- **Observability:** structured logs with request id, latency/failure metrics, tracing.
- **Data & security:** cursor pagination, search, raw output retention, secret manager, stricter CORS, request size limits.

## AI usage

- **Tool:** Claude Code (Claude Opus).
- **Used for:** epic-by-epic plan, scaffolding, services, tests, UI, and checking library APIs (AI SDK v7, Prisma 7) against installed types.
- **Verified by:** build + lint per epic, curl smoke tests (incl. 8 concurrent duplicate POSTs), a real OpenRouter call, repeated e2e runs, screenshots of each UI state.
- **Changed or rejected:**
  - Model classified a missing payslip as `INFORMATION_REQUEST`; added explicit category definitions.
  - Full Zod errors shown to ops users; replaced with a short field list (raw output still stored).
  - App-level locking for duplicates, rejected for unique index + `P2002`.
  - Auto-analyse on intake and a queue, rejected for this scope.
  - React Router and monorepo tooling, dropped as unnecessary for one screen.
