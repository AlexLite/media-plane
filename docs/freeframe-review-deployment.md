# FreeFrame review integration deployment

This guide deploys the cumulative Plane and FreeFrame integration branches to a staging environment. Do not reuse application authentication secrets for the integration trust boundary.

## Required branches

- Plane: `integration/freeframe-review`
- FreeFrame: `integration/plane-review`

## Domains used in the examples

- Plane: `https://plane.example.com`
- FreeFrame: `https://freeframe.example.com`

Replace both values with the real staging domains.

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
```

`PLANE_EMBED_ALLOWED_ORIGINS` is a comma-separated list of exact browser origins. Wildcards are not accepted.

The FreeFrame web container reads the origin allowlist at runtime. The API, worker and web containers should all receive `.env.prod` through the production compose file.

When using MinIO or another S3-compatible service, `S3_PUBLIC_ENDPOINT` must be reachable from the user's browser because multipart presigned URLs are uploaded directly by the iframe.

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

## 4. Configure and rebuild the Plane web image

In Plane root `.env`:

```env
VITE_FREEFRAME_REVIEW_EMBED_URL=https://freeframe.example.com/integrations/plane/review
```

This value is compiled into the Vite application. Changing it requires rebuilding the Plane `web` image; restarting an existing image is not sufficient.

```bash
docker compose build web
docker compose up -d
```

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
10. Repeat read-only access as a Guest and upload access as a Member.

## 6. Failure checks

Before production, verify the integration fails closed when:

- the dedicated secrets do not match;
- the Plane origin is absent from `PLANE_EMBED_ALLOWED_ORIGINS`;
- `FREEFRAME_REVIEW_API_URL` is unreachable;
- the FreeFrame worker or object storage is unavailable;
- a user lacks the required Plane role;
- an asset is already linked to another work item.

Keep both integration pull requests in draft until this smoke test has been completed on staging.
