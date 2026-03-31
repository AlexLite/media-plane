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
- Frontend image: `plane-frontend-ru:v1.2.3-ru` (single tag, always current)
- Backend image: `plane-backend-ru:v1.2.3-storage-fix`
- Source: `/home/dev/src/plane` (`preview` branch of our fork)
- App: `/home/dev/plane-selfhost/plane-app/`
- Caddy routes ALL traffic to `web-ru` service (not `web`)

Rebuild frontend after translation changes:
```bash
# 1. Apply commits to server (if GitHub push fails, use patch):
git format-patch <last-deployed-sha>..HEAD --stdout > /tmp/patch.patch
scp -i ~/.ssh/dev_proxmox /tmp/patch.patch dev@10.0.100.201:/tmp/
ssh -i ~/.ssh/dev_proxmox dev@10.0.100.201 "cd /home/dev/src/plane && git am /tmp/patch.patch"

# 2. Build (always use the fixed tag v1.2.3-ru — no dated tags):
ssh -i ~/.ssh/dev_proxmox dev@10.0.100.201 "cd /home/dev && bash build-web-ru.sh"

# 3. Deploy to web-ru (the container Caddy actually routes to):
ssh -i ~/.ssh/dev_proxmox dev@10.0.100.201 "cd /home/dev/plane-selfhost/plane-app && docker compose up -d --force-recreate web-ru web"
```

### Image / build hygiene rules

**Always keep only one current image tag (`v1.2.3-ru`). Never accumulate dated tags.**

- Build script (`build-web-ru.sh`) always produces `plane-frontend-ru:v1.2.3-ru` — no dated suffixes.
- After a successful deploy, remove any old/dangling images: `docker image prune -f`
- `docker-compose.override.yml` must always reference `plane-frontend-ru:v1.2.3-ru` — never a dated tag.
- The source of truth is `/home/dev/src/plane` on the server (our fork's `preview` branch). No other source copies should exist under `/home/dev/plane-selfhost/`.
- If the same image ID appears under multiple tags, remove the extra tags immediately.
- Rationale: stale images cause accidental rollbacks and make it impossible to tell which version is actually running.
