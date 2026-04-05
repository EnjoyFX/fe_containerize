#!/bin/bash
set -euo pipefail

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
REDEPLOY_TS="$(date +%s)"
helm upgrade --install fe-containerize ./fe-containerize \
  --set db.password="$DB_PASSWORD" \
  --set frontend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --set backend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --set microfrontend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --wait

echo "==> Done!"
echo "    kubectl get pods -n fe-containerize"
