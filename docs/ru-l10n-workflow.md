# RU Localization Workflow

This workflow keeps Russian localization easy to maintain across upstream updates.

## Scope Rules

1. Keep translation changes in `packages/i18n/src/locales/ru/*.json` whenever possible.
2. If UI has hardcoded English, add i18n keys first, then translate in RU locale.
3. Avoid runtime overrides for production (`ru-override.js` should not be the primary source of truth).

## Daily Commands

Run from repo root:

```bash
node packages/i18n/scripts/audit-ru-locale.mjs
node packages/i18n/scripts/audit-ru-locale.mjs --override E:/Dev/projects/Plane/ru-override.utf8.js
node scripts/audit-keys.mjs
pnpm dlx tsx packages/i18n/scripts/sync-check.ts --ci --locale ru
```

## Update Cycle (new upstream release)

1. Rebase local branch on upstream:
```bash
git fetch upstream
git rebase upstream/main
```
2. Run RU audit and fix newly introduced EN leftovers.
3. Keep commits small:
   - `feat(i18n): add missing keys in UI`
   - `feat(i18n-ru): translate added keys`

## Upstream PR Strategy

1. PR-1 (safe): RU wording improvements in existing keys only.
2. PR-2 (incremental): replace hardcoded EN with `t(...)` on one feature area.
3. Repeat PR-2 in small slices to maximize merge success.

## Definition Of Done

1. RU locale files have no obvious EN leftovers from audit output.
2. New UI text is key-based (no hardcoded EN in changed files).
3. Build passes and auth/navigation paths are verified in browser.
