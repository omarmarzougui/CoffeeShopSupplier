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
