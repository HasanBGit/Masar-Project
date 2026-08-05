#!/usr/bin/env bash
# ------------------------------------------------------------
# Deploy Masar-Project frontend and site to Vercel using the Vercel CLI.
# ------------------------------------------------------------
# Prerequisites:
#   1. Install the Vercel CLI (`npm i -g vercel`).
#   2. Run `vercel login` and authenticate with your Vercel account.
#   3. Ensure the Railway backend is already deployed and you have its URL.
#
# Usage:
#   export VERCEL_FRONTEND_URL="https://your-backend.up.railway.app/api/v1"
#   ./deploy_vercel.sh
# ------------------------------------------------------------

set -euo pipefail

# ----------- Variables (edit if needed ----------
# Backend API URL – replace with your actual Railway backend URL.
# If the variable is not set, the script will abort.
if [[ -z "${VERCEL_FRONTEND_URL:-}" ]]; then
  echo "Error: VERCEL_FRONTEND_URL environment variable not set."
  echo "Set it to your Railway backend URL (e.g. https://my-backend.up.railway.app/api/v1) and re-run."
  exit 1
fi

# Project directories
FRONTEND_DIR="frontend"
SITE_DIR="site"

# ------------------------------------------------
# Deploy Frontend (SPA) – with VITE_API_URL env var
# ------------------------------------------------
cd "$FRONTEND_DIR"
# Add or update the environment variable for the Vercel project
vercel env add VITE_API_URL production <<EOF
$VERCEL_FRONTEND_URL
EOF
# Deploy the frontend project
vercel --prod --confirm
cd -

# ------------------------------------------------
# Deploy Site (static landing page)
# ------------------------------------------------
cd "$SITE_DIR"
vercel --prod --confirm
cd -

echo "✅ Deployments to Vercel completed."
