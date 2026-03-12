#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/dev"

if [[ ! -f "$DEV_DIR/.env" ]]; then
  cp "$DEV_DIR/.env.example" "$DEV_DIR/.env"
  echo "Created $DEV_DIR/.env from template. Review credentials before first run."
fi

cd "$DEV_DIR"
docker compose --env-file .env -f docker-compose.yml up -d db wordpress

WP_URL=$(grep '^WP_URL=' .env | cut -d'=' -f2-)
WP_TITLE=$(grep '^WP_TITLE=' .env | cut -d'=' -f2-)
WP_ADMIN_USER=$(grep '^WP_ADMIN_USER=' .env | cut -d'=' -f2-)
WP_ADMIN_PASSWORD=$(grep '^WP_ADMIN_PASSWORD=' .env | cut -d'=' -f2-)
WP_ADMIN_EMAIL=$(grep '^WP_ADMIN_EMAIL=' .env | cut -d'=' -f2-)

# Wait for WordPress service to accept requests
for _ in {1..30}; do
  if docker compose --env-file .env -f docker-compose.yml run --rm wpcli core is-installed >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker compose --env-file .env -f docker-compose.yml run --rm wpcli core is-installed >/dev/null 2>&1; then
  docker compose --env-file .env -f docker-compose.yml run --rm wpcli core install \
    --url="$WP_URL" \
    --title="$WP_TITLE" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASSWORD" \
    --admin_email="$WP_ADMIN_EMAIL"
fi

docker compose --env-file .env -f docker-compose.yml run --rm wpcli plugin activate engine-core || true
docker compose --env-file .env -f docker-compose.yml run --rm wpcli theme activate engine-theme || true

echo "Local WordPress is ready at $WP_URL"
