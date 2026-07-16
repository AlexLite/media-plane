# FreeFrame review integration deployment

This guide deploys the cumulative Plane and FreeFrame integration branches to a staging environment. Do not reuse application authentication secrets for the integration trust boundary.

## Required branches

- Plane: `integration/freeframe-review`
- FreeFrame: `integration/plane-review`

## Domains used in the examples

- Plane: `https://plane.example.com`
- FreeFrame: `https://freeframe.example.com`

Replace both values with the real staging domains.

The staging deployment validated on 2026-07-16 uses:

- Plane: `https://plane2.450media.netcraze.link`
- FreeFrame: `https://freeframe.450media.netcraze.link`
- browser-facing object storage: `https://freeframe-storage.450media.netcraze.link`

Do not apply this guide to the production Plane host or reuse these staging values in production.

## 1. Generate the dedicated integration secret

Generate one strong value and configure the same value on both services:

```bash
openssl rand -hex 64
```

The value must be different from Plane `SECRET_KEY` and FreeFrame `JWT_SECRET`.

## 2. Configure FreeFrame

In FreeFrame `.env.prod`:

```env
MEDIA_PLANE_MODE=true
PLANE_BASE_URL=https://plane.example.com
PLANE_JWT_SECRET=<dedicated-integration-secret>
PLANE_JWT_ALGORITHM=HS256
PLANE_TOKEN_ISSUER=media-plane
PLANE_TOKEN_AUDIENCE=freeframe-review
PLANE_TOKEN_LEEWAY_SECONDS=30
PLANE_EMBED_ALLOWED_ORIGINS=https://plane.example.com
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://storage.example.com
```

`PLANE_EMBED_ALLOWED_ORIGINS` is a comma-separated list of exact browser origins. Wildcards are not accepted.

The FreeFrame web container reads the origin allowlist at runtime. The API, worker and web containers should all receive `.env.prod` through the production compose file.

When using MinIO or another S3-compatible service, `S3_PUBLIC_ENDPOINT` must be reachable from the user's browser because multipart presigned URLs are uploaded directly by the iframe.

If a TLS/DNS relay rewrites the request `Host`, place a staging reverse proxy in front of MinIO that restores the same host used when the URL was signed. The proxy must return CORS only for the exact FreeFrame browser origin and expose `ETag`, because multipart completion needs the ETag returned by each browser `PUT`. Do not use a wildcard origin. This was required for the validated KeenDNS staging topology.

Deploy FreeFrame using the normal production compose command:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

The FreeFrame API startup command applies Alembic migrations before starting Gunicorn.

## 3. Configure the Plane API

In Plane `apps/api/.env`:

```env
FREEFRAME_REVIEW_API_URL=https://freeframe.example.com/api
FREEFRAME_REVIEW_API_TIMEOUT_SECONDS=5
FREEFRAME_REVIEW_JWT_SECRET=<dedicated-integration-secret>
FREEFRAME_REVIEW_TOKEN_TTL_SECONDS=300
FREEFRAME_REVIEW_TOKEN_ISSUER=media-plane
FREEFRAME_REVIEW_TOKEN_AUDIENCE=freeframe-review
```

Use an address reachable from the Plane API container. If Plane and FreeFrame run in separate Compose projects, a name such as `http://freeframe-api:8000` will not resolve unless an explicit shared Docker network and alias are configured. The public HTTPS `/api` address is the simplest staging configuration.

If outbound DNS is unavailable inside the Plane API container, use an explicit staging-only host/network alias. The validated staging deployment routes `http://freeframe-internal/api` to the FreeFrame host through an `extra_hosts` entry. Keep this server-side URL separate from the browser-facing FreeFrame URL.

## 4. Configure and rebuild the Plane web image

In Plane root `.env`:

```env
VITE_FREEFRAME_REVIEW_EMBED_URL=https://freeframe.example.com/integrations/plane/review
```

This value is compiled into the Vite application. Changing it requires rebuilding the Plane `web` image; restarting an existing image is not sufficient.

```bash
docker compose build web
docker compose up -d --no-deps web
```

Use `--no-deps` when staging notification services are intentionally disabled. In the validated Plane staging environment, `worker`, `beat-worker`, and the messenger gateway remain stopped so smoke tests cannot send email or VK notifications.

Use the normal Plane upgrade/migrator procedure and confirm that Django migration `0139_freeframe_review_link` was applied before testing the integration.

## 5. Staging smoke test

1. Open a Plane work item as a workspace or project administrator.
2. Create a new FreeFrame asset from the picker.
3. Confirm the review iframe appears without tokens in its URL.
4. Upload the first media version.
5. Confirm processing changes to ready automatically.
6. Open playback and create a timecoded comment.
7. Open the same asset in normal FreeFrame and confirm the public comment is visible.
8. Upload a subsequent version.
9. Disconnect the asset and connect it again.
10. Verify Guest access is limited to read/comment, Member adds upload, and project/workspace Admin adds asset link management.

## 6. User-visible behavior and permissions

The integration does not add a global FreeFrame button. It renders an inline section in the Plane work-item body, above Activity:

- an unlinked work item shows the asset search/create picker only to a project or workspace Admin;
- after linking, all project members with review access see the embedded FreeFrame panel;
- Guest receives `review:read` and `review:comment`;
- Member additionally receives `review:upload` and sees the new-version action;
- project/workspace Admin additionally receives `review:manage` and sees link, unlink, asset picker, and create controls.

Plane requests a short-lived issue-bound integration token from its API. Plane sends the token and asset ID to the exact configured FreeFrame iframe origin with `postMessage`; neither value is placed in the iframe URL or browser storage. FreeFrame exchanges that token for a short-lived scoped session and revalidates the Plane workspace, project, work item, user, asset link, and requested operation on every integration API call.

The iframe uses both `allow-scripts` and `allow-same-origin`. This is intentional only because the configured iframe is a validated cross-origin FreeFrame URL: preserving the FreeFrame origin is required for exact two-way `postMessage` origin checks. Never configure the embed URL to a Plane same-origin path.

## 7. Failure checks

Before production, verify the integration fails closed when:

- the dedicated secrets do not match;
- the Plane origin is absent from `PLANE_EMBED_ALLOWED_ORIGINS`;
- `FREEFRAME_REVIEW_API_URL` is unreachable;
- the FreeFrame worker or object storage is unavailable;
- a user lacks the required Plane role;
- an asset is already linked to another work item.

Keep both integration pull requests in draft until this smoke test has been completed on staging.

## 8. Validated staging result

The 2026-07-16 staging run completed asset creation and selection, link/unlink/relink, iframe exchange, first and subsequent version uploads, `processing` to `ready`, HLS decoding, a public `0:00` comment visible in normal FreeFrame, and Guest/Member/Admin permission checks.

Fail-closed checks returned the expected failures for a wrong integration secret, a forbidden Plane origin, an unreachable FreeFrame API, a stopped worker, unavailable object storage, insufficient permissions, and an asset already linked to another Plane work item. Production was not deployed and the integration branches were not merged.
