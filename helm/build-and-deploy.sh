#!/bin/bash
set -euo pipefail

# Generate project files JSON for UI
echo "==> Generating project files..."
python3 scripts/generate-project-files.py

# Build images using docker compose
echo "==> Building images..."
cd "$(dirname "$0")/.."
docker compose build

# Import images into k3s containerd
echo "==> Importing images into k3s..."
for svc in frontend backend microfrontend; do
  echo "    $svc..."
  docker save "fe_containerize-$svc:latest" | sudo k3s ctr images import -
done

# Deploy with Helm
echo "==> Deploying with Helm..."
cd helm
DB_PASSWORD="$(awk -F= '/^POSTGRES_PASSWORD=/{print substr($0, index($0,$2)); exit}' ../.env 2>/dev/null || true)"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_ME_USE_STRONG_PASSWORD}"
AUTH_USER="$(awk -F= '/^AUTH_USER=/{print substr($0, index($0,$2)); exit}' ../.env 2>/dev/null || true)"
AUTH_PASSWORD="$(awk -F= '/^AUTH_PASSWORD=/{print substr($0, index($0,$2)); exit}' ../.env 2>/dev/null || true)"
JWT_SECRET="$(awk -F= '/^JWT_SECRET=/{print substr($0, index($0,$2)); exit}' ../.env 2>/dev/null || true)"
REDEPLOY_TS="$(date +%s)"
helm upgrade --install fe-containerize ./fe-containerize \
  -n fe-containerize --create-namespace \
  --set db.password="$DB_PASSWORD" \
  --set backend.authUser="$AUTH_USER" \
  --set backend.authPassword="$AUTH_PASSWORD" \
  --set backend.jwtSecret="$JWT_SECRET" \
  --set-string frontend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --set-string backend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --set-string microfrontend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --wait

echo "==> Done!"
echo "    kubectl get pods -n fe-containerize"
