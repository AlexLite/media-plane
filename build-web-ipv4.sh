#!/usr/bin/env sh
set -eu

REGISTRY_HOST="${REGISTRY_HOST:-registry.npmjs.org}"
VITE_WEB_BASE_URL_VALUE="${VITE_WEB_BASE_URL:-${WEB_URL:-}}"
REGISTRY_IP="$(getent ahostsv4 "$REGISTRY_HOST" | awk 'NR == 1 { print $1 }')"
RELEASE_VERSION_VALUE="$(cat RELEASE_VERSION 2>/dev/null || echo v1.3.1-ru)"
GIT_REVISION="$(git rev-parse HEAD)"
GIT_SHA="$(git rev-parse --short=12 HEAD)"
DEFAULT_FRONTEND_IMAGE_TAG="plane-frontend-ru:${RELEASE_VERSION_VALUE}-${GIT_SHA}"

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Refusing to build a release image from a dirty worktree, including untracked files." >&2
  exit 1
fi

if [ -z "$REGISTRY_IP" ]; then
  echo "Unable to resolve IPv4 address for $REGISTRY_HOST" >&2
  exit 1
fi

docker build \
  --network host \
  --add-host "$REGISTRY_HOST:$REGISTRY_IP" \
  --build-arg "VITE_WEB_BASE_URL=$VITE_WEB_BASE_URL_VALUE" \
  --label "org.opencontainers.image.revision=$GIT_REVISION" \
  -f apps/web/Dockerfile.web \
  -t "${FRONTEND_IMAGE_TAG:-$DEFAULT_FRONTEND_IMAGE_TAG}" \
  .
