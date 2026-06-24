# Changelog

All notable changes to this fork are documented here.

The version scheme follows `v{upstream_version}-ru.{patch_number}`.

## [Unreleased]

### Fixed
- Calendar issue creation hotfix was deployed as `plane-frontend-ru:v1.3.1-calendar-day-fix1-runtime` while frontend rebuilds were temporarily blocked by `registry.npmjs.org` DNS resolution.

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
