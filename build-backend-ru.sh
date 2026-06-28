#!/usr/bin/env sh
set -eu

docker build \
  -f apps/api/Dockerfile.api \
  -t "${BACKEND_IMAGE_TAG:-plane-backend-ru:v1.3.1-ru-clean-final}" \
  apps/api
