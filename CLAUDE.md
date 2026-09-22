# Thor - AI-Assisted Work Intake System

Ops tool: receive work items, analyse with LLM, review, complete.

## Stack
- `api/`: NestJS, Prisma, PostgreSQL, Vercel AI SDK + OpenRouter, Zod, Jest + Supertest
- `web/`: React + Vite + TS, Tailwind, shadcn/ui, TanStack Query, Hugeicons
- `docker-compose.yml`: postgres + api + web

Progress tracked in `IMPLEMENTATION_PLAN.md`. Update it at end of each epic.

## Rules
- No useless comments. Comment only complex/non-obvious logic.
- Do not over-engineer. Simplest correct, efficient code. No speculative abstractions.
- Data integrity lives in the DB: unique constraints + conditional (compare-and-set) status updates.
- All workflow transitions defined in one place and enforced on every status change.
- LLM output is untrusted: always timeout + Zod-validate; failures never leave partial state.
- Frontend: light mode only. Icons from Hugeicons only, never lucide-react. Duotone feel = icon on soft tinted chip.
- Buttons are custom-styled, not stock shadcn look.
- Never commit secrets. `.env` is gitignored; document config in `.env.example`.
- Commit with the atomic-commit skill (conventional commits, focused).
