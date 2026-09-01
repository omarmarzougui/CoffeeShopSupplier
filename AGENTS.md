# AGENTS.md — CoffeeShopSupplier

> This file is the single source of truth for **all AI agents** (opencode, Cursor, Claude Code, Codex, Gemini CLI, etc.) working in this repository. Read this file fully before doing anything.

## Project Overview

A two-sided B2B marketplace connecting coffee shop owners (**buyers**) with product dealers/distributors (**suppliers**). Buyers browse catalogs, place one-time or recurring orders, and track deliveries. Suppliers manage listings, fulfill orders, and invoice clients.

- **Full architecture & product plan:** [`PLAN.md`](./PLAN.md) — read before making design decisions.
- **Task list:** [`TODO.md`](./TODO.md) — what to work on, in order.
- **Progress log:** [`PROGRESS.md`](./PROGRESS.md) — check before starting, update when done.

## Tech Stack (do not substitute without asking)

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind CSS |
| State | Zustand + React Query (TanStack Query) |
| Backend | Node.js + Fastify (TypeScript) |
| ORM / DB | Prisma + PostgreSQL |
| Cache | Redis |
| Search | Meilisearch (Elasticsearch acceptable in Phase 3) |
| Files | S3 / Cloudflare R2 |
| Auth | JWT access (15 min) + refresh token rotation |
| Email | Resend |
| PDF | pdf-lib |
| Validation | Zod on all endpoints (request + response) |
| Monorepo | pnpm workspaces |

## Repository Layout

```
/
├── apps/
│   ├── web/          # React web app (buyer + supplier + admin)
│   └── api/          # Fastify backend
│       └── src/
│           ├── routes/       # HTTP route definitions (thin)
│           ├── services/     # Business logic (fat)
│           ├── middleware/    # auth, RBAC, rate limiting, errors
│           ├── lib/          # db, redis, email, pdf, s3 clients
│           └── jobs/         # standing order scheduler, invoice overdue
├── packages/
│   ├── types/        # Shared TS types (single source for API contracts)
│   ├── ui/           # Shared component library
│   └── utils/        # Shared utilities
├── prisma/           # schema.prisma + migrations
├── infra/            # docker-compose, k8s, terraform
├── docs/             # api/ (OpenAPI), architecture/
├── PLAN.md           # Product + architecture plan (read-only reference)
├── TODO.md           # Task backlog with statuses
├── PROGRESS.md       # Progress log — MUST be updated
└── AGENTS.md         # This file
```

## Commands

> Fill these in when the project is scaffolded (see TODO task W1). Until then, commands may not exist.

```bash
pnpm install              # install all workspace deps
pnpm dev                   # run api + web concurrently
pnpm --filter api dev      # backend only
pnpm --filter web dev      # frontend only
pnpm lint                  # ESLint across workspaces
pnpm typecheck             # tsc --noEmit across workspaces
pnpm test                  # Vitest unit tests
pnpm --filter api test     # backend tests only
pnpm db:migrate            # prisma migrate dev
pnpm db:generate           # prisma generate
pnpm db:seed               # seed dev data (categories, demo users)
docker compose -f infra/docker-compose.yml up -d   # postgres, redis, meilisearch
```

**Always run `pnpm lint` and `pnpm typecheck` after finishing a task. Run tests if they exist for the area you touched.**

## Core Domain Rules

### Roles & Access (RBAC enforced at API layer)
- Roles: `buyer`, `supplier`, `admin`.
- Suppliers can only CRUD **their own** products (`supplier_id === authenticated user`).
- Buyers can view catalogs and manage **their own** orders/carts.
- Suppliers can only accept/modify orders addressed **to them**.
- Never trust the client — verify ownership in the service layer, not just the route.

### Order Status Machine (no skipping states)
```
pending → confirmed → dispatched → delivered
     ↘ cancelled (only from pending or confirmed)
```

### Invoice Status
```
unpaid → paid | overdue
```
Invoice is auto-generated when an order is marked `delivered`.

### Money
- Store amounts as integer **minor units** (cents/millimes) — never floats.
- Currency defaults per environment; single currency in MVP.

## Code Conventions

- **Language:** TypeScript strict mode everywhere. No `any` unless unavoidable; justify with a comment.
- **Validation:** Every endpoint parses input with a **Zod schema**. No raw `req.body` access.
- **API style:** `/api/v1/...`, RESTful, thin routes → services own business logic.
- **Errors:** Use a shared `AppError` class with HTTP codes; global Fastify error handler returns `{ error: { code, message, details? } }`.
- **Naming:** PascalCase components/types, camelCase functions/vars, kebab-case filenames.
- **No comments** unless explaining a non-obvious decision.
- **Migrations:** `prisma migrate` only — never edit the DB manually. Always commit migration files.
- **Tests:** Vitest. Services get unit tests; routes get integration tests with `fastify.inject()`. Target ≥ 80% coverage on services.
- **Secrets:** Never hardcode. Use `.env` (gitignored) + `.env.example` committed. Never log tokens or password hashes.

## Workflow for Agents

1. Read `PLAN.md` (sections relevant to your task), `TODO.md`, and the last entry in `PROGRESS.md`.
2. Pick the **first unchecked task** in `TODO.md` (respect dependencies/order). Do not jump ahead to later phases.
3. Mark the task `in_progress` in `TODO.md` **before** starting work.
4. Implement following the conventions above. MVP scope only — see Phase 1 in `PLAN.md` §9. Do not build Phase 2/3 features early (no Stripe, no messaging, no mobile, no reviews in MVP unless tasked).
5. Verify: `pnpm lint && pnpm typecheck && pnpm test` (run what exists).
6. Mark the task done `[x]` in `TODO.md` and **append an entry to `PROGRESS.md`** (date, task, what changed, files touched, decisions made, how verified).
7. Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).

## Open Questions (do not unilaterally decide — ask the user)

From `PLAN.md` §16: geography/delivery zones, commission model, escrow vs passthrough payments, languages (Arabic/French/English for Tunisia/MENA?), minimum order values, platform vs supplier-managed delivery. Default assumptions if not answered: single city, Tunisia/MENA, English-only MVP, no commission logic in MVP code, supplier-managed delivery.
