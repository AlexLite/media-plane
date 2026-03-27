# CLAUDE.md — AI Agent Instructions for Plane RU Localization Fork

> Read this file before doing anything else. It defines the rules of this project.

## What this repo is

A fork of [makeplane/plane](https://github.com/makeplane/plane) with Russian localization.
We maintain a thin layer on top of upstream — only translation files and one backend patch.

**Single source of truth for context:** `LOCALIZATION.md`

---

## Rules — follow these exactly, every session

### 1. Before any translation work

```bash
node scripts/audit-keys.mjs
```

Work from the audit output. Never guess which keys are missing.

### 2. Files you are allowed to edit

```
packages/i18n/src/locales/ru/translations.ts   ← main translations (~2700 keys)
packages/i18n/src/locales/ru/core.ts           ← sidebar, auth, navigation
packages/i18n/src/locales/ru/accessibility.ts  ← ARIA labels
packages/i18n/src/locales/ru/empty-state.ts    ← empty states
packages/i18n/src/locales/ru/editor.ts         ← editor (currently empty)
apps/api/plane/settings/storage.py             ← MinIO presigned URL patch
```

### 3. Files you must NOT touch

- Any upstream component files (`apps/web/**`, `apps/admin/**`) unless migrating hardcoded strings
- EN locale files — only add EN keys if they are truly missing from upstream
- `packages/i18n/src/locales/en/**` — check upstream first

### 4. After translation work

```bash
node scripts/audit-keys.mjs
```

Goal: `Missing in RU: 0 ✓`

### 5. Committing

lint-staged uses `oxlint --deny-warnings` which catches pre-existing upstream warnings.
Use `git commit --no-verify` for translation-only commits to bypass this.
Do NOT use `--no-verify` for logic changes.

### 6. VS Code / parallel editors conflict

If `git add` fails with `index.lock exists`, run:
```bash
git status > /dev/null && git add ...
```
This beats the VS Code background git poll. Or disable `"git.autorefresh": false` in VS Code.

---

## Migration task (ongoing)

Many component files still have hardcoded Russian strings instead of `t()` calls.
The goal is to move them to proper i18n keys:

1. Find hardcoded strings: `grep -r '"[А-Яа-яЁё]' apps/web/`
2. Add the key to the appropriate RU (and EN) locale file
3. Replace the hardcoded string with `t("namespace.key")`
4. Run audit to verify no regressions

**Namespace mapping:**
- UI labels, actions, dialogs → `translations.ts`
- Sidebar, auth, navigation → `core.ts`
- ARIA labels → `accessibility.ts`
- Empty states → `empty-state.ts`

---

## Upstream sync workflow

```bash
./scripts/sync-upstream.sh
```

This fetches upstream, rebases, and preserves our translation files.
See `LOCALIZATION.md` for full details.

---

## Server

- `dev@10.0.100.201` (SSH key: `~/.ssh/dev_proxmox`)
- Frontend image: `plane-frontend-ru:i18n-invitations-20260325`
- Backend image: `plane-backend-ru:v1.2.3-storage-fix`
- Source: `/home/dev/src/plane` (detached HEAD at v1.2.3)
- App: `/home/dev/plane-selfhost/plane-app/`

Rebuild frontend after translation changes:
```bash
ssh dev@10.0.100.201 "cd /home/dev/plane-selfhost && \
  docker build -f Dockerfile.web-ru -t plane-frontend-ru:$(date +%Y%m%d) . && \
  cd plane-app && docker compose up -d web"
```
