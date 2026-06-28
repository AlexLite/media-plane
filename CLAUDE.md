# AI Agent Instructions For Plane RU Localization Fork

Read `AGENTS.md`, `docs/fork-workflow.md`, `CHANGELOG.md`, and
`LOCALIZATION.md` before changing this fork.

## Source Of Truth

This repository is the deployable source of truth for the Plane RU fork.
Russian localization lives in JSON namespace files:

```text
packages/i18n/src/locales/ru/*.json
```

The frontend runtime loads `../locales/${language}/${namespace}.json`; legacy
monolithic `.ts` locale files are not part of the runtime localization path.

The backend fork patch currently lives in:

```text
apps/api/plane/settings/storage.py
```

## Required Checks

Before translation work:

```bash
node scripts/audit-keys.mjs
```

After translation work:

```bash
node scripts/audit-keys.mjs
pnpm --filter=@plane/i18n audit:ru
```

For CI-style locale shape checks:

```bash
pnpm dlx tsx packages/i18n/scripts/sync-check.ts --ci
```

That sync check compares every locale to English; non-RU upstream locales may
still miss fork-specific keys even when RU is complete.

## Editing Rules

- Keep translation changes in `packages/i18n/src/locales/ru/*.json`.
- Add EN keys only when the source code needs a new key and upstream does not
  already provide it.
- Do not restore checked-in frontend bundles, runtime hotfix directories, or
  `*.bak-*` files.
- Keep changes split by concern: translations, source patches, build scripts,
  and docs should be separate commits when practical.
- Confirm local, GitHub fork, and plane2 SHAs before deploy-affecting changes.

## Deploy Context

- plane2 source: `/home/dev/src/plane-v131-ru`
- plane2 compose: `/home/dev/plane-selfhost/plane-app`
- fork branches: `preview`, `v1.3.1-ru-nocycle`

Build images from source with:

```bash
./build-web-ipv4.sh
./build-backend-ru.sh
```

Override `FRONTEND_IMAGE_TAG` or `BACKEND_IMAGE_TAG` for explicit release tags.
Default tags include `RELEASE_VERSION` and the current short git SHA.
