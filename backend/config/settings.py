"""
Django settings for Truepoint's backend - modular monolith per
skills/platform-guidelines/references/platform-architecture.md.
"""

import os
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, True))
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-only-insecure-secret-key-change-in-production")
DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    # Truepoint feature modules (one Django app each, per skills/README.md)
    "core",
    "accounts",
    "approvals",
    "dashboard",
    "trust_evidence",
    "rfi_change_control",
    "handover",
    "observability",
    "platform_api",
    "drawings_studio",
    "contract_payments",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database ---------------------------------------------------------------
# PostgreSQL only - no SQLite fallback, so dev parity with production is real.
# CONN_MAX_AGE keeps connections persistent (reduces per-request connect
# overhead); production should sit a pooler (pgbouncer/RDS Proxy) in front of
# this for horizontal API-server scaling.
_default_db_url = f"postgres://{os.environ.get('USER', 'postgres')}@127.0.0.1:5432/truepoint_dev"
DATABASES = {"default": env.db("DATABASE_URL", default=_default_db_url)}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
# Supabase (and most managed Postgres) requires TLS. env.db() already turns a
# "?sslmode=require" query param on DATABASE_URL into OPTIONS, but default to
# requiring it outside of local dev so a plain DATABASE_URL still connects
# securely against Supabase.
if not DEBUG:
    DATABASES["default"].setdefault("OPTIONS", {}).setdefault("sslmode", "require")

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Riyadh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Media (uploaded files) --------------------------------------------------
# Local disk by default (dev). Most deploy targets (Render/Railway, and
# especially Vercel serverless) have an ephemeral filesystem, so production
# must point at object storage - Supabase Storage exposes an S3-compatible
# endpoint, so django-storages' S3 backend works against it unmodified. Set
# the AWS_* vars below to your Supabase Storage project's S3 credentials to
# switch over; leave them unset and disk storage (and DEBUG-only serving in
# urls.py) keeps working for local dev.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
if AWS_STORAGE_BUCKET_NAME:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL")  # e.g. https://<project>.supabase.co/storage/v1/s3
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    STORAGES["default"] = {"BACKEND": "storages.backends.s3.S3Storage"}
else:
    STORAGES["default"] = {"BACKEND": "django.core.files.storage.FileSystemStorage"}

# --- DRF / JWT ---------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "config.exception_handlers.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Truepoint Public API",
    "DESCRIPTION": "Project timeline, approvals, and evidence records for partner/integration use.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "USER_ID_FIELD": "id",
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:5174", "http://127.0.0.1:5174"]
)
# Needed for the Django admin's session-based CSRF check once the frontend
# (Vercel) lives on a different origin than the API - unlike CORS_ALLOWED_ORIGINS
# this must be an exact scheme+host match, no wildcards.
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# --- Production hardening ----------------------------------------------------
# Render/Railway/Vercel all terminate TLS at a proxy and forward plain HTTP,
# so Django needs to trust X-Forwarded-Proto to know a request was actually
# HTTPS (otherwise SECURE_SSL_REDIRECT loops and request.is_secure() is wrong).
if not DEBUG:
    # Railway / Render / Fly all terminate TLS at the edge and forward plain
    # HTTP internally on the container port (8080). Setting SECURE_SSL_REDIRECT
    # would cause an infinite redirect loop because the internal request is
    # always plain HTTP. The proxy header below is enough to make
    # request.is_secure() return True and let cookies work correctly.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=60)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)

# Saudi data residency (PDPL) as an enforced architecture property, not just
# a policy citation - see skills/access-control-admin/SKILL.md. This is the
# platform's actual hosting-region declaration; per-project
# accounts.DataRetentionPolicy.data_residency_region should match it.
DATA_RESIDENCY_REGION = env("DATA_RESIDENCY_REGION", default="sa")

# AI / LLM Integration - OpenRouter (Gemini Flash) with fallbacks
OPENROUTER_API_KEY = env("OPENROUTER_API_KEY", default="")
OPENROUTER_MODEL = env("OPENROUTER_MODEL", default="google/gemini-2.5-flash")
VOYAGE_API_KEY = env("VOYAGE_API_KEY", default="")
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")

