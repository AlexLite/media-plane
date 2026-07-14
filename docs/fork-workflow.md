# Fork Workflow

This repository is the deployable source of truth for the Plane RU fork. Russian localization is the required locale; keep non-RU locale completeness report-only unless its maintainers explicitly adopt it.

## Branches and pull requests

- `develop` is the integration and default branch.
- `main` contains production-ready released code.
- Create each task branch from current `fork/develop` and open its pull request back to `develop`.
- Use `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `release/`, and `hotfix/` prefixes with lowercase kebab-case names.
- Release branches are stabilized from `develop` and merged into `main` only after validation.
- Hotfix branches start from `main`, target `main`, and are then merged or cherry-picked into `develop`.
- Do not push directly to `develop` or `main` or force-push shared branches.
- Create a local backup branch at the starting SHA before tracked source edits. Keep routine backup branches local; shared immutable rollback points are annotated tags.
- Never push to the `upstream` remote. Only the fork is writable for this workflow.

## Development loop

1. Fetch the fork and create a clean task worktree from `fork/develop`.
2. Make one focused change set; do not mix translation, runtime, deployment, and maintenance changes without a reason.
3. Run the relevant checks and inspect the diff.
4. Commit only task files, push the task branch, and open a pull request to `develop`.
5. Merge only after required checks pass.
6. Deploy only an exact validated commit SHA or annotated release tag, and only with explicit approval.

## Environment matrix

| Role | SSH alias | Source | Runtime / compose | Source remote | Public URL |
| --- | --- | --- | --- | --- | --- |
| Acceptance | `plane2` | `/home/dev/src/plane-v131-ru` | `/home/dev/plane-selfhost/plane-app` | `fork` | `https://plane2.450media.netcraze.link` |
| Production | `plane` | `/opt/plane/release/current` | `/opt/plane` | `origin` (fork) | `https://plane.450media.netcraze.link` |

Use SSH aliases, not direct IP addresses. Never display `.env` content, database values, passwords, tokens, or other secrets. On developer machines the fork remote is `fork`; the production host intentionally calls the same fork `origin`.

## Release and deployment

- Use `v{upstream_version}-ru.{patch_number}` for fork release tags.
- Track the upstream base in [`UPSTREAM_VERSION`](../UPSTREAM_VERSION) and the current fork release tag in [`RELEASE_VERSION`](../RELEASE_VERSION).
- Record user-visible changes in [`CHANGELOG.md`](../CHANGELOG.md).
- Build release images from clean committed source with `build-backend-ru.sh` or `build-web-ipv4.sh` where applicable.
- Keep `web` and `web-ru` as a zero-downtime pair unless an approved topology change says otherwise.
- Frontend images use `plane-frontend-ru:<RELEASE_VERSION>-<short-12-SHA>`.

### Required pre-deploy gate

1. Compare `refs/heads/develop` on the fork with the source SHA on acceptance and production.
2. Require clean target source worktrees and inspect the exact files affected by the release.
3. Fetch from the host-specific fork remote and update with fast-forward only. If GitHub is temporarily unreachable, retry read-only `git ls-remote`; do not copy source manually around the gate.
4. Build from clean committed source with `build-web-ipv4.sh`, loading the host's production environment without printing it: `/home/dev/plane-selfhost/plane-app/plane.env` on acceptance or `/opt/plane/.env` on production.
5. Verify the built image tag and `org.opencontainers.image.revision` against the intended SHA.
6. Validate compose configuration, roll services one at a time, and verify container health, local HTTP, and external HTTPS.

### Frontend rollout

- Acceptance uses compose project `plane-app` in `/home/dev/plane-selfhost/plane-app`.
- Production must use the explicit command prefix `docker compose -p plane-app -f /opt/plane/compose.yaml -f /opt/plane/compose.override.yaml`. Never run implicit compose from `/opt/plane`, because that creates an unrelated `plane` project.
- In compact production override lines such as `web: { image: ..., restart: ... }`, replace only the image value up to the first comma. A broad non-whitespace regular expression can corrupt the `restart` field.
- Run `docker compose ... config --quiet` before restarting anything.
- Update `web`, wait until healthy, then update `web-ru` and wait until healthy. Do not use `--remove-orphans`.
- When sending complex Bash through PowerShell/SSH, preserve UTF-8 and LF quoting; a base64 pipe is preferred when necessary and must never contain secrets.

### Protected runtime state

- Migrations always require a new explicit request.
- `plane-messenger-gateway` is intentionally reported as a compose orphan. Do not remove it or its configuration/storage without a separate approved task.
- Do not remove MinIO storage, old notifier state, rollback files, or unattached volumes as generic cleanup.
- The production volume `plane_logs_migrator` may be removed only after explicit confirmation that names it.
- Acceptance compose/Caddy backups are under an explicit no-cleanup instruction.
- The known Unsplash `/api/unsplash/?query=` failure and any local change to `apps/api/plane/app/views/external/base.py` are out of scope until assigned separately.

## Localization verification

Validate Russian localization from source and automation: English/Russian JSON key parity, static i18n key audits, hardcoded-string audits, and build/CI. A single browser log is not sufficient evidence.

## Upstream synchronization

`scripts/sync-upstream.sh` may use an upstream branch named `preview`; that is an upstream reference, not a fork integration branch. Preserve this distinction when updating synchronization tooling.
