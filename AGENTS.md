# Agent Development Guide

## Fork Rules

- Treat this repository as the deployable source of truth for the Plane RU fork.
- Read [`docs/fork-workflow.md`](./docs/fork-workflow.md), [`CHANGELOG.md`](./CHANGELOG.md), and any applicable nested `AGENTS.md` before making changes.
- Use [`UPSTREAM_VERSION`](./UPSTREAM_VERSION) for the upstream base and [`RELEASE_VERSION`](./RELEASE_VERSION) for the fork release tag.
- Do not modify a live deployment, run migrations, or change production configuration without explicit user approval.
- Prefer repo changes over host-only fixes so GitHub and deployments remain reproducible.
- Never add secrets, runtime `.env` files, database data, generated bundles, or temporary backup files to Git.

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
- Never force-push shared branches. Do not create routine `backup/*` branches; use an annotated tag for an immutable rollback or release snapshot.

### Required checks

Before modifying a repository:

1. Run `git status --short` and `git branch --show-current`.
2. Run `git fetch fork --prune` and confirm the task branch is based on current `fork/develop`.
3. Check for unrelated local changes. Never overwrite, discard, reset, or delete user changes without explicit approval.
4. Do not use `git add -A` on a mixed worktree.

Before committing:

1. Review `git diff` and stage only task files.
2. Run the relevant format, lint, type, test, migration, localization, and security checks.
3. Update `CHANGELOG.md` only for user-visible changes.

After pushing:

1. Verify the remote branch SHA and open a pull request to the intended base branch.
2. Report the commit SHA and CI status.
3. Do not deploy unless deployment was explicitly requested.

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
