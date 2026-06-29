#!/usr/bin/env bash

set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-plane2}"
COMPOSE_PATH="${COMPOSE_PATH:-/home/dev/plane-selfhost/plane-app}"

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 <frontend-image-tag>" >&2
  exit 1
fi

image_tag="$1"

ssh "$DEPLOY_HOST" bash -s -- "$COMPOSE_PATH" "$image_tag" <<'REMOTE'
set -euo pipefail

compose_path="$1"
image_tag="$2"

cd "$compose_path"
cp docker-compose.override.yml "docker-compose.override.yml.bak-frontend-$(date +%Y%m%d-%H%M%S)"
sed -i -E "s#plane-frontend-ru:[^[:space:]]+#${image_tag}#g" docker-compose.override.yml

wait_healthy() {
  local container="$1"

  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$container")" = healthy ]; do
    sleep 1
  done
}

docker compose up -d --no-deps web
wait_healthy plane-app-web-1

docker compose up -d --no-deps web-ru
wait_healthy plane-app-web-ru-1

docker compose ps web web-ru
REMOTE
