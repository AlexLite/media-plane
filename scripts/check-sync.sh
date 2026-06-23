#!/usr/bin/env bash

set -euo pipefail

REMOTE_NAME="${REMOTE_NAME:-fork}"
DEPLOY_HOST="${DEPLOY_HOST:-plane2}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/dev/src/plane-v131-ru}"
LOCAL_BRANCH="${LOCAL_BRANCH:-$(git branch --show-current 2>/dev/null || true)}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$LOCAL_BRANCH}"

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

remote_preview="$(git ls-remote "$REMOTE_NAME" "refs/heads/preview" | awk '{print $1}')"
remote_branch="$(git ls-remote "$REMOTE_NAME" "refs/heads/${DEPLOY_BRANCH}" | awk '{print $1}')"

echo "Local  branch: ${LOCAL_BRANCH}"
echo "Local  HEAD:   ${local_head}"
echo "Deploy branch: ${DEPLOY_BRANCH}"
echo "Deploy HEAD:   ${deploy_head}"
echo "GitHub preview: ${remote_preview:-<missing>}"
echo "GitHub branch:  ${remote_branch:-<missing>}"
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

if [ -n "${remote_preview}" ] && [ "${remote_preview}" != "${remote_branch}" ]; then
  echo "INFO: preview and ${DEPLOY_BRANCH} are not aligned on GitHub."
fi

if [ "${issues}" -eq 0 ]; then
  echo "OK: local, deploy, and GitHub branch refs are aligned."
else
  exit 1
fi
