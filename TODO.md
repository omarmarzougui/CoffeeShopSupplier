# TODO.md — Task Backlog

> Work top-to-bottom. Do not jump ahead to later weeks/phases.
> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done
> Update this file when starting/finishing a task. Append details to `PROGRESS.md` when done.

## Phase 1 — MVP (Weeks 1–10)

### Week 1–2 — Setup, CI/CD, DB Schema, Auth

- [x] **W1. Monorepo scaffold**
  - pnpm workspaces: `apps/web`, `apps/api`, `packages/types`, `packages/ui`, `packages/utils`
  - Vite + React + TS (web), Fastify + TS (api), TypeScript strict everywhere
  - ESLint + Prettier config shared across workspaces
  - Root scripts: `dev`, `lint`, `typecheck`, `test`, `db:migrate`, `db:generate`, `db:seed`
  - `.env.example` (api), `.gitignore`, init git repo, first commit
  - Fill in the Commands section of `AGENTS.md`
- [ ] **W2. Infrastructure (local)**
  - `infra/docker-compose.yml`: PostgreSQL, Redis, Meilisearch
  - API connects to Postgres + Redis + Meilisearch (health checks)
  - `lib/db.ts` (Prisma client), `lib/redis.ts`, `lib/search.ts`
- [ ] **W3. Prisma schema (Phase 1 entities)**
  - `users`, `products`, `categories`, `orders`, `order_items`, `invoices` (per PLAN.md §6.3)
  - Money as integer minor units; enums for roles/statuses
  - Initial migration committed
- [ ] **W4. Auth system**
  - Zod schemas + routes: register, login, refresh (rotation), logout
  - JWT access (15 min) + refresh tokens; bcrypt/argon2 hashing
  - `middleware/auth.ts` + RBAC guard (`buyer` | `supplier` | `admin`)
  - Email verification via Resend (dev: log to console)
  - Rate limiting on auth endpoints (Redis)
  - Shared `AppError` + global error handler `{ error: { code, message } }`
  - Unit tests for auth service
- [ ] **W5. CI/CD pipeline**
  - GitHub Actions: install → lint → typecheck → test on PRs
  - `.env.example` kept in sync; no secrets in repo

### Week 3–4 — Supplier Catalog

- [ ] **W6. Categories & seed**
  - Category taxonomy per PLAN.md §5 (seed script)
- [ ] **W7. Product CRUD (supplier)**
  - POST/PATCH/DELETE `/api/v1/products` (soft delete/archive)
  - Ownership enforced in service layer (`supplier_id === user`)
  - Fields: name, SKU, unit, price (minor units), MOQ, lead time, description, images, stock toggle
  - Zod request/response schemas; integration tests
- [ ] **W8. Product listing & search**
  - GET `/api/v1/products` with filters (category, supplier, q, price)
  - Meilisearch index + sync on product create/update
  - CSV export (bulk import deferred — keep endpoint placeholder)

### Week 5–6 — Buyer Browse & Search

- [ ] **W9. Web app foundation**
  - Router, layouts (buyer/supplier), Zustand + React Query setup, Tailwind theme
  - Auth pages (login/register), token refresh interceptor, protected routes
- [ ] **W10. Catalog pages (buyer)**
  - Category browsing, search, product detail, supplier profile page (basic)
- [ ] **W11. Cart (multi-supplier, client-side)**
  - Cart store, per-supplier grouping, MOQ validation, totals in minor units

### Week 7–8 — Orders

- [ ] **W12. Order placement (buyer)**
  - POST `/api/v1/orders` — cart split by supplier → one order per supplier
  - Price re-validation server-side at checkout; totals as integers
  - Status `pending`; email to supplier
- [ ] **W13. Buyer order management**
  - GET `/api/v1/orders` (own orders, filter/paginate), GET `/orders/:id`
  - Cancel (only from `pending`/`confirmed`); reorder endpoint
- [ ] **W14. Supplier fulfillment**
  - Incoming orders dashboard API: confirm / dispatch / deliver transitions
  - Enforce status machine (no skips); ownership check (order.supplier_id === user)
  - Web UI for buyer order tracking + supplier order dashboard

### Week 9 — Invoicing & Notifications

- [ ] **W15. Invoice generation**
  - Auto-generate invoice on `delivered`; invoice number sequence
  - PDF via pdf-lib; GET `/invoices/:id` + `/invoices/:id/pdf`
  - Status `unpaid`; overdue job (daily cron)
- [ ] **W16. Email notifications (Resend)**
  - Order placed / confirmed / dispatched / delivered / invoice due templates
- [ ] **W17. QA hardening**
  - Integration test pass on critical flows; fix bugs; staging deployment

### Week 10 — QA & Stabilization

- [ ] **W18. Internal QA, bug fixes, staging deployment**
  - E2E happy path: register → browse → order → fulfill → invoice
  - Lighthouse/accessibility pass on buyer screens; final staging deploy

## Phase 2 — Growth (Weeks 11–18) — DO NOT START until Phase 1 done & approved

- [ ] Standing/recurring orders (scheduler job)
- [ ] Reviews & supplier ratings
- [ ] In-app messaging (per order)
- [ ] Buyer/supplier dashboards & analytics
- [ ] Admin panel (user mgmt, KYC)
- [ ] Mobile app (React Native)

## Phase 3 — Scale (Weeks 19–26)

- [ ] Stripe payments, multi-currency, advanced search, RFQ, promotions, WhatsApp/SMS, logistics, multi-warehouse
