# Agent Development Guide

## Fork Rules

- Treat this repository as the deployable source of truth for the Plane RU fork.
- Read [`docs/fork-workflow.md`](./docs/fork-workflow.md), [`CHANGELOG.md`](./CHANGELOG.md), and any applicable nested `AGENTS.md` before making changes.
- Use [`UPSTREAM_VERSION`](./UPSTREAM_VERSION) for the upstream base and [`RELEASE_VERSION`](./RELEASE_VERSION) for the fork release tag.
- Do not modify a live deployment, run migrations, or change production configuration without explicit user approval.
- Prefer repo changes over host-only fixes so GitHub and deployments remain reproducible.
- Never add secrets, runtime `.env` files, database data, generated bundles, or temporary backup files to Git.
- Start with a read-only audit. Code, GitHub state, databases, containers, DNS, Caddy, runtime environment, and deployments may be changed only when the user explicitly requests the corresponding action.
- Use the SSH aliases `plane2` and `plane`; never use direct server IP addresses. Do not print secrets or the contents of runtime environment files in commands, logs, or reports.
- Never push to `upstream` (`makeplane/plane`). The writable GitHub repository is `AlexLite/plane-l10n-ru-sync`, normally exposed locally as `fork`.

## Git Workflow

### Permanent branches

- `develop` is the default integration branch.
- `main` represents production-ready, released code.
- Never commit or push directly to `develop` or `main`.
- Do not rename or delete permanent branches unless the user explicitly requests it.

### Task branches and pull requests

- Start every task branch from an up-to-date `fork/develop`.
- Use lowercase kebab-case names: `feat/<task>`, `fix/<task>`, `chore/<task>`, `docs/<task>`, `refactor/<task>`, `test/<task>`, `release/<version>`, or `hotfix/<task>`.
- Normal task branches target `develop` through a pull request.
- Release branches start from `develop`; production releases merge from `release/<version>` into `main`.
- Hotfixes start from and target `main`, then must be merged or cherry-picked back into `develop`.
- Do not merge a pull request until its required checks pass. Delete merged task branches when they are no longer needed.
- Never force-push shared branches.
- Before editing tracked source, create a local `backup/*` branch at the exact starting SHA. Do not push routine backup branches; use an annotated tag for an immutable shared rollback or release snapshot.

### Required checks

Before modifying a repository:

1. Run `git status --short` and `git branch --show-current`.
2. Run `git fetch fork --prune` and confirm the task branch is based on current `fork/develop`.
3. Check for unrelated local changes. Never overwrite, discard, reset, or delete user changes without explicit approval.
4. Do not use `git add -A` on a mixed worktree.
5. Treat `apps/api/plane/app/views/external/base.py` as protected until the Unsplash incident is assigned as a separate task. Never stage, commit, or deploy an unrelated local modification to that file.

Before committing:

1. Review `git diff` and stage only task files.
2. Run the relevant format, lint, type, test, migration, localization, and security checks.
3. Update `CHANGELOG.md` only for user-visible changes.

After pushing:

1. Verify the remote branch SHA and open a pull request to the intended base branch.
2. Report the commit SHA and CI status.
3. Do not deploy unless deployment was explicitly requested.

## Production operations

- Acceptance (`plane2`): source `/home/dev/src/plane-v131-ru`, runtime `/home/dev/plane-selfhost/plane-app`, compose project `plane-app`, source remote `fork`.
- Production (`plane`): source `/opt/plane/release/current`, runtime `/opt/plane`, compose project `plane-app`, source remote `origin` (the fork on this host).
- Before every deploy, verify the `develop` SHA on GitHub and both target source trees, source cleanliness, target files, build result, image revision, container health, local HTTP, and external HTTPS.
- Fetch and fast-forward from the fork's `develop`; never replace the required `fetch` plus `ff-only` update with manual source copying.
- Build the frontend with `build-web-ipv4.sh` from clean committed source and the target host's production environment without displaying environment values.
- Update `web` first and wait for it to become healthy; only then update `web-ru` and wait for it to become healthy. Never use `--remove-orphans`.
- On `plane`, always use `docker compose -p plane-app -f /opt/plane/compose.yaml -f /opt/plane/compose.override.yaml ...`; running an implicit compose command from `/opt/plane` creates the wrong project.
- Validate compose with `config --quiet` before restarting services. Preserve compact YAML syntax when changing an image value.
- Do not remove or alter `plane-messenger-gateway`, its configuration or storage, MinIO storage, rollback files, old notifier state, or unattached volumes without a separately approved cleanup plan. `plane_logs_migrator` on production requires explicit confirmation before removal.
- Do not clean old compose/Caddy backups on acceptance unless the user explicitly reverses the existing no-cleanup instruction.

## Commands

- `pnpm dev` - Start all dev servers (web:3000, admin:3001)
- `pnpm build` - Build all packages and apps
- `pnpm check` - Run all checks (format, lint, types)
- `pnpm check:lint` - OxLint across all packages
- `pnpm check:types` - TypeScript type checking
- `pnpm fix` - Auto-fix format and lint issues
- `pnpm turbo run <command> --filter=<package>` - Target specific package/app
- `pnpm --filter=@plane/ui storybook` - Start Storybook on port 6006

## Code Style

- **Imports**: Use `workspace:*` for internal packages, `catalog:` for external deps.
- **TypeScript**: Strict mode enabled; all files must be typed.
- **Formatting**: Oxfmt; run `pnpm fix:format`.
- **Linting**: OxLint with shared `.oxlintrc.json` config.
- **Naming**: camelCase for variables/functions and PascalCase for components/types.
- **Error handling**: Use try-catch with proper error types.
- **State management**: MobX stores in `packages/shared-state` and reactive patterns.
