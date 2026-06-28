#!/usr/bin/env sh
set -eu

ALPINE_REPOSITORY_HOST="${ALPINE_REPOSITORY_HOST:-dl-cdn.alpinelinux.org}"
ALPINE_REPOSITORY_IP="$(getent ahostsv4 "$ALPINE_REPOSITORY_HOST" | awk 'NR == 1 { print $1 }')"

if [ -z "$ALPINE_REPOSITORY_IP" ]; then
  echo "Unable to resolve IPv4 address for $ALPINE_REPOSITORY_HOST" >&2
  exit 1
fi

docker build \
  --network "${DOCKER_BUILD_NETWORK:-host}" \
  --add-host "$ALPINE_REPOSITORY_HOST:$ALPINE_REPOSITORY_IP" \
  -f apps/api/Dockerfile.api \
  -t "${BACKEND_IMAGE_TAG:-plane-backend-ru:v1.3.1-ru-clean-final}" \
  apps/api
