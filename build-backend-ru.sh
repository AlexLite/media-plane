#!/usr/bin/env sh
set -eu

docker build \
  --network "${DOCKER_BUILD_NETWORK:-host}" \
  -f apps/api/Dockerfile.api \
  -t "${BACKEND_IMAGE_TAG:-plane-backend-ru:v1.3.1-ru-clean-final}" \
  apps/api
