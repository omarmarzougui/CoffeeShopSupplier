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

---

## 2026-09-02 — W7. Product CRUD (supplier)

- **Task:** W7 — supplier product create/update/archive with ownership + validation + tests.
- **What changed:**
  - `schemas/product-schemas.ts` — `createProductSchema` (price int positive = minor units, UUID categoryId, URL images, defaults for currency/MOQ/lead time/stock) and `updateProductSchema` (all-optional, non-empty enforced via refine).
  - `services/product-service.ts` — `createProduct` (category existence check, SKU conflict → 409), `updateProduct`, `archiveProduct` (soft delete), `getProductOwned` (ownership: other supplier's product returns **404** to avoid enumeration; archived treated as not found).
  - `routes/product-routes.ts` — POST/PATCH/DELETE `/api/v1/products`, supplier-only RBAC, Zod validation → 400 envelope.
  - `app.ts` — registered product routes.
  - Tests: 9 route integration tests (JWT signed in-memory, mocked db) — role 403, unauth 401, ownership 404, soft delete, SKU handling, empty-body 400.
- **Files touched:** apps/api/src/{schemas/product-schemas.ts,services/product-service.ts,routes/product-routes.ts,routes/product-routes.test.ts,app.ts}
- **Decisions made:**
  - Update schema is a **separate** object (not `.partial()` of create) — create's defaults would silently fill fields on `{}`; update must be explicit and non-empty.
  - Foreign products return 404 (not 403) — don't leak existence of competitors' products.
  - Archive (soft delete) only; no hard DELETE — products referenced by orders must persist.
  - `Prisma.PrismaClientKnownRequestError` P2002 mapped to 409 `SKU_TAKEN`.
- **Verification:** 24/24 tests; lint + typecheck clean. Live smoke with seeded supplier: login → create 200 → patch 200 (price updated in DB) → archive 200 (`archived=t`) → buyer token blocked 403. Smoke row cleaned up.
- **Next task:** W8 — Product listing & search (GET with filters, Meilisearch index + sync, CSV export placeholder).

---

## 2026-09-02 — W8. Product listing & search

- **Task:** W8 — GET `/api/v1/products` with filters, Meilisearch index + sync on create/update/archive, CSV export placeholder.
- **What changed:**
  - `lib/search.ts` — added `PRODUCT_INDEX` name, `ensureProductIndex()` (index settings), `indexProduct(doc)` (upsert), `removeProduct(id)` (delete), `searchProducts(query, options)` (text search with filters). All sync helpers fail open (catch + swallow) to keep the API available when Meilisearch is down.
  - `schemas/product-schemas.ts` — added `listProductsQuerySchema`: optional `category`, `supplier` (UUIDs), `q` (text), `minPrice`/`maxPrice` (coerced int), `page`/`limit` (defaults 1/20), `sort` (`price_asc|price_desc|newest|oldest`). Exported `ListProductsQuery` type.
  - `services/product-service.ts` — added `listProducts()` (DB-based with Prisma filters + pagination/sort); Meilisearch `q` search integrated via `searchProducts()` to find matching IDs when text query is provided. Added `toSearchDoc()` helper. Added `indexProduct()` call in `createProduct`/`updateProduct`, `removeProduct()` call in `archiveProduct`.
  - `routes/product-routes.ts` — added `GET /api/v1/products` (auth required, Zod-validated query, calls `listProducts`), `GET /api/v1/products/export.csv` (placeholder CSV header row with `Content-Disposition` attachment).
  - Tests: added 8 new route tests: listing returns paginated results (200), rejects unauth (401), passes category/supplier/price/sort filters to Prisma, paginates page+limit correctly, rejects invalid query (400), text search via Meilisearch with ID filtering (200), CSV export returns correct headers (200) + unauth (401). Meilisearch mock verifies sync on create/update/archive.
- **Files touched:** `apps/api/src/lib/search.ts`, `apps/api/src/schemas/product-schemas.ts`, `apps/api/src/services/product-service.ts`, `apps/api/src/routes/product-routes.ts`, `apps/api/src/routes/product-routes.test.ts`
- **Decisions made:**
  - Meilisearch sync is fire-and-forget with try/catch swallowing — API never fails because Meilisearch is unavailable. Degraded behavior: full listing via Prisma DB still works, only text search (`q`) returns empty.
  - Listing is auth-required (`requireAuth`): buyers and suppliers both need to authenticate to browse products. No anonymous catalog browsing in MVP.
  - Text search (`q`) goes through Meilisearch; other filters (category, supplier, price range) go through Prisma DB directly. Meilisearch `q` results are IDs used to filter the DB query, ensuring consistent data.
  - CSV export is a placeholder (header row only) — bulk export/import deferred to a later task as noted in TODO.
  - `z.coerce.number()` for `minPrice`/`maxPrice` query params since URL query strings are strings; `z.coerce` handles both `?minPrice=1000` and `?minPrice="1000"` gracefully.
- **Verification:** `pnpm lint` clean, `pnpm typecheck` clean, `pnpm test` 38/38 passed (33 api + 4 utils + 1 web). `pnpm build` both apps clean.
- **Next task:** W9 — Web app foundation (router, layouts, Zustand/React Query, auth pages, token refresh interceptor).

---

## 2026-09-03 — W9. Web app foundation

- **Task:** W9 — router/layouts, Zustand + React Query setup, auth pages (login/register), token refresh interceptor, protected/role routes.
- **What changed:**
  - `lib/api.ts` — fetch wrapper `apiFetch()` handling 401 retry via refresh token rotation (single-flight `refreshAccessToken`), token/user localStorage persistence helpers, SessionExpired → redirect to `/login`.
  - `stores/auth-store.ts` — Zustand store (`user`, `isAuthenticated`, `login`, `logout`, `refresh`, `initialize`) syncing with localStorage.
  - `lib/auth-context.tsx` — `AuthProvider` + `useAuth()`: `login`, `register`, `logout` (revokes refresh token server-side on logout).
  - `components/ProtectedRoute.tsx` — guards authenticated access (redirects to `/login`). `RoleProtectedRoute.tsx` — guards role-specific areas (buyer vs supplier) with role-scoped redirects.
  - `components/PublicLayout.tsx` — centered card layout for auth pages. `DashboardLayout.tsx` — sidebar + topbar shell (used by both roles). `BuyerLayout.tsx` / `SupplierLayout.tsx` — role-specific nav + outlet.
  - `pages/` — `HomePage` (landing), `LoginPage`, `RegisterPage` (role toggle buyer/supplier, validation), `BuyerDashboardPage`, `SupplierDashboardPage` (placeholders).
  - `routes.tsx` — `createBrowserRouter` with public `/`, public auth pages, protected `/buyer` (buyer role) + `/supplier` (supplier role), catch-all → `/`.
  - `App.tsx` — `AuthProvider` + `RouterProvider`. `main.tsx` — simplified to render `<App />` inside `QueryClientProvider`.
  - `package.json` — added `@coffee/types` workspace dep.
- **Files touched:** apps/web/src/{App.tsx,main.tsx,routes.tsx,lib/api.ts,lib/auth-context.tsx,stores/auth-store.ts,components/{ProtectedRoute,RoleProtectedRoute,PublicLayout,DashboardLayout,BuyerLayout,SupplierLayout}.tsx,pages/{HomePage,LoginPage,RegisterPage,BuyerDashboardPage,SupplierDashboardPage}.tsx}, apps/web/package.json, pnpm-lock.yaml
- **Decisions made:**
  - Auth state persisted in `localStorage` (token + user + refresh token) for MVP — refresh rotation revokes server-side; no sessionStorage complexity.
  - `apiFetch` uses single-flight refresh (`refreshPromise`) to prevent multiple concurrent 401 retries from triggering parallel refreshes.
  - Role-based dashboards separated at route level (`/buyer`, `/supplier`) with `RoleProtectedRoute` — a buyer hitting `/supplier` redirects to `/buyer` and vice versa.
  - Logout revokes refresh token server-side (POST `/auth/logout`) before clearing local state.
  - HomePage redirects to `/` landing; login/register redirect to role-specific dashboard based on `user.role`.
  - API 401 + refresh failure triggers hard redirect to `/login` (session expired).
- **Verification:** `pnpm lint` / `pnpm typecheck` / `pnpm test` 38/38 passed; `pnpm build` clean (Vite build 104 modules). Live smoke: restarted API with correct Meilisearch key, created products → Meilisearch sync works, text search via `q=espresso` returns matches, archive removes from index; test data cleaned up. `app.ts` calls `ensureProductIndex()` at startup.
- **Next task:** W10 — Catalog pages (buyer): category browsing, search, product detail, supplier profile page (basic).

---

## 2026-09-03 — W10. Catalog pages (buyer)

- **Task:** W10 — buyer catalog: category browse, product search/list, product detail, supplier profile. Backend endpoints + frontend pages.
- **What changed (backend):**
  - `services/category-service.ts` — `listCategories()` returns a nested `CategoryNode` tree (parent → children) built from flat Prisma rows.
  - `services/supplier-service.ts` — `getSupplierProfile()` returns `{ id, businessName, logoUrl, phone, address, verified, productCount }`; verifies the user is a `supplier` (404 otherwise); productCount counts non-archived products.
  - `services/product-service.ts` — added `getPublicProduct(id)` returning a product with `category` + `supplier` relations included; 404 for archived/missing.
  - `routes/category-routes.ts` — `GET /api/v1/categories` (auth). `routes/supplier-routes.ts` — `GET /api/v1/suppliers/:id` (auth).
  - `routes/product-routes.ts` — added `GET /api/v1/products/:id` (public product detail, auth) registered after the static `/export.csv` route.
  - `app.ts` — registered `categoryRoutes` and `supplierRoutes`.
  - Tests: `routes/catalog-routes.test.ts` (6 tests) — category tree shape, product detail 200 + missing/archived 404, supplier profile 200+count, supplier profile 404 for non-supplier. All use mocked DB.
- **What changed (frontend):**
  - `lib/catalog.ts` — typed API client for `fetchCategories`, `fetchProducts` (builds query string + types), `fetchProduct`, `fetchSupplier`; export `ProductSort`, `Product`, `Category`, `SupplierProfile`, `ProductListResponse`.
  - `pages/CatalogPage.tsx` — two-column browse page: left category tree (root + children, "All Products" link), right product grid with search input + sort dropdown (newest/price ASC/price DESC/oldest). Uses `useSearchParams` so `?category=`, `?supplier=`, `?sort=` are URL-driven and trigger re-fetch via React Query.
  - `pages/ProductDetailPage.tsx` — product header (name, SKU, unit), price + MOQ, description, lead time, availability, supplier link.
  - `pages/SupplierProfilePage.tsx` — avatar initial, business name, verified badge, product count, address/phone, "View all products" (links to catalog filtered by supplier).
  - `routes.tsx` — added `buyer/products`, `buyer/products/:id`, `buyer/suppliers/:id` under the buyer role layout.
  - `package.json` — added `@coffee/utils` workspace dep.
- **Files touched (backend):** apps/api/src/{services/{category-service,supplier-service,product-service}.ts,routes/{category-routes,supplier-routes,product-routes}.ts,routes/catalog-routes.test.ts,app.ts}
- **Files touched (frontend):** apps/web/src/{lib/catalog.ts,pages/{CatalogPage,ProductDetailPage,SupplierProfilePage}.tsx,routes.tsx,package.json}, pnpm-lock.yaml
- **Decisions made:**
  - Category tree built in-memory from a flat `findMany` (2-level taxonomy only in MVP; no recursive queries needed).
  - `GET /api/v1/categories`, `GET /api/v1/products/:id`, `GET /api/v1/suppliers/:id` all require `requireAuth` (no anonymous browsing in this MVP).
  - Product detail includes `category` + `supplier` relations via Prisma `include` for a single-roundtrip UI load.
  - Supplier profile deliberately excludes email + vatId (public-facing; no data leak).
  - URL-driven catalog filters (`useSearchParams`) so deep-linking/bookmarking works; React Query keys include the filters for caching.
  - `.env.example` grows `MEILISEARCH_API_KEY=dev-master-key-change-me` (matches docker-compose dev master key) — documented.
- **Verification:** `pnpm lint`/`pnpm typecheck`/`pnpm test`/`pnpm build` all clean (44 tests: 39 api + 4 utils + 1 web; 110 modules web build). Live smoke: categories endpoint returns 7-root tree; product detail 200 with category+supplier relations; supplier profile 200 (verified, productCount); supplier filter on products works; test data cleaned up.
- **Next task:** W11 — Cart (multi-supplier, client-side): cart store, per-supplier grouping, MOQ validation, totals in minor units.

---

## 2026-09-03 — W11. Cart (multi-supplier, client-side)

- **Task:** W11 — client-side cart: Zustand store, per-supplier grouping, MOQ validation, minor-unit totals, `Add to Cart` on product detail, cart page + route + nav.
- **What changed:**
  - `stores/cart-store.ts` — Zustand store persisted to `localStorage` (`cart-storage`). `CartItem` holds productId, name, sku, unit, price, currency, minOrderQty, stockAvailable, quantity, supplierId, supplierName. Actions: `addItem` (respects MOQ, accumulates same product), `removeItem`, `updateQty` (0 removes), `clear`. Pure helpers: `groupCartItems` (groups by supplier, computes per-group subtotal in minor units + `hasBelowMoq` flag), `cartTotal` (totals grouped by currency), `cartItemCount`.
  - `pages/ProductDetailPage.tsx` — added quantity stepper + `Add to cart` button (disabled when out of stock or qty chosen below MOQ), inline MOQ warning, "Added ✓" feedback, and a `View cart →` link.
  - `pages/CartPage.tsx` — groups items per supplier in cards (supplier name, subtotal footer, per-supplier "View supplier" link), line items with quantity stepper, per-line MOQ warning + out-of-stock flag, per-line totals, aggregate "Total (currency)" block, empty-cart state, clear-cart action, disabled-for-now "Proceed to checkout" button (W12 wiring).
  - `routes.tsx` — added `buyer/cart` under the buyer role layout.
  - `components/BuyerLayout.tsx` — cart nav link already present; no change.
- **Files touched:** apps/web/src/{stores/cart-store.ts,stores/cart-store.test.ts,pages/{ProductDetailPage,CartPage}.tsx,routes.tsx}
- **Decisions made:**
  - Cart is entirely **client-side** in MVP (persisted to localStorage), consistent with W12 splitting into per-supplier orders at checkout; no backend cart endpoint in this phase.
  - `addItem`/`updateQty` clamp quantity to **at least the MOQ** on first add, but allow dropping *below* MOQ later (qty 0 removes) so a `hasBelowMoq` flag can surface a warning rather than hard-blocking. MOQ is also shown as inline UI warning on both detail and cart pages.
  - All totals computed in **integer minor units** (price × qty); `formatMinorUnits` from `@coffee/utils` formats for display. Totals tracked per-currency (single currency in MVP).
  - Quantity steppers are client-side hidden-input buttons (no native spinner) for consistent styling; still accessible via aria-labels.
- **Verification:** `pnpm lint`/`pnpm typecheck`/`pnpm test`/`pnpm build` all clean. 52 tests: 39 api + 4 utils + 8 cart-store + 1 web smoke. Cart store tests cover MOQ clamping on add, accumulation on re-add, update-qty-to-0 removal, remove, clear, grouping by supplier, per-currency totals, and `hasBelowMoq` detection. (Zustand persist logs a benign `storage is currently unavailable` warning in the Node test env; tests still pass.)
- **Next task:** W12 — Order placement (buyer): POST `/api/v1/orders` splitting cart per supplier, server-side price re-validation, minor-unit totals, `pending` status + supplier email notification.
