# Changelog

All notable changes to this fork are documented here.

The version scheme follows `v{upstream_version}-ru.{patch_number}`.

## [Unreleased]

### Added

- Repository-wide web format baseline for the production CI gate.
- Manual CI dispatch now runs full web format/build/lint/type checks and API lint on the selected release SHA.
- Premiere Pro UXP implementation brief for Plane work-item review and semantic timecode markers.
- Comment timecodes now render as semantic markers and are exposed to integrations without an FPS dependency.
- Project auto-archive keeps legacy month presets, adds weekly presets, and supports custom periods from 7 to 365 days.
- Day-based auto-archive settings retain a rounded legacy month value, so an application rollback does not silently disable archival.
- Plane2 frontend deploy helper that rolls `web` and `web-ru` one at a time.
- Plane2 build helper for source-stamped RU Space images.
- Release image builders reject tracked and untracked worktree content, preventing a clean revision label from describing dirty source.
- Changed-file i18n key existence check for web and constants usage.
- Changed-file hardcoded UI string audit for frontend i18n regressions.
- Documented RU-only locale ownership and the intentional `web`/`web-ru`
  zero-downtime frontend topology.

### Fixed

- Space priority rendering now handles missing priority metadata safely.
- API source now satisfies the enforced Ruff import and line-length checks.
- Workspace analytics insight fields now cover the workload tab, restoring the TypeScript contract.
- Request log messages now redact sensitive query-string values as well as structured external API logs.
- Relative activity timestamps now show exact time today and exact date with time for older events.
- Workspace notification cards now show an exact local time for today's events and a date with time for older events.
- Shared date-only formatting no longer adds a midnight time, while exact timestamps and relative time use the active document locale.
- Proxy now load-balances UI traffic across `web` and `web-ru` to avoid asset 502s during frontend restarts.
- Missing RU labels for project/profile settings categories and pipeline aliases.
- Missing JSON locale keys used by the web UI now load from a committed compat namespace instead of falling back to raw key names.
- i18n providers now wait for primary locale namespaces before rendering, preventing raw translation keys during startup.
- New static translation calls are checked against the loaded EN namespaces in CI, and missing runtime keys are reported once per locale instead of silently appearing as raw keys.
- Member-table sorting menus now show one direction per action, including role sorting from guest to administrator and back.
- i18n package builds now load JSON namespaces instead of removed legacy locale modules.
- RU locale audits now distinguish intentional brand, placeholder, and protocol values from real untranslated UI strings.
- i18n sync CI now requires the Russian locale to match English while leaving non-RU upstream locales as report-only checks.
- i18n sync data no longer contains compat duplicates or leaf/branch key conflicts that could overwrite translations at runtime.
- Build helpers now refuse tracked dirty worktrees and stamp Docker images with the source git revision for deploy provenance checks.
- CodeQL alerts for locale audit parsing, toast key normalization, and API token log identifiers.
- Web nginx now returns 404 for missing hashed assets instead of serving the SPA shell, preventing stale frontend chunks from breaking client-side navigation after deploys.
- Remaining low-risk search fields now expose stable form names/accessibility labels, and cycle transfer/member search UI strings use locale keys instead of hardcoded text.
- Common backend API error responses now map to localized frontend messages instead of showing raw English strings.
- Authentication error fallbacks now remain localized and no longer expose Russian legacy text in the English UI.
- SMTP configuration errors now map to localized frontend messages while keeping the backend API contract unchanged.
- Project archive breadcrumbs, archive notices, and navigation tooltips now use locale keys.
- Member sorting, avatar counts, and project automation month ranges now use locale keys.
- Published Space work item labels, peek controls, and comment feedback now use locale keys.
- Published Space work item properties and sign-in prompts now use locale keys.
- Editor asset errors, link validation, and state/module/page creation fallbacks now use locale keys.
- Analytics CSV exports sent by email now use Russian column labels.
- API error fallback handling now avoids cyclic payload traversal after network-level failures.
- Analytics CSV module segments now resolve module names from the correct dataset.
- Pipeline stages now use a metadata-only contract: no hidden child work items, bounded stage deadlines, and consistent completion metadata after a state rollback.
- Parent issue deadlines can no longer precede metadata-only pipeline stage deadlines.
- Pipeline deadline API validation messages now localize in the web client.
- API error localization now preserves original response payloads and prefers stable error codes when available.
- Analytics CSV exports now resolve axis and segment labels through lookup maps instead of repeated linear searches.
- OAuth authentication logs no longer include access-token headers or email addresses.
- External API activity logs redact credential and session headers, and GitHub OAuth membership failures no longer log user or organization identifiers.
- Workspace role labels now follow the active locale, and profile timestamp display accepts only exact or relative values.
- Workspace notification cards now localize activity text and show snooze timestamps in a single locale-aware format.
- Workspace selector rows again provide native keyboard activation while retaining separate Settings and Invite links.
- Profile timestamp display validation now accepts only exact and relative values in the API schema.
- Changed-file UI audits now include staged and unstaged frontend changes and flag likely Cyrillic hardcodes.
- Space release builds now reject tracked and untracked dirty source just like backend and web release builds.
- Notification cards and profile preferences now satisfy the frontend type contract for localized timestamps and archive settings.
- Custom project auto-archive periods through 365 days now preserve a valid legacy month fallback for rollback compatibility.
- i18n hardcode CI now verifies missing translation keys and Cyrillic UI literals with fixtures.
- External API activity logs now redact sensitive query, body, response, and custom-header values.
- Existing invalid profile timestamp display values are normalized to exact during migration.
- English profile language selection now applies English UI and document locale instead of being forced to Russian.
- Space image healthchecks now use the bundled Node runtime, avoiding Alpine mirror DNS failures during builds.

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
