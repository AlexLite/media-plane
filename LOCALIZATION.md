# Plane RU Localization State

This document records the current localization workflow for the Plane RU fork.
Keep it aligned with `docs/fork-workflow.md`, `CHANGELOG.md`, and the deployed
plane2 source tree.

## Current State

| Parameter | Value |
| --- | --- |
| Upstream base | See `UPSTREAM_VERSION` |
| Fork release | See `RELEASE_VERSION` |
| Integration branches | `preview`, `v1.3.1-ru-nocycle` |
| Deploy source | `plane2:/home/dev/src/plane-v131-ru` |
| Compose directory | `plane2:/home/dev/plane-selfhost/plane-app` |

## Owned Localization Files

The runtime loads JSON namespace files from `packages/i18n/src/locales/<lang>/`.
The namespace list is defined in `packages/i18n/src/constants/namespaces.ts`, and
`packages/i18n/src/core/instance.ts` imports `../locales/${language}/${namespace}.json`.

For Russian localization, edit the matching files in:

```text
packages/i18n/src/locales/ru/*.json
```

Do not add new keys only to legacy `.ts` locale files. They are not loaded by the
current frontend runtime.

The fork also owns the self-host storage behavior in:

```text
apps/api/plane/settings/storage.py
```

## Checks

Run the JSON namespace audit when reviewing RU coverage:

```bash
node scripts/audit-keys.mjs
node scripts/audit-keys.mjs --missing
node scripts/audit-keys.mjs --untranslated
node scripts/audit-keys.mjs --extra
```

The CI-oriented i18n check is:

```bash
pnpm dlx tsx packages/i18n/scripts/sync-check.ts --ci
```

Note: that CI check compares every locale to English. In this fork, RU may be in
sync while non-RU upstream locales still miss fork-specific keys.

## Build And Deploy

Build images from source, not from checked-in compiled frontend assets:

```bash
./build-web-ipv4.sh
./build-backend-ru.sh
```

Use explicit release tags through `FRONTEND_IMAGE_TAG` and `BACKEND_IMAGE_TAG`
when producing deployable images. Prefer tags derived from `RELEASE_VERSION`
plus a short git SHA.

After changing runtime-affecting code, deploy only the affected compose services
on plane2 and verify:

```bash
cd /home/dev/plane-selfhost/plane-app
docker compose ps
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/api/instances/
```

## Sync Workflow

1. Confirm local, GitHub fork, and plane2 SHAs match before edits.
2. Run `scripts/check-sync.sh` or equivalent manual checks.
3. Make the smallest source changes needed.
4. Run `node scripts/audit-keys.mjs` for RU translation changes.
5. Commit by concern and push both `preview` and `v1.3.1-ru-nocycle` only after verification.
6. Mirror the verified commit to plane2 before declaring the fork synchronized.
