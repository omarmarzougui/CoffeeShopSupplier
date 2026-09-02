# PROGRESS.md — Progress Log

> Append-only log. Newest entries at the bottom.
> Format: date, task ID, what changed, files touched, decisions, verification.

---

## 2026-09-01 — Project initialization

- **Task:** Repo bootstrap for AI-agent-driven development.
- **What changed:**
  - Created `AGENTS.md` — single source of truth for all AI agents (opencode, Cursor, Claude Code, Codex, Gemini CLI). Covers tech stack, layout, commands, domain rules, conventions, workflow, open questions.
  - Created `TODO.md` — Phase 1 MVP task backlog (W1–W18) derived from `PLAN.md` §9, plus gated Phase 2/3 placeholders.
  - Created `PROGRESS.md` — this log.
- **Files touched:** `AGENTS.md`, `TODO.md`, `PROGRESS.md`
- **Decisions made:**
  - `AGENTS.md` used as the cross-agent standard filename instead of tool-specific files (CLAUDE.md, .cursorrules, GEMINI.md) — one file, all agents.
  - Task IDs W1–W18 map 1:1 to Phase 1 milestones in `PLAN.md` §9.
  - `PLAN.md` treated as read-only reference; all agent coordination flows through `AGENTS.md` / `TODO.md` / `PROGRESS.md`.
  - Open questions from `PLAN.md` §16 stay open; defaults documented in `AGENTS.md` until user answers.
- **Verification:** Files reviewed against `PLAN.md` (tech stack §6.2, schema §6.3, API §7, roadmap §9). No code exists yet — nothing to lint/test.
- **Next task:** W1 — Monorepo scaffold (first unchecked task in `TODO.md`).

---

## 2026-09-02 — W1. Monorepo scaffold

- **Task:** W1 — pnpm monorepo with api + web apps and shared packages.
- **What changed:**
  - Root: `package.json` (workspace scripts), `pnpm-workspace.yaml`, `tsconfig.base.json` (TS strict, noUncheckedIndexedAccess), `.gitignore`, `.prettierrc`, `.prettierignore`, `eslint.config.js` (flat config, typescript-eslint + prettier).
  - `apps/api` — Fastify 5 + TS strict, `/health` route, helmet + cors, vitest integration test (`fastify.inject`), `.env.example` (DB, Redis, Meilisearch, JWT, Resend), prisma CLI scripts (db:migrate/generate/seed). Build via `tsc` with `module: NodeNext` → `dist/`, explicit `.js` import extensions.
  - `apps/web` — Vite 7 + React 19 + TS strict, Tailwind CSS v4 (`@tailwindcss/vite`), react-router-dom v7, TanStack Query v5, Zustand v5; dev server proxies `/api` → :3000.
  - `packages/types` — shared `Role`, `OrderStatus`, `InvoiceStatus`, `ProductUnit`, `ApiError` types (source of truth for API contracts).
  - `packages/utils` — `formatMinorUnits` money formatter + 4 unit tests.
  - `packages/ui` — shared `Button` component.
  - `AGENTS.md` Commands section filled with real workspace names (`@coffee/api`, `@coffee/web`).
- **Files touched:** package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, .prettierrc, .prettierignore, eslint.config.js, apps/{api,web}/**, packages/{types,ui,utils}/**, AGENTS.md, TODO.md, PROGRESS.md
- **Decisions made:**
  - ESLint flat config at root, no per-workspace config files (single source).
  - API uses `module: NodeNext` for `tsc` builds so `node dist/index.js` runs natively; dev uses `tsx watch`.
  - pnpm `onlyBuiltDependencies` whitelisted (prisma, esbuild) to allow postinstall scripts.
  - Shared packages consumed as raw TS source (`main: ./src/index.ts`) — no build step needed for MVP scale.
  - Placeholder smoke tests in web so `pnpm -r test` stays green before real tests exist.
- **Verification:** `pnpm -r lint` (5/5 Done), `pnpm -r typecheck` (5/5 Done), `pnpm -r test` (6 tests passed across api/web/utils), `pnpm -r build` OK, live boot of `dist/index.js` answered `{"status":"ok","service":"api"}` on :3000.
- **Next task:** W2 — Infrastructure (docker-compose, db/redis/search client libs, health checks).

---

## 2026-09-02 — W2. Infrastructure (local)

- **Task:** W2 — local Docker infra + API client libs for Postgres/Redis/Meilisearch + health checks.
- **What changed:**
  - `infra/docker-compose.yml` — Postgres 16, Redis 7, Meilisearch v1.15, named volumes, healthchecks.
  - `apps/api/src/lib/db.ts` — Prisma client singleton; `redis.ts` — ioredis client + `checkRedis()`; `search.ts` — MeiliSearch client + `checkMeilisearch()`; `health.ts` — `checkDependencies()`.
  - `apps/api/src/app.ts` — `/health` (liveness) + `/health/deps` (readiness, 503 when degraded); onClose hook disconnects redis.
  - `apps/api/src/index.ts` — dotenv loading (root `.env` first, local override), SIGINT/SIGTERM graceful shutdown with `db.$disconnect()`.
  - `prisma/schema.prisma` — minimal datasource scaffold (models come in W3).
  - Moved `prisma` CLI + `@prisma/client` to root package.json (schema lives at root; avoids Prisma's broken `pnpm add` auto-install in workspaces). Root scripts now run prisma directly; `db:seed` delegates to api workspace.
- **Files touched:** infra/docker-compose.yml, prisma/schema.prisma, apps/api/src/{app.ts,index.ts}, apps/api/src/lib/{db,redis,search,health}.ts, package.json, apps/api/package.json, pnpm-lock.yaml, apps/api/.env (local only, gitignored)
- **Decisions made:**
  - Prisma CLI at workspace root next to `prisma/` dir (per repo layout in AGENTS.md) — generates `@prisma/client` importable from all workspaces.
  - `dotenv` loaded explicitly in index.ts (root `.env` + app-local override) because Prisma env resolution follows the schema location.
  - Meilisearch container healthcheck uses `127.0.0.1` (busybox wget resolves `localhost` to IPv6, meili binds IPv4).
  - `/health` stays 200 (liveness) even if deps down; `/health/deps` returns 503 — suitable for orchestration readiness probes.
- **Verification:** `docker compose ps` all healthy; live API boot answered `/health/deps` `{"db":"up","redis":"up","search":"up"}`; graceful shutdown clean; `pnpm -r lint`/`typecheck` clean; `pnpm -r test` 6/6 passed.
- **Next task:** W3 — Prisma schema (Phase 1 entities) + initial migration.

---

## 2026-09-02 — W3. Prisma schema (Phase 1 entities)

- **Task:** W3 — full Phase 1 Prisma schema + initial migration.
- **What changed:**
  - `prisma/schema.prisma` — models: `User` (roles, business profile, verification), `RefreshToken` (hashed, revocable — for W4 rotation), `Category` (self-referential tree), `Product` (minor-unit price Int, MOQ, lead time, stock toggle, images[], archived soft-delete, unique SKU per supplier), `Order` (status machine timestamps), `OrderItem` (quantity, unitPrice, subtotal as Int), `Invoice` (unique invoiceNumber, dueDate, status), `StandingOrder` + `StandingOrderItem` (schema present for W-phase later; not exposed in MVP API).
  - Enums: `Role`, `ProductUnit`, `OrderStatus`, `InvoiceStatus`, `StandingOrderFrequency`.
  - Migration `20260902131014_init` committed; all 9 tables + `_prisma_migrations` verified in Postgres.
- **Files touched:** prisma/schema.prisma, prisma/migrations/** (new), pnpm-lock.yaml (unchanged)
- **Decisions made:**
  - Money as `Int` minor units everywhere (AGENTS.md rule); `currency` defaults "TND" per open-question defaults.
  - Products use `archived` flag for soft delete (W7 requirement) — never hard-delete referenced products.
  - `RefreshToken` stores only `tokenHash` — raw refresh tokens never persisted (W4 security).
  - Standing orders modeled now (cheap, avoids Phase 2 migration churn) but no API surface until later phase.
  - Named relations on User (OrderBuyer/OrderSupplier/standing order buyer/supplier) to disambiguate multiple User FKs.
- **Verification:** `prisma validate` valid; `pnpm db:generate` OK; `pnpm db:migrate --name init` applied; `\dt` shows all tables; lint/typecheck clean; tests 6/6.
- **Next task:** W4 — Auth system (register, login, refresh rotation, logout, RBAC middleware, rate limiting, email verification, AppError).

---

## 2026-09-02 — W4. Auth system

- **Task:** W4 — full auth: register/login/refresh-rotation/logout, RBAC, rate limiting, error envelope, email (dev console), tests.
- **What changed:**
  - `lib/errors.ts` — `AppError` + `appErrorHandler` → `{ error: { code, message, details? } }`.
  - `lib/tokens.ts` — JWT access sign/verify (15 min, HS256, `sub` + `role` claims).
  - `lib/email.ts` — Resend client; dev fallback logs to console.
  - `middleware/auth.ts` — `requireAuth` (Bearer parser) + `requireRole(...roles)` RBAC guard; augments `FastifyRequest.user`.
  - `middleware/rate-limit.ts` — Redis fixed-window limiter (10 req/min/IP per route prefix).
  - `middleware/error-handler.ts` — global Fastify error handler using AppError envelope.
  - `services/auth-service.ts` — register (bcrypt 10 rounds, dup email 409), login (constant 401s), refresh **rotation with reuse detection** (reuse revokes ALL user tokens), logout (revoke single token). Refresh tokens stored as SHA-256 hashes only, 30-day TTL.
  - `routes/auth-routes.ts` — thin Zod-validated routes under `/api/v1/auth/*`.
  - Tests: 10 service unit tests (mocked Prisma) + 5 route integration tests via `fastify.inject()` — 15/15 green.
- **Files touched:** apps/api/src/{lib/errors.ts,lib/tokens.ts,lib/email.ts,middleware/auth.ts,middleware/rate-limit.ts,middleware/error-handler.ts,services/auth-service.ts,services/auth-service.test.ts,routes/auth-routes.ts,app.ts,app.test.ts}, eslint.config.js, package.json (api: zod, bcryptjs, jsonwebtoken, resend, types)
- **Decisions made:**
  - Refresh-token rotation with reuse detection (family revocation) — security best practice, detectable via 401 `TOKEN_REUSE_DETECTED`.
  - Only token **hashes** persisted; raw tokens exist solely in client hands.
  - Rate limiter fails **open** if Redis is down (availability over strictness in MVP) — logged via swallow, AppError still thrown when limit exceeded.
  - Email verification token emailed in dev (console); verifiedAt stays null until W16 confirmation endpoint.
  - ESLint: `no-unused-vars` ignores `_`-prefixed args.
  - Zod `.safeParse` in routes; validation failures → 400 `VALIDATION_ERROR` with flattened details.
- **Verification:** Unit+integration 15/15; lint clean; typecheck clean. Live smoke against real Postgres+Redis: register 200 → user row created; login 200; refresh 200 with rotation (old token replay → 401, DB shows 2 revoked tokens); logout 200. Rate limiting active (Redis keys `ratelimit:*`).
- **Next task:** W5 — CI/CD pipeline (GitHub Actions: install → lint → typecheck → test).

---

## 2026-09-02 — W5. CI/CD pipeline

- **Task:** W5 — GitHub Actions CI on PRs + pushes to main.
- **What changed:**
  - `.github/workflows/ci.yml` — pnpm/action-setup + Node 22 (cache: pnpm), then: install (`--frozen-lockfile`) → `pnpm db:generate` (Prisma client needed for typecheck/tests) → lint → typecheck → test → build. Concurrency group cancels superseded runs.
- **Files touched:** .github/workflows/ci.yml
- **Decisions made:**
  - Single `ci` job for MVP (lint/typecheck/test/build are fast); split jobs only when times justify it.
  - `db:generate` in CI because typecheck+tests import `@prisma/client` types generated from schema.
  - No Postgres/Redis/Meilisearch services in CI — current tests mock Prisma/Redis; revisit when real-DB integration tests are added (W17).
  - Build step included as a smoke gate.
- **Verification:** Ran the exact CI sequence locally: `pnpm install --frozen-lockfile` OK, `db:generate` OK, lint 5/5 workspaces Done, typecheck 5/5 Done, tests 20/20 passed (4 utils + 1 web + 15 api), build both apps OK. `.env.example` verified as superset of `process.env.*` reads in code.
- **Next task:** W6 — Categories & seed (taxonomy per PLAN.md §5 + demo users).

---

## 2026-09-02 — W6. Categories & seed

- **Task:** W6 — category taxonomy seed + demo users.
- **What changed:**
  - `apps/api/prisma/seed.ts` — full 2-level taxonomy from PLAN.md §5 (7 roots, 31 children = 38 categories) via upserts (idempotent); 3 demo users (admin/buyer/supplier, all `password123`, bcrypt-hashed) via upserts.
- **Files touched:** apps/api/prisma/seed.ts
- **Decisions made:**
  - Seed uses `upsert` keyed on unique slug/email — safe to re-run, no duplicates.
  - Demo password shared and printed in seed output; dev-only accounts.
  - Seed script lives in `apps/api/prisma/` (per AGENTS.md layout: `db:seed` filters to api workspace) while schema stays at repo root.
- **Verification:** `pnpm db:seed` OK; DB shows 38 categories / 7 roots / 3 demo users; re-run idempotent (counts unchanged); lint + typecheck clean; 20/20 tests pass.
- **Next task:** W7 — Product CRUD (supplier) with ownership enforcement, Zod schemas, soft delete, integration tests.
