# B2B Coffee Shop ↔ Supplier Platform — Architecture & Project Plan

**Document type:** Lead Architect Plan  
**Status:** Initial Draft  
**Version:** 1.0.0

---

## 1. Executive Summary

A two-sided B2B marketplace that connects coffee shop owners (buyers) with product dealers and distributors (suppliers). Coffee shops can browse catalogs, place recurring or one-time orders, and track deliveries. Suppliers can manage their product listings, receive orders, and build relationships with their retail clients.

---

## 2. Problem Statement

Coffee shop operators currently manage procurement through:
- Phone calls and WhatsApp messages
- Paper order forms
- Fragmented supplier relationships
- Manual invoice reconciliation
- No price transparency or comparison

This results in lost time, stock shortages, inconsistent pricing, and poor supplier accountability.

---

## 3. Target Users

### Buyer — Coffee Shop Owner / Manager
- Orders weekly or bi-weekly
- Manages multiple suppliers for different categories
- Needs simple reorder flows (standing orders)
- Cares about price, reliability, and delivery windows

### Supplier — Product Dealer / Distributor
- Manages a catalog of products (one or multiple categories)
- Serves dozens to hundreds of coffee shops
- Needs order aggregation, fulfillment tracking, and invoicing tools
- Wants to grow their retail client base

---

## 4. Core Feature Modules

### 4.1 Authentication & Onboarding
- Role-based signup: `buyer` | `supplier` | `admin`
- Email + password with email verification
- Business profile setup (name, logo, address, VAT/tax ID)
- Supplier: product category selection during onboarding
- Buyer: invite team members (manager, staff roles)

### 4.2 Supplier Catalog Management
- Create/edit/archive product listings
- Product fields: name, SKU, category, unit (kg, L, case, box), price, MOQ, lead time, description, images
- Bulk CSV import/export
- Category taxonomy (see §5)
- Stock availability toggle
- Price tiers (e.g., 1–10 units vs 11–50 units)

### 4.3 Buyer Discovery & Browse
- Search and filter by category, supplier, price range, delivery area
- Supplier profile pages (ratings, catalog, delivery zones)
- Favorite suppliers list
- Compare products across suppliers

### 4.4 Order Management
- Shopping cart (multi-supplier)
- Standing/recurring orders (weekly, bi-weekly, monthly)
- Order confirmation with estimated delivery window
- Order status tracking: `pending → confirmed → dispatched → delivered`
- Partial delivery handling
- Order history and re-order with one click

### 4.5 Supplier Order Fulfillment
- Incoming order dashboard
- Accept / reject / modify orders
- Assign delivery date
- Mark as dispatched with optional tracking number
- Bulk order management (export to CSV for warehouse)

### 4.6 Invoicing & Payments
- Auto-generated PDF invoices per order
- Payment methods: bank transfer (reference code), future: card / BNPL
- Payment status tracking: `unpaid → paid → overdue`
- Credit terms per buyer-supplier relationship (e.g., NET 30)
- Buyer wallet / credit balance (optional phase 2)

### 4.7 Reviews & Trust
- Buyers rate suppliers post-delivery (1–5 stars, comment)
- Response rate and fulfillment rate metrics shown on supplier profiles
- Dispute resolution flow

### 4.8 Notifications & Messaging
- In-app notification center
- Email notifications: order placed, confirmed, dispatched, delivered, invoice due
- Direct messaging between buyer and supplier (per order thread)
- SMS / WhatsApp integration (phase 2)

### 4.9 Admin Panel
- Platform-level user management
- Supplier approval / KYC workflow
- Commission / fee configuration
- Analytics: GMV, order volume, category breakdown, active users
- Content management: categories, banners, promotions

---

## 5. Product Category Taxonomy

```
├── Coffee & Hot Beverages
│   ├── Espresso Beans
│   ├── Filter Coffee
│   ├── Instant Coffee
│   └── Tea (bags, loose leaf)
├── Dairy & Alternatives
│   ├── Whole Milk
│   ├── Skim Milk
│   ├── Oat Milk
│   ├── Almond Milk
│   └── Cream
├── Sweeteners
│   ├── White Sugar
│   ├── Brown Sugar
│   ├── Sweetener Sachets
│   └── Syrups (vanilla, caramel, hazelnut…)
├── Cold Beverages
│   ├── Still Water (bottles)
│   ├── Sparkling Water
│   ├── Soft Drinks (Cola, Juices…)
│   └── Energy Drinks
├── Packaging & Cups
│   ├── Hot Cups (4oz, 8oz, 12oz, 16oz)
│   ├── Cold Cups
│   ├── Lids
│   ├── Sleeves
│   ├── Carry Trays
│   ├── Bags & Napkins
│   └── Stirrers & Straws
├── Cleaning & Hygiene
│   ├── Espresso Machine Cleaner
│   ├── Descaling Products
│   ├── Surface Disinfectants
│   ├── Hand Soap & Sanitizer
│   └── Bin Liners
└── Other Supplies
    ├── Filters (paper, metal)
    └── CO2 Canisters
```

---

## 6. Technical Architecture

### 6.1 System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Clients                          │
│   Web App (React)       Mobile App (React Native)  │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / REST + WebSocket
┌────────────────────▼────────────────────────────────┐
│                  API Gateway                        │
│          (rate limiting, auth, routing)             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│               Backend Services                      │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Auth Svc   │  │  Order Svc   │  │Catalog Svc│  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Invoice Svc │  │ Notif. Svc   │  │ Search Svc│  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Data Layer                          │
│  PostgreSQL (main)   Redis (cache/sessions)        │
│  Elasticsearch (search)   S3/Object store (files)  │
└─────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend Web | **React + TypeScript** | Ecosystem maturity, team familiarity |
| Frontend Mobile | **React Native** | Code sharing with web, phase 2 |
| Styling | **Tailwind CSS** | Rapid UI development |
| State Management | **Zustand** + React Query | Lightweight, async-first |
| Backend | **Node.js + Fastify** | High throughput, JSON-native |
| ORM | **Prisma** | Type-safe DB access, migration management |
| Primary DB | **PostgreSQL** | ACID compliance for financial data |
| Cache | **Redis** | Sessions, rate limiting, pub/sub |
| Search | **Elasticsearch** (or Meilisearch) | Full-text product search |
| File Storage | **AWS S3** / Cloudflare R2 | Product images, invoices |
| Auth | **JWT + Refresh Tokens** | Stateless, scalable |
| Email | **Resend** / SendGrid | Transactional email |
| PDF Generation | **Puppeteer** or `pdf-lib` | Invoices |
| Payments (P2) | **Stripe** | Card + future BNPL |
| Deployment | **Docker + Kubernetes** | Horizontal scaling |
| CI/CD | **GitHub Actions** | Automated test + deploy |
| Monitoring | **Sentry + Prometheus + Grafana** | Error tracking + metrics |

### 6.3 Database Schema (Key Entities)

```
users
  id, email, password_hash, role (buyer|supplier|admin),
  business_name, logo_url, phone, address, vat_id,
  created_at, verified_at

products
  id, supplier_id → users.id,
  name, sku, description, category_id,
  unit, price, min_order_qty, lead_time_days,
  stock_available, images[], created_at, updated_at

orders
  id, buyer_id → users.id, supplier_id → users.id,
  status (pending|confirmed|dispatched|delivered|cancelled),
  total_amount, currency, notes,
  created_at, confirmed_at, dispatched_at, delivered_at

order_items
  id, order_id → orders.id, product_id → products.id,
  quantity, unit_price, subtotal

invoices
  id, order_id → orders.id,
  invoice_number, issued_at, due_date,
  status (unpaid|paid|overdue), pdf_url

reviews
  id, order_id → orders.id, reviewer_id → users.id,
  rating (1-5), comment, created_at

messages
  id, order_id → orders.id,
  sender_id → users.id, content, created_at, read_at

standing_orders
  id, buyer_id, supplier_id, items[],
  frequency (weekly|biweekly|monthly),
  next_run_date, active
```

---

## 7. API Design

RESTful API with versioning (`/api/v1/`).

### Key Endpoints

```
Auth
  POST   /auth/register
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout

Catalog (Supplier)
  GET    /products?category=&supplier=&q=
  POST   /products
  PATCH  /products/:id
  DELETE /products/:id

Orders (Buyer)
  POST   /orders
  GET    /orders?status=&page=
  GET    /orders/:id
  POST   /orders/:id/reorder

Orders (Supplier)
  GET    /supplier/orders
  PATCH  /supplier/orders/:id/confirm
  PATCH  /supplier/orders/:id/dispatch
  PATCH  /supplier/orders/:id/deliver

Invoices
  GET    /invoices/:id
  GET    /invoices/:id/pdf

Reviews
  POST   /reviews
  GET    /suppliers/:id/reviews

Standing Orders
  POST   /standing-orders
  PATCH  /standing-orders/:id
  DELETE /standing-orders/:id
```

---

## 8. User Flows

### 8.1 Buyer — First Order
```
Register → Verify email → Complete business profile
→ Browse categories → Select supplier
→ Add products to cart → Review order → Confirm
→ Receive confirmation email → Track status
→ Mark received → Leave review → Download invoice
```

### 8.2 Supplier — Fulfilling an Order
```
Receive order notification → Review order details
→ Confirm + set delivery date → Prepare goods
→ Mark dispatched (+ add tracking if applicable)
→ Delivered → Invoice auto-generated → Await payment
```

### 8.3 Standing Order (Recurring)
```
Buyer sets up standing order (products + frequency)
→ System auto-places order on schedule
→ Supplier notified → Normal fulfillment flow
→ Buyer can pause/edit/cancel anytime
```

---

## 9. Phased Delivery Roadmap

### Phase 1 — MVP (Weeks 1–10)
**Goal:** Core marketplace loop working end-to-end.

| Week | Milestone |
|---|---|
| 1–2 | Project setup, CI/CD, DB schema, auth system |
| 3–4 | Supplier catalog: create/edit/list products |
| 5–6 | Buyer browse, search, product pages |
| 7–8 | Order placement, order management (buyer + supplier) |
| 9 | Invoice generation (PDF), email notifications |
| 10 | Internal QA, bug fixes, staging deployment |

**Deliverable:** Working platform where a buyer can discover a supplier, place an order, and receive an invoice.

---

### Phase 2 — Growth (Weeks 11–18)
- Standing / recurring orders
- Reviews and supplier ratings
- In-app messaging (per order)
- Buyer dashboard: spend analytics, top products
- Supplier dashboard: revenue charts, best buyers
- Admin panel: user management, KYC approval
- Mobile app (React Native)

---

### Phase 3 — Scale (Weeks 19–26)
- Payment integration (Stripe): card, BNPL
- Multi-currency support
- Advanced search (Elasticsearch / Meilisearch)
- Bulk ordering / quote requests (RFQ flow)
- Supplier promotions and featured listings
- WhatsApp / SMS notifications
- Logistics integration (delivery tracking APIs)
- Multi-warehouse support for large suppliers

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time (P95) | < 300ms |
| Uptime SLA | 99.9% |
| Concurrent users (MVP) | 500 |
| Concurrent users (Phase 3) | 10,000+ |
| Data encryption | At-rest (AES-256) + In-transit (TLS 1.3) |
| GDPR compliance | Data export + right to erasure |
| Accessibility | WCAG 2.1 AA |
| Mobile responsiveness | All buyer-facing screens |

---

## 11. Security Considerations

- **Authentication:** JWT with short expiry (15 min) + refresh token rotation
- **Authorization:** Role-based access control (RBAC) enforced at API layer
- **Input validation:** Zod schemas on all endpoints
- **SQL injection:** Parameterized queries via Prisma
- **File uploads:** Type validation, size limits, virus scan on S3 trigger
- **Rate limiting:** Per-IP and per-user via Redis
- **Secrets management:** Environment variables via Vault / AWS Secrets Manager
- **Audit logging:** All financial actions logged with user + timestamp

---

## 12. Project Structure (Monorepo)

```
/
├── apps/
│   ├── web/                  # React web app
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── stores/
│   │   │   └── api/
│   │   └── package.json
│   ├── mobile/               # React Native (Phase 2)
│   └── api/                  # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── middleware/
│       │   ├── lib/
│       │   └── jobs/         # Standing order scheduler
│       └── package.json
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── ui/                   # Shared component library
│   └── utils/                # Shared utilities
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/
│   └── terraform/
├── docs/
│   ├── api/                  # OpenAPI spec
│   └── architecture/
├── plan.md                   # This file
└── README.md
```

---

## 13. Team & Roles (Recommended)

| Role | Responsibility |
|---|---|
| Lead Architect (you) | Technical decisions, code review, system design |
| 2× Backend Engineers | API, DB, services, jobs |
| 2× Frontend Engineers | Web app, component library |
| 1× Mobile Engineer | React Native (Phase 2) |
| 1× DevOps Engineer | Infrastructure, CI/CD, monitoring |
| 1× QA Engineer | Test plans, E2E automation |
| 1× Product Designer | UX/UI, design system |

---

## 14. Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supplier onboarding friction | High | High | Guided onboarding, CSV import, dedicated support |
| Payment disputes | Medium | High | Clear invoice trail, dispute resolution flow |
| Low initial liquidity (few suppliers) | High | High | Manually onboard anchor suppliers pre-launch |
| Delivery reliability | Medium | High | Supplier SLAs, ratings system, dispute flow |
| Data security breach | Low | Critical | Penetration testing, secrets management, audit logs |
| Scope creep | High | Medium | Strict phase gating, product backlog reviews |

---

## 15. Definition of Done — MVP

A feature is considered done when:
- [ ] Implementation complete with unit tests (≥ 80% coverage)
- [ ] API endpoint documented in OpenAPI spec
- [ ] Code reviewed and approved by lead architect
- [ ] QA sign-off on happy path and key error cases
- [ ] Deployed to staging environment
- [ ] Product owner acceptance

---

## 16. Open Questions

1. **Geography:** Single-city launch or multi-region from day one? → affects delivery zone logic
2. **Commission model:** Does the platform take a % per order, or is it SaaS subscription?
3. **Payment terms:** Will platform hold payments in escrow or pass through directly?
4. **Languages:** Arabic + French + English for Tunisia/MENA market?
5. **Minimum order values:** Enforced at platform level or left to each supplier?
6. **Logistics:** Platform-managed delivery or supplier-managed delivery only?

---

*Last updated: 2026-09-01 — Lead Architect*
