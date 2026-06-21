#!/usr/bin/env bash
# =============================================================================
# sync-upstream.sh — Sync Plane RU fork with upstream makeplane/plane
# =============================================================================
#
# This script rebases our branch onto upstream/preview while preserving
# our owned files (RU translations + storage.py patch).
#
# Usage:
#   ./scripts/sync-upstream.sh              # sync to upstream/preview
#   ./scripts/sync-upstream.sh master       # sync to upstream/master
#
# After running, check audit output for new EN keys that need RU translation.
# =============================================================================

set -euo pipefail

UPSTREAM_BRANCH="${1:-preview}"
RU_LOCALES="packages/i18n/src/locales/ru"
STORAGE_PY="apps/api/plane/settings/storage.py"
BACKUP_DIR="/tmp/plane-ru-sync-$(date +%s)"

# Verify we're in the right repo
if [ ! -f "packages/i18n/src/locales/en/translations.ts" ]; then
  echo "ERROR: Run this script from the repo root."
  exit 1
fi

# Verify upstream remote exists
if ! git remote get-url upstream &>/dev/null; then
  echo "ERROR: 'upstream' remote not found."
  echo "Add it: git remote add upstream https://github.com/makeplane/plane.git"
  exit 1
fi

echo ""
echo "==========================================================="
echo " Plane RU Upstream Sync"
echo " Target: upstream/$UPSTREAM_BRANCH"
echo "==========================================================="
echo ""

# 1. Backup our canonical files
echo "--> Backing up our translation files..."
mkdir -p "$BACKUP_DIR/ru" "$BACKUP_DIR/api"
cp -r "$RU_LOCALES/"* "$BACKUP_DIR/ru/"
cp "$STORAGE_PY" "$BACKUP_DIR/api/storage.py"
echo "    Backup saved to: $BACKUP_DIR"

# 2. Fetch upstream
echo ""
echo "--> Fetching upstream..."
git fetch upstream

UPSTREAM_COMMIT=$(git rev-parse "upstream/$UPSTREAM_BRANCH")
echo "    upstream/$UPSTREAM_BRANCH @ ${UPSTREAM_COMMIT:0:12}"

# 3. Check if already up to date
MERGE_BASE=$(git merge-base HEAD "upstream/$UPSTREAM_BRANCH")
if [ "$MERGE_BASE" = "$UPSTREAM_COMMIT" ]; then
  echo ""
  echo "Already up to date with upstream/$UPSTREAM_BRANCH."
else
  # 4. Rebase
  echo ""
  echo "--> Rebasing onto upstream/$UPSTREAM_BRANCH..."
  echo "    (conflicts in our files will be auto-resolved)"

  if git rebase "upstream/$UPSTREAM_BRANCH"; then
    echo "    Rebase completed cleanly."
  else
    echo ""
    echo "    Conflicts detected. Restoring our files and continuing..."
    cp -r "$BACKUP_DIR/ru/"* "$RU_LOCALES/"
    cp "$BACKUP_DIR/api/storage.py" "$STORAGE_PY"
    git add "$RU_LOCALES/" "$STORAGE_PY"

    if ! git rebase --continue 2>/dev/null; then
      echo ""
      echo "ERROR: Rebase still has conflicts in files other than our translations."
      echo "This means upstream changed something we also modified."
      echo ""
      echo "Manual steps:"
      echo "  1. git status          — see which files conflict"
      echo "  2. resolve conflicts"
      echo "  3. git add <files>"
      echo "  4. git rebase --continue"
      echo "  5. node scripts/audit-keys.mjs"
      exit 1
    fi
  fi

  # 5. Restore our translations on top (in case rebase overwrote them)
  echo ""
  echo "--> Restoring canonical RU translations..."
  cp -r "$BACKUP_DIR/ru/"* "$RU_LOCALES/"
  cp "$BACKUP_DIR/api/storage.py" "$STORAGE_PY"

  if ! git diff --quiet "$RU_LOCALES/" "$STORAGE_PY"; then
    git add "$RU_LOCALES/" "$STORAGE_PY"
    git commit -m "chore: restore ru translations after upstream sync to ${UPSTREAM_COMMIT:0:8}"
  fi
fi

# 6. Update UPSTREAM_VERSION
echo ""
echo "--> Updating UPSTREAM_VERSION..."
UPSTREAM_DATE=$(git log -1 --format="%ci" "upstream/$UPSTREAM_BRANCH")
cat > UPSTREAM_VERSION <<EOF
commit: ${UPSTREAM_COMMIT}
branch: ${UPSTREAM_BRANCH}
date:   ${UPSTREAM_DATE}
synced: $(date -u +"%Y-%m-%d %H:%M UTC")
EOF
git add UPSTREAM_VERSION
git commit -m "chore: sync upstream to ${UPSTREAM_COMMIT:0:8} (${UPSTREAM_DATE:0:10})" 2>/dev/null || true

# 7. Audit
echo ""
echo "--> Running translation audit..."
echo ""
node scripts/audit-keys.mjs || true

echo ""
echo "==========================================================="
echo " Sync complete!"
echo ""
echo " Next steps if audit shows missing keys:"
echo "   1. Edit packages/i18n/src/locales/ru/translations.ts"
echo "      (or core.ts / accessibility.ts / empty-state.ts)"
echo "   2. git add packages/i18n/src/locales/ru/"
echo "   3. git commit -m 'l10n(ru): translate new keys from upstream'"
echo "   4. Rebuild frontend image (see LOCALIZATION.md)"
echo "==========================================================="
echo ""
