# Changelog

All notable changes to this fork are documented here.

The version scheme follows `v{upstream_version}-ru.{patch_number}`.

## [Unreleased]

### Added

- Plane2 frontend deploy helper that rolls `web` and `web-ru` one at a time.
- Changed-file i18n key existence check for web and constants usage.
- Changed-file hardcoded UI string audit for frontend i18n regressions.

### Fixed

- Proxy now load-balances UI traffic across `web` and `web-ru` to avoid asset 502s during frontend restarts.
- Missing RU labels for project/profile settings categories and pipeline aliases.
- Missing JSON locale keys used by the web UI now load from a committed compat namespace instead of falling back to raw key names.
- i18n providers now wait for primary locale namespaces before rendering, preventing raw translation keys during startup.
- i18n package builds now load JSON namespaces instead of removed legacy locale modules.
- RU locale audits now distinguish intentional brand, placeholder, and protocol values from real untranslated UI strings.
- i18n sync CI now requires the Russian locale to match English while leaving non-RU upstream locales as report-only checks.
- Build helpers now refuse tracked dirty worktrees and stamp Docker images with the source git revision for deploy provenance checks.
- CodeQL alerts for locale audit parsing, toast key normalization, and API token log identifiers.
- Web nginx now returns 404 for missing hashed assets instead of serving the SPA shell, preventing stale frontend chunks from breaking client-side navigation after deploys.
- Remaining low-risk search fields now expose stable form names/accessibility labels, and cycle transfer/member search UI strings use locale keys instead of hardcoded text.
- Common backend API error responses now map to localized frontend messages instead of showing raw English strings.
- Analytics CSV exports sent by email now use Russian column labels.

### Removed

- Legacy TypeScript locale files that were no longer loaded by the JSON namespace i18n runtime.

## [v1.3.1-ru.2] - 2026-06-29

### Added

- Pipeline workload analytics, project pipeline aliases, default project due time, and workspace group notification rules from the plane2 runtime source.
- Clean backend image build helper for building the RU backend directly from source.

### Fixed

- Calendar issue creation hotfix was deployed as `plane-frontend-ru:v1.3.1-calendar-day-fix1-runtime` while frontend rebuilds were temporarily blocked by `registry.npmjs.org` DNS resolution.
- Pipeline Gantt/calendar/list views now carry overdue and pipeline segment data from source instead of relying on runtime-only image changes.
- Editor image/table controls and related web UI strings now use i18n keys instead of hardcoded English text.

### Removed

- Obsolete root-level hotfix Dockerfiles that documented intermediate runtime image layers before the source sync.

## [v1.3.1-ru.1] - 2026-06-21

### Added

- Russian UI and email localization
- Russian default states and target-time patches
- Pipeline work item support for the self-host fork
- Fork-specific deployment helpers and build scripts

### Changed

- Self-host compose and build docs now describe the fork-specific workflow
- Frontend build tag generation now defaults to the current git version
- Compose files no longer pass `DOCKER_BUILDKIT` as a build argument

### Notes

- Base upstream: `makeplane/plane v1.3.1`
- This release matches the `plane2` deployment snapshot used for the fork sync
