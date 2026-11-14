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

# Deploy with Helm (secrets passed via temp file to avoid exposure in process list)
echo "==> Deploying with Helm..."
cd helm
# Read KEY from ../.env the way docker compose does: quoted values are taken
# verbatim, unquoted ones lose inline " # comments" and surrounding whitespace
env_value() {
  local v
  v="$(grep -E "^$1=" ../.env 2>/dev/null | head -n1 | cut -d= -f2-)" || true
  v="${v%$'\r'}"
  if [[ $v =~ ^[[:space:]]*\"([^\"]*)\" ]] || [[ $v =~ ^[[:space:]]*\'([^\']*)\' ]]; then
    v="${BASH_REMATCH[1]}"
  else
    v="$(printf '%s' "$v" | sed -E 's/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//')"
  fi
  printf '%s' "$v"
}
# Escape for a double-quoted YAML scalar
yaml_escape() { local v="${1//\\/\\\\}"; printf '%s' "${v//\"/\\\"}"; }

DB_PASSWORD="$(env_value POSTGRES_PASSWORD)"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_ME_USE_STRONG_PASSWORD}"
AUTH_USER="$(env_value AUTH_USER)"
AUTH_PASSWORD="$(env_value AUTH_PASSWORD)"
JWT_SECRET="$(env_value JWT_SECRET)"

SECRETS_FILE="$(mktemp)"
trap 'rm -f "$SECRETS_FILE"' EXIT
cat > "$SECRETS_FILE" <<EOF
db:
  password: "$(yaml_escape "$DB_PASSWORD")"
backend:
  authUser: "$(yaml_escape "$AUTH_USER")"
  authPassword: "$(yaml_escape "$AUTH_PASSWORD")"
  jwtSecret: "$(yaml_escape "$JWT_SECRET")"
EOF
chmod 600 "$SECRETS_FILE"

REDEPLOY_TS="$(date +%s)"
helm upgrade --install fe-containerize ./fe-containerize \
  -n fe-containerize --create-namespace \
  -f "$SECRETS_FILE" \
  --set-string frontend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --set-string backend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --set-string microfrontend.podAnnotations.redeployTimestamp="$REDEPLOY_TS" \
  --wait

echo "==> Done!"
echo "    kubectl get pods -n fe-containerize"
