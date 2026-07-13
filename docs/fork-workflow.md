# Fork Workflow

This repository is the deployable source of truth for the Plane RU fork. Russian localization is the required locale; keep non-RU locale completeness report-only unless its maintainers explicitly adopt it.

## Branches and pull requests

- `develop` is the integration and default branch.
- `main` contains production-ready released code.
- Create each task branch from current `fork/develop` and open its pull request back to `develop`.
- Use `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `release/`, and `hotfix/` prefixes with lowercase kebab-case names.
- Release branches are stabilized from `develop` and merged into `main` only after validation.
- Hotfix branches start from `main`, target `main`, and are then merged or cherry-picked into `develop`.
- Do not push directly to `develop` or `main`, force-push shared branches, or create routine backup branches.

## Development loop

1. Fetch the fork and create a clean task worktree from `fork/develop`.
2. Make one focused change set; do not mix translation, runtime, deployment, and maintenance changes without a reason.
3. Run the relevant checks and inspect the diff.
4. Commit only task files, push the task branch, and open a pull request to `develop`.
5. Merge only after required checks pass.
6. Deploy only an exact validated commit SHA or annotated release tag, and only with explicit approval.

## Release and deployment

- Use `v{upstream_version}-ru.{patch_number}` for fork release tags.
- Track the upstream base in [`UPSTREAM_VERSION`](../UPSTREAM_VERSION) and the current fork release tag in [`RELEASE_VERSION`](../RELEASE_VERSION).
- Record user-visible changes in [`CHANGELOG.md`](../CHANGELOG.md).
- Build release images from clean committed source with `build-backend-ru.sh` or `build-web-ipv4.sh` where applicable.
- Keep `web` and `web-ru` as a zero-downtime pair unless an approved topology change says otherwise.
- Verify local, GitHub, target-source, image revision, health checks, and worktree cleanliness before a deploy.

## Upstream synchronization

`scripts/sync-upstream.sh` may use an upstream branch named `preview`; that is an upstream reference, not a fork integration branch. Preserve this distinction when updating synchronization tooling.
