# AgriManage

Multi-tenant farm & agriculture management platform. It covers the full farm operating cycle — land, production, resources, commerce, finance and workforce — behind a role-based permission system, with a bilingual (English / Amharic) web client.

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 12 (PHP 8.2+), Laravel Sanctum, SQLite (default), PHPUnit |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts |
| Auth | Personal access tokens (Sanctum) stored in `localStorage` |

## Repository layout

```
AgriManage/
├── backend/    Laravel REST API  (routes/api.php, app/Http/Controllers/Api/V1)
├── frontend/   Next.js web app   (app/, components/, lib/)
└── README.md
```

## Features

- **Multi-tenancy** — every record is scoped to an organization (`BelongsToOrganization`); users belong to one organization with a single role.
- **RBAC** — central permission catalogue (`app/Support/PermissionCatalog.php`) in the form `module.resource.action`, mapped to roles per organization and enforced by `EnsurePermission` middleware.
- **Audit trail** — the `Auditable` trait records create/update/delete activity into `audit_logs`.
- **Land** — farms, fields (with area/coordinates), land records.
- **Production** — seasons, crops, crop plans, activities, harvest batches (yield tracking), irrigation, treatments.
- **Resources** — equipment + maintenance, inventory items with stock movements and low-stock thresholds, attendance, payroll runs.
- **Commerce** — customers, sales + sale items, purchase orders + items, export documents, contracts.
- **Finance** — expenses, payments (with verification flow), budgets, budgets/expense depth reports.
- **Platform** — dashboard, analytics, reports, global search, notifications, settings & user management, audit log viewer, i18n (`en`, `am`).

## Prerequisites

- PHP >= 8.2 with Composer
- Node.js >= 20 with npm
- SQLite (used by default; no external DB server required)

## Backend setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve          # API at http://localhost:8000
```

The seeder creates a demo tenant with a full data cycle:

| Field | Value |
| --- | --- |
| Email | `owner@demo-teff-farm.test` |
| Password | `password` |
| Organization | Demo Teff Farm — Oromia |

Additional seeded users follow the pattern `<role>@demo-teff-farm.test` (`manager`, `agronomist`, `accountant`, `worker`), all with the password `password`.

Run the test suite:

```bash
cd backend
composer test          # or: php artisan test
```

Tests cover auth, RBAC, tenant isolation, inventory adjustments, harvest yield, payment verification, finance/operations/supply-chain depth, analytics and endpoint smoke checks.

## Frontend setup

```bash
cd frontend
npm install
npm run dev             # http://localhost:3000
```

Environment variable:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

Other scripts:

```bash
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## API overview

All endpoints live under `/api/v1` and are defined in `backend/routes/api.php`.

- Public: `POST /auth/register`, `POST /auth/login`
- Authenticated (`auth:sanctum` + `organization.active`): `POST /auth/logout`, `GET /auth/me`
- Resources (uniform `index` / `store` / `show` / `update` / `destroy`): farms, fields, seasons, crops, crop-plans, activities, harvest, irrigation, treatments, equipment, maintenance, inventory, attendance, payroll, budgets, expenses, payments, customers, sales, purchase-orders, export-documents, contracts, land-records, workers, users, notifications, plans, reports, dashboard, analytics, search, meta/lookups.

Example:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"owner@demo-teff-farm.test","password":"password"}'
```

## Development notes

- Money is handled as decimal values; quantities carry units (see `frontend/lib/units.ts`).
- The frontend keeps the API token under the `agrimanage.token` key in `localStorage`.
- `.env` files, `vendor/`, `node_modules/`, `.next/`, SQLite databases and logs are excluded from version control.
