# Agent Development Guide

## Fork Rules

- Treat this repository as the deployable source of truth for the Plane RU fork.
- Read [`docs/fork-workflow.md`](./docs/fork-workflow.md) before making changes.
- Keep `preview` as the active integration branch unless the user says otherwise.
- Use [`UPSTREAM_VERSION`](./UPSTREAM_VERSION) for the upstream base and
  [`RELEASE_VERSION`](./RELEASE_VERSION) for the fork release tag.
- Update [`CHANGELOG.md`](./CHANGELOG.md) and keep release/deploy notes aligned
  with the code that is pushed to GitHub.
- Do not modify the live `.97` deployment unless the user explicitly asks for a
  deploy action.
- Prefer repo changes over host-only fixes so GitHub and the deploy remain in
  sync.
- Before any write action, run [`scripts/check-sync.sh`](./scripts/check-sync.sh)
  or equivalent manual checks and confirm that local, deploy, and GitHub SHAs
  are aligned for the branch you intend to touch.
- If the SHAs differ, reconcile first. Never assume `.97` already matches GitHub.
- Never use `git add -A` on a mixed tree unless the user has confirmed that every
  change in the worktree belongs in scope.
- Keep deploy-affecting changes split by concern when possible:
  translations, backend patches, pipeline/build changes, and docs should be
  separate commits unless the user explicitly asks for a bundled sync.
- After committing, verify the new commit on local, deploy, and GitHub before
  declaring the state synced.

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

- **Imports**: Use `workspace:*` for internal packages, `catalog:` for external deps
- **TypeScript**: Strict mode enabled, all files must be typed
- **Formatting**: oxfmt, run `pnpm fix:format`
- **Linting**: OxLint with shared `.oxlintrc.json` config
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Use try-catch with proper error types, log errors appropriately
- **State Management**: MobX stores in `packages/shared-state`, reactive patterns
- **Testing**: All features require unit tests, use existing test framework per package
- **Components**: Build in `@plane/ui` with Storybook for isolated development
