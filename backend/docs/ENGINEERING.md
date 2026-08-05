# Truepoint backend - internal engineering docs

This is the internal-team companion to the public developer portal (`/api/docs/`,
`/api/redoc/`) - architecture and data-model notes for engineers working on
this codebase, not for third-party API consumers. Keep these audiences
separate per `skills/platform-api/SKILL.md`.

## Layout

One Django project (`config/`), one Postgres database, one app per feature
module - see `../skills/README.md` for the full module list and
`../skills/platform-guidelines/references/platform-architecture.md` for the
architecture rationale (the modular-monolith rule, the shared `TrackedItem`/
`DocumentLifecycleStatus` base, the audit log as first-class object).

Every app follows the same internal shape: `models.py`, `services.py`
(the only interface other apps are allowed to call), `serializers.py`,
`views.py`, `urls.py`, `admin.py`, `tests/`.

## API surfaces

- `/api/v1/<module>/` - internal, JWT-authenticated, used by the `frontend/` app.
- `/api/public/v1/` - external, API-key-authenticated, documented at `/api/docs/` (Swagger UI) and `/api/redoc/` (Redoc). Generated from `platform_api`'s facade views via `drf-spectacular`.
- `/api/v1/platform-api/` - project-admin-facing key/webhook management (JWT-authenticated - you can't fetch your first API key *with* an API key).

## Documentation tooling

OpenAPI 3 schema generation: **drf-spectacular** (DRF's own recommended
generator, replacing the now-unmaintained-for-OpenAPI-3 `drf-yasg`).
Rendered via its bundled, self-hosted Swagger UI and Redoc views
(`drf-spectacular-sidecar` - static assets shipped in the package, no CDN
dependency). To add a new public endpoint's docs, give it a docstring and
(if it's a plain `APIView` rather than a `GenericAPIView`) an
`@extend_schema(...)` decorator - see `platform_api/views.py`'s
`Public*View` classes for the pattern.

## Known scope limitations (deliberately not built)

- **AI/CV progress estimation from site photos** and **weather-data
  auto-tagging** (Module 6) - both skills explicitly flag these as
  "solved in research, unbuilt in product"; not stubbed here.
- **field-capture** (WhatsApp ingestion, Module 1) and **unified-timeline**
  (email OAuth / Balady sync, Module 2) aren't built. `observability`'s
  integration-health registry is a real, callable API
  (`report_integration_health(...)`) with no live integration behind it
  yet - any seeded status is a labeled simulation.
- **Webhook delivery is synchronous** (`platform_api.services.dispatch_webhook_event`
  makes the HTTP call inline). Production should move this onto an async
  task queue (Celery/RQ) so a slow subscriber endpoint can't block the
  request that triggered it; `retry_failed_webhooks` is a management
  command today, meant to run on a schedule.
- **Data retention enforcement is reporting-only.** `accounts.DataRetentionPolicy`
  and the compliance endpoint report the configured retention window and
  residency region - nothing here automatically purges data. Actual
  deletion is a deliberate, separate, human-triggered operation.
