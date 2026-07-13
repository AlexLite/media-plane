#!/usr/bin/env bash

set -euo pipefail

REMOTE_NAME="${REMOTE_NAME:-fork}"
DEPLOY_HOST="${DEPLOY_HOST:-plane2}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/dev/src/plane-v131-ru}"
DEPLOY_COMPOSE_PATH="${DEPLOY_COMPOSE_PATH:-/home/dev/plane-selfhost/plane-app}"
LOCAL_BRANCH="${LOCAL_BRANCH:-$(git branch --show-current 2>/dev/null || true)}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-develop}"

if [ -z "${LOCAL_BRANCH}" ]; then
  echo "ERROR: run this from inside a git repository."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: run this from inside a git repository."
  exit 1
fi

local_head="$(git rev-parse HEAD)"
local_status="$(git status --short --branch)"

deploy_head="$(ssh "$DEPLOY_HOST" "cd '$DEPLOY_PATH' && git rev-parse HEAD")"
deploy_status="$(ssh "$DEPLOY_HOST" "cd '$DEPLOY_PATH' && git status --short --branch")"
deploy_images="$(ssh "$DEPLOY_HOST" "cd '$DEPLOY_COMPOSE_PATH' && for service in web web-ru; do container=\$(docker compose ps -q \"\$service\" 2>/dev/null || true); if [ -n \"\$container\" ]; then docker inspect --format \"\$service|{{.Config.Image}}|{{ index .Config.Labels \\\"org.opencontainers.image.revision\\\" }}\" \"\$container\"; else echo \"\$service|<missing>|<missing>\"; fi; done" 2>/dev/null || true)"

remote_develop="$(git ls-remote "$REMOTE_NAME" "refs/heads/develop" | awk '{print $1}')"
remote_branch="$(git ls-remote "$REMOTE_NAME" "refs/heads/${DEPLOY_BRANCH}" | awk '{print $1}')"

echo "Local  branch: ${LOCAL_BRANCH}"
echo "Local  HEAD:   ${local_head}"
echo "Deploy branch: ${DEPLOY_BRANCH}"
echo "Deploy HEAD:   ${deploy_head}"
echo "GitHub develop: ${remote_develop:-<missing>}"
echo "GitHub branch:  ${remote_branch:-<missing>}"
echo "Deploy images:"
echo "${deploy_images:-<unavailable>}"
echo
echo "Local status:"
echo "${local_status}"
echo
echo "Deploy status:"
echo "${deploy_status}"
echo

issues=0

if [ -n "${local_status}" ] && printf '%s\n' "${local_status}" | tail -n +2 | grep -q .; then
  echo "WARN: local worktree is dirty."
  issues=$((issues + 1))
fi

if [ -n "${deploy_status}" ] && printf '%s\n' "${deploy_status}" | tail -n +2 | grep -q .; then
  echo "WARN: deploy worktree is dirty."
  issues=$((issues + 1))
fi

if [ "${local_head}" != "${deploy_head}" ]; then
  echo "WARN: local and deploy HEAD differ."
  issues=$((issues + 1))
fi

if [ -n "${remote_branch}" ] && [ "${local_head}" != "${remote_branch}" ]; then
  echo "WARN: local HEAD differs from GitHub branch refs/heads/${DEPLOY_BRANCH}."
  issues=$((issues + 1))
fi

if [ -n "${remote_develop}" ] && [ "${remote_develop}" != "${remote_branch}" ]; then
  echo "INFO: develop and ${DEPLOY_BRANCH} are not aligned on GitHub."
fi

if [ -z "${deploy_images}" ]; then
  echo "WARN: unable to inspect deployed frontend image revisions."
  issues=$((issues + 1))
else
  while IFS= read -r image_line; do
    [ -z "${image_line}" ] && continue
    service="$(printf '%s\n' "${image_line}" | cut -d '|' -f 1)"
    image="$(printf '%s\n' "${image_line}" | cut -d '|' -f 2)"
    revision="$(printf '%s\n' "${image_line}" | cut -d '|' -f 3-)"

    if [ "${image}" = "<missing>" ]; then
      echo "WARN: deploy service ${service} is missing."
      issues=$((issues + 1))
    elif [ -z "${revision}" ] || [ "${revision}" = "<no value>" ] || [ "${revision}" = "<nil>" ]; then
      echo "WARN: deploy service ${service} image ${image} does not expose org.opencontainers.image.revision."
      issues=$((issues + 1))
    elif [ "${revision}" != "${local_head}" ]; then
      echo "WARN: deploy service ${service} image ${image} revision ${revision} differs from local HEAD."
      issues=$((issues + 1))
    fi
  done <<EOF
${deploy_images}
EOF
fi

if [ "${issues}" -eq 0 ]; then
  echo "OK: local, deploy, and GitHub branch refs are aligned."
else
  exit 1
fi
