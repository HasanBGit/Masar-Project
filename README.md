# 🏗️ Masar (مسار) / San3 (صنع) Platform

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)](backend/README.md)
[![Backend](https://img.shields.io/badge/Backend-Django%205.0%20%7C%20DRF-092E20.svg)](backend/README.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg)](frontend/README.md)
[![Landing Site](https://img.shields.io/badge/Site-React%20%7C%20Tailwind%20v4-38BDF8.svg)](site/README.md)
[![Compliance](https://img.shields.io/badge/Data%20Residency-Saudi%20Arabia%20(PDPL)-green.svg)](#security--data-residency)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](#testing)

**Masar (Truepoint)** is an enterprise-grade construction, engineering, and infrastructure project governance platform tailored for Saudi Arabia's mega-projects and commercial developments. It unites project Owners, Investors, Consultants, and Contractors under a single, evidence-backed, trust-calibrated workflow.

---

## 📐 Monorepo Architecture

The repository is structured as a clean, production-ready monorepo with three primary deployables and domain specs:

```
Masar-Project/
├── backend/                  # Django 5 + DRF + PostgreSQL modular monolith API
│   ├── accounts/             # User auth (JWT), Project Roster, RBAC, Data Residency
│   ├── approvals/            # 3-Edges decision kernel (Hearing → Understanding → Agreeing)
│   ├── dashboard/            # Role-differentiated executive views (Owner/Investor/Consultant/Contractor)
│   ├── trust_evidence/       # Immutable AuditEvent log & cryptographically signed evidence
│   ├── rfi_change_control/   # RFI management & Change Order cost impact tracking
│   ├── drawings_studio/      # 2D/3D BIM drawing markup, annotation, and model viewer
│   ├── handover/             # Closeout, warranty tracking, and defect punch lists
│   ├── contract_payments/    # Milestone payments & RAG legal agent compliance assistant
│   ├── observability/        # System health, SLA monitoring, security event tracking
│   └── platform_api/         # Public partner API facade & webhooks
├── frontend/                 # Owner & Stakeholder App (React 19 + TypeScript + Vite + Tailwind v4)
├── site/                     # Marketing & Public Landing Page (React 19 + Vite + i18next)
├── skills/                   # Domain architecture guidelines & platform specifications
├── DEPLOYMENT.md             # Production deployment guide (Vercel + Render + Supabase)
├── package.json              # Monorepo task orchestration scripts
└── .env.example              # Root environment variable template
```

---

## 🔗 Frontend & Backend Connectivity

The frontend and backend interact seamlessly across local development, staging, and production environments:

```
+------------------------------------+        JWT Auth Header        +-----------------------------------+
|  React 19 SPA (frontend)          | ----------------------------> |  Django DRF Monolith (backend)    |
|  - Axios client (src/lib/api.ts)  |                               |  - /api/v1/auth/token/            |
|  - Auto JWT refresh on 401        | <---------------------------  |  - /api/v1/approvals/             |
+------------------------------------+         JSON Response         +-----------------------------------+
                  |                                                                    |
    (Vite Proxy in Dev: :5174 -> :8000)                               (Postgres DB / Supabase)
```

1. **Local Development Proxy**: In development, `frontend/vite.config.ts` automatically proxies `/api` and `/media` requests from `http://localhost:5174` to the Django dev server on `http://127.0.0.1:8000` (configurable via `VITE_BACKEND_TARGET`).
2. **Production Cross-Origin API**: In production (Vercel), `VITE_API_URL` points directly to the deployed backend URL (e.g. `https://api.masar.sa/api/v1`). CORS headers and CSRF trusted origins are configured via backend environment variables (`CORS_ALLOWED_ORIGINS` & `CSRF_TRUSTED_ORIGINS`).
3. **Authentication Lifecycle**: Statestless JWT authorization using `djangorestframework-simplejwt`. The frontend client (`frontend/src/lib/api.ts`) automatically injects `Bearer <token>` headers and handles background token refresh on `401 Unauthorized` responses.
4. **Health Check Probes**: Real-time backend system health probes are exposed at `/health/` and `/api/v1/observability/health/`, returning HTTP 200 OK with database connection status, data residency region code (`sa`), and API version.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 18+
- **PostgreSQL**: 14+ (Local PostgreSQL or Supabase instance)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment & install dependencies
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment & database
cp .env.example .env
createdb truepoint_dev    # Ensure Postgres is running locally

# Apply database migrations
python manage.py migrate

# Seed demo dataset (creates demo project, users, and decisions)
python manage.py seed_demo

# Start Django development server (http://127.0.0.1:8000)
python manage.py runserver 8000
```

#### Demo User Accounts (Password for all: `demo1234`)
| Role | Email | Access Rights |
|---|---|---|
| **Owner** | `owner@truepoint.sa` | Full project administration & roster control |
| **Investor** | `investor@truepoint.sa` | High-stakes decision visibility & financial summaries |
| **Consultant** | `consultant@truepoint.sa` | Technical reviews, RFI responses, drawing markups |
| **Contractor** | `contractor@truepoint.sa` | RFI creation, action item execution, defect logging |

---

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server (http://localhost:5174)
npm run dev
```

---

### 3. Landing Site Setup

```bash
cd site

# Install Node dependencies
npm install

# Start landing page server (http://localhost:5173)
npm run dev
```

---

## 🛠️ Monorepo Root Commands

Run these convenient commands from the repository root directory:

| Command | Action |
|---|---|
| `npm run dev:backend` | Starts the Django API dev server |
| `npm run dev:frontend` | Starts the React SPA app dev server |
| `npm run dev:site` | Starts the marketing landing page dev server |
| `npm run build` | Compiles production builds for both `frontend` and `site` |
| `npm run test` | Runs frontend Vitest suite & backend Pytest suite |
| `npm run lint` | Runs Oxlint across all TypeScript codebases |

---

## 📖 API Documentation & OpenAPI Specs

The platform includes self-hosted interactive API documentation generated directly from DRF viewsets via `drf-spectacular`:

- **Swagger UI**: [`/api/docs/`](http://127.0.0.1:8000/api/docs/)
- **ReDoc Portal**: [`/api/redoc/`](http://127.0.0.1:8000/api/redoc/)
- **OpenAPI 3 Schema**: [`/api/schema/`](http://127.0.0.1:8000/api/schema/)
- **System Health Probe**: [`/health/`](http://127.0.0.1:8000/health/)

---

## 🧪 Testing & Verification

Both frontend and backend test suites achieve 100% pass rates:

### Backend Pytest Suite
```bash
cd backend
./venv/bin/pytest --reuse-db
```
*Covers RACI state machine transitions, 3-Edges decision logic, SLA escalation, audit event logging, and IDOR permission boundaries (100 tests passed).*

### Frontend Vitest Suite
```bash
cd frontend
npm test
```
*Covers dashboard rendering, decision workflow interactions, and contract payment management (6 tests passed).*

---

## 🔒 Security & Data Residency

- **Saudi PDPL Compliance**: Enforces Saudi Arabia data residency (`DATA_RESIDENCY_REGION=sa`) at both platform architecture and project policy levels.
- **Immutable Audit Trail**: Every decision state change, document upload, and roster modification logs an immutable `AuditEvent` record with timestamp, actor ID, and metadata payload.
- **Strict Role-Based Access Control (RBAC)**: Role permissions (`OWNER`, `INVESTOR`, `CONSULTANT`, `CONTRACTOR`) are enforced at the database level and verified per API endpoint.

---

## 🌐 Production Deployment

Refer to [`DEPLOYMENT.md`](file:///Users/hassan/Documents/Work/Masar%20-%20San3/Project/Masar-Project/DEPLOYMENT.md) for step-by-step production deployment instructions:

- **Frontend & Site**: Deployed as static SPAs on **Vercel**.
- **Backend API**: Deployed on **Render**, **Railway**, or **Fly.io** with Gunicorn & automatic migration execution.
- **Database**: Managed PostgreSQL hosted on **Supabase** (Pooled Transaction Mode).
- **Storage**: S3-compatible file storage hosted on **Supabase Storage**.

---

## 📄 License

Copyright © 2026 San3 Engineering. All rights reserved.
