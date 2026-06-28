# Fork Workflow

This fork is maintained as a deploy-oriented mirror of Plane with Russian
localization and a small set of fork-specific patches.

## Branching

- `preview` is the active integration branch.
- Keep working changes small and commit them directly to `preview` when they are
  ready to mirror to GitHub and deploy.

## Versioning

- Use `v{upstream_version}-ru.{patch_number}` for fork releases.
- Track the upstream base version in [`UPSTREAM_VERSION`](../UPSTREAM_VERSION).
- Track the current fork release tag in [`RELEASE_VERSION`](../RELEASE_VERSION).
- Record user-visible changes in [`CHANGELOG.md`](../CHANGELOG.md).

## Development Loop

1. Sync from upstream with `scripts/sync-upstream.sh`.
2. Make the fork-specific change locally.
3. Run `scripts/check-sync.sh` before editing if you need to confirm local,
   deploy, and GitHub state.
4. Verify the local stack and tests.
5. Update `CHANGELOG.md` and bump the fork version if the change is
   release-worthy.
6. Commit to `preview`.
7. Push `preview` to GitHub.
8. Build and deploy the matching images to the self-host stack.

## Build and Deploy

- Use `build-backend-ru.sh` for the backend image when an explicit release tag
  is needed.
- Use `build-web-ipv4.sh` for the frontend image when an explicit release tag
  is needed.
- Set `RELEASE_VERSION` or update [`RELEASE_VERSION`](../RELEASE_VERSION) before
  building release images.
- Use the compose files in the repo as the source of truth for local, test, and
  self-host environments.
- Keep deployment tags aligned with the GitHub commit that produced them.
- Do not add one-off root-level hotfix Dockerfiles for runtime-only layers.
  Bring hotfixes back into source and build clean images from the canonical app
  Dockerfiles instead.

## Principles

- GitHub should reflect the deployable source of truth.
- The deploy should come from a tagged or committed release snapshot.
- Host-only changes should be avoided unless they are part of a deliberate
  deployment adjustment.
- Use `scripts/check-sync.sh` whenever you need a quick answer to "do local,
  deploy, and GitHub actually match right now?"
