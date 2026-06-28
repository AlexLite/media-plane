# Changelog

All notable changes to this fork are documented here.

The version scheme follows `v{upstream_version}-ru.{patch_number}`.

## [Unreleased]

### Fixed
- Web nginx now returns 404 for missing hashed assets instead of serving the SPA shell, preventing stale frontend chunks from breaking client-side navigation after deploys.

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
