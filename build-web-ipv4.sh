#!/usr/bin/env sh
set -eu

VERSION="${VERSION:-$(git describe --tags --abbrev=0 2>/dev/null || echo "dev")}"
REGISTRY="${REGISTRY:-ghcr.io/alexlite}"
FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-${REGISTRY}/plane-frontend-ru:${VERSION}}"
REGISTRY_HOST="${REGISTRY_HOST:-registry.npmjs.org}"
VITE_WEB_BASE_URL_VALUE="${VITE_WEB_BASE_URL:-${WEB_URL:-}}"
REGISTRY_IP="$(getent ahostsv4 "$REGISTRY_HOST" | awk 'NR == 1 { print $1 }')"

if [ -z "$REGISTRY_IP" ]; then
  echo "Unable to resolve IPv4 address for $REGISTRY_HOST" >&2
  exit 1
fi

docker build \
  --network host \
  --add-host "$REGISTRY_HOST:$REGISTRY_IP" \
  --build-arg "VITE_WEB_BASE_URL=$VITE_WEB_BASE_URL_VALUE" \
  -f apps/web/Dockerfile.web \
  -t "$FRONTEND_IMAGE_TAG" \
  .
