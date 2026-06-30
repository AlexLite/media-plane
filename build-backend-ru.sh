#!/usr/bin/env sh
set -eu

ALPINE_REPOSITORY_HOST="${ALPINE_REPOSITORY_HOST:-dl-cdn.alpinelinux.org}"
ALPINE_REPOSITORY_IP="$(getent ahostsv4 "$ALPINE_REPOSITORY_HOST" | awk 'NR == 1 { print $1 }')"
PYPI_HOST="${PYPI_HOST:-pypi.org}"
PYPI_HOST_IP="$(getent ahostsv4 "$PYPI_HOST" | awk 'NR == 1 { print $1 }')"
PYPI_FILES_HOST="${PYPI_FILES_HOST:-files.pythonhosted.org}"
PYPI_FILES_HOST_IP="$(getent ahostsv4 "$PYPI_FILES_HOST" | awk 'NR == 1 { print $1 }')"
RELEASE_VERSION_VALUE="$(cat RELEASE_VERSION 2>/dev/null || echo v1.3.1-ru)"
GIT_REVISION="$(git rev-parse HEAD)"
GIT_SHA="$(git rev-parse --short=12 HEAD)"
DEFAULT_BACKEND_IMAGE_TAG="plane-backend-ru:${RELEASE_VERSION_VALUE}-${GIT_SHA}"

if [ "${ALLOW_DIRTY_BUILD:-0}" != "1" ] && ! git diff --quiet; then
  echo "Refusing to build from a dirty worktree. Commit or stash tracked changes, or set ALLOW_DIRTY_BUILD=1." >&2
  exit 1
fi
if [ "${ALLOW_DIRTY_BUILD:-0}" != "1" ] && ! git diff --cached --quiet; then
  echo "Refusing to build with staged changes. Commit or unstage them, or set ALLOW_DIRTY_BUILD=1." >&2
  exit 1
fi

if [ -z "$ALPINE_REPOSITORY_IP" ]; then
  echo "Unable to resolve IPv4 address for $ALPINE_REPOSITORY_HOST" >&2
  exit 1
fi
if [ -z "$PYPI_HOST_IP" ] || [ -z "$PYPI_FILES_HOST_IP" ]; then
  echo "Unable to resolve IPv4 address for PyPI hosts" >&2
  exit 1
fi

docker build \
  --network "${DOCKER_BUILD_NETWORK:-host}" \
  --add-host "$ALPINE_REPOSITORY_HOST:$ALPINE_REPOSITORY_IP" \
  --add-host "$PYPI_HOST:$PYPI_HOST_IP" \
  --add-host "$PYPI_FILES_HOST:$PYPI_FILES_HOST_IP" \
  --label "org.opencontainers.image.revision=$GIT_REVISION" \
  -f apps/api/Dockerfile.api \
  -t "${BACKEND_IMAGE_TAG:-$DEFAULT_BACKEND_IMAGE_TAG}" \
  apps/api
